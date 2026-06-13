import React, { useState, useEffect } from 'react';
import { Article } from '@/entities/Article';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import HelpChatbot from '../components/help/HelpChatbot';

export default function HelpCenter() {
  const [articles, setArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      const allArticles = await Article.list();
      setArticles(allArticles);
      setLoading(false);
    };
    fetchArticles();
  }, []);

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const articlesByCategory = filteredArticles.reduce((acc, article) => {
    (acc[article.category] = acc[article.category] || []).push(article);
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <LifeBuoy className="mx-auto h-16 w-16 text-purple-600 mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Help Center</h1>
          <p className="text-lg text-gray-600">How can we help you?</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search for articles..."
                className="pl-10 h-12"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {loading ? (
              <p>Loading articles...</p>
            ) : (
              <div className="space-y-8">
                {Object.entries(articlesByCategory).map(([category, articles]) => (
                  <section key={category}>
                    <h2 className="text-2xl font-bold mb-4">{category}</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {articles.map(article => (
                        <Link key={article.id} to={createPageUrl(`ArticleDetail?slug=${article.slug}`)}>
                          <Card className="hover:border-purple-400 hover:shadow-lg transition-all">
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-purple-700">{article.title}</h3>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1">
            <HelpChatbot articles={articles} />
          </div>
        </div>
      </div>
    </div>
  );
}