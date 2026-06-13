
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Bot, User, X, Mic } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import { Article } from '@/entities/Article';

export default function HelpChatbot({ articles, onClose, dragControls }) {
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hello! Ask me anything about QRPix." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Listen for a single utterance
      recognition.interimResults = true; // Show results as they come in
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInput(currentTranscript);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition not supported by this browser.");
    }
  }, []); // Run only once on mount

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const currentInput = input.trim(); // Capture input before clearing
    if (!currentInput) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const userMessage = { from: 'user', text: currentInput };
    setMessages(prev => [...prev, userMessage]);
    setInput(''); // Clear input after capturing its value
    setLoading(true);

    try {
      const searchWords = currentInput.toLowerCase().split(/\s+/);
      const relevantArticles = articles.filter(article =>
        searchWords.some(word =>
          article.title.toLowerCase().includes(word) ||
          article.content.toLowerCase().includes(word)
        )
      ).slice(0, 3);

      const context = relevantArticles.map(a => `Title: ${a.title}\\nContent: ${a.content}`).join('\\n\\n---\\n\\n');

      const prompt = `You are a helpful and friendly support chatbot for an app called QRPix. Your goal is to answer the user's question based *only* on the provided knowledge base context. If the answer is not in the context, say 'I'm sorry, I don't have information on that. You can browse our help articles for more details.' Do not make up answers.

Context from Knowledge Base:
---
${context || 'No relevant articles found.'}
---

User's Question: "${currentInput}"

Answer:`;

      const response = await InvokeLLM({ prompt });
      
      const botMessage = { from: 'bot', text: response };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage = { from: 'bot', text: "Sorry, I encountered an error. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
    }

    setLoading(false);
  };

  const handleListen = () => {
    if (!recognitionRef.current) {
      console.warn("Speech Recognition not available.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInput(''); // Clear input field when starting new recognition
      recognitionRef.current.start();
    }
  };

  return (
    <Card className="flex flex-col h-full max-h-[70vh] shadow-2xl">
      <CardHeader
        onPointerDown={(e) => dragControls?.start(e)}
        className={`flex flex-row items-center justify-between ${dragControls ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <CardTitle className="flex items-center gap-2">
          <Bot /> AI Assistant
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.from === 'user' ? 'justify-end' : ''}`}>
            {msg.from === 'bot' && <div className="w-8 h-8 rounded-full bg-purple-500 flex-shrink-0 flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>}
            <div className={`max-w-[80%] p-3 rounded-lg ${msg.from === 'bot' ? 'bg-gray-100' : 'bg-purple-600 text-white'}`}>
              <p className="text-sm">{msg.text}</p>
            </div>
            {msg.from === 'user' && <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center"><User className="w-5 h-5 text-gray-700" /></div>}
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-3">
             <div className="w-8 h-8 rounded-full bg-purple-500 flex-shrink-0 flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
            <div className="p-3 rounded-lg bg-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? "Listening..." : "Ask a question..."}
            disabled={loading}
          />
          {speechSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "destructive" : "outline"}
              onClick={handleListen}
              disabled={loading}
              title="Speak to text"
            >
              <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
            </Button>
          )}
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
