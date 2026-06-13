import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Play, Trophy, Shuffle, CheckCircle, Clock, Sparkles, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function GameHostDashboard() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [myHostRecord, setMyHostRecord] = useState(null);
  const [availableGames, setAvailableGames] = useState([]);
  const [completedGames, setCompletedGames] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const [winnerName, setWinnerName] = useState("");
  const [winnerEmail, setWinnerEmail] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("eventId") || urlParams.get("eventid");

  useEffect(() => {
    if (eventId) {
      loadData();
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    } else {
      setError("No event ID provided");
      setLoading(false);
    }
  }, [eventId]);

  const loadData = async () => {
    try {
      setError(null);
      const user = await base44.auth.me();
      setCurrentUser(user);

      const eventData = await base44.entities.Event.list();
      const foundEvent = eventData.find(e => e.id === eventId);
      
      if (!foundEvent) {
        setError("Event not found");
        setLoading(false);
        return;
      }
      setEvent(foundEvent);

      // Load my host record - check if I'm a designated game host
      try {
        const hostsData = await base44.entities.GameHost.filter({ event_id: eventId });
        const myHost = hostsData.find(h => h.host_email === user.email);
        setMyHostRecord(myHost);

        if (!myHost) {
          setError("You are not assigned as a game host for this event");
          setLoading(false);
          return;
        }

        // Check if it's my turn
        if (!myHost.is_current_turn) {
          const currentHost = hostsData.find(h => h.is_current_turn);
          if (currentHost) {
            setError(`It's not your turn yet. Currently: ${currentHost.host_name}'s turn`);
          }
        }
      } catch (e) {
        setError("Could not load host assignment");
        setLoading(false);
        return;
      }

      // Load games
      try {
        const allGames = await base44.entities.EventGame.filter({ event_id: eventId }, "game_order");
        const available = allGames.filter(g => g.status === "available");
        const completed = allGames.filter(g => g.status === "completed");
        const inProgress = allGames.find(g => g.status === "in_progress" && g.current_host_email === user.email);
        
        setAvailableGames(available);
        setCompletedGames(completed);
        setCurrentGame(inProgress);
      } catch (e) {
        setAvailableGames([]);
        setCompletedGames([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setError(`Failed to load data: ${error.message}`);
      setLoading(false);
    }
  };

  const handleSelectRandomGame = async () => {
    if (!myHostRecord.is_current_turn) {
      alert("It's not your turn yet!");
      return;
    }

    if (availableGames.length === 0) {
      alert("No available games in the pool");
      return;
    }

    const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
    
    try {
      await base44.entities.EventGame.update(randomGame.id, {
        status: "in_progress",
        current_host_email: currentUser.email,
        current_host_name: currentUser.full_name,
        started_at: new Date().toISOString()
      });
      await loadData();
    } catch (error) {
      alert(`Failed to select game: ${error.message}`);
    }
  };

  const handleSelectManualGame = async (gameId) => {
    if (!myHostRecord.is_current_turn) {
      alert("It's not your turn yet!");
      return;
    }

    try {
      await base44.entities.EventGame.update(gameId, {
        status: "in_progress",
        current_host_email: currentUser.email,
        current_host_name: currentUser.full_name,
        started_at: new Date().toISOString()
      });
      await loadData();
    } catch (error) {
      alert(`Failed to select game: ${error.message}`);
    }
  };

  const handleCompleteGame = () => {
    if (!currentGame) return;
    setWinnerName("");
    setWinnerEmail("");
    setShowWinnerDialog(true);
  };

  const handleSaveWinner = async () => {
    if (!winnerName.trim()) {
      alert("Please enter the winner's name");
      return;
    }

    try {
      // Mark game as completed
      await base44.entities.EventGame.update(currentGame.id, {
        status: "completed",
        winner_name: winnerName.trim(),
        winner_email: winnerEmail.trim(),
        completed_at: new Date().toISOString()
      });

      // Update host's games completed count
      const newCount = (myHostRecord.games_completed || 0) + 1;
      await base44.entities.GameHost.update(myHostRecord.id, {
        games_completed: newCount
      });

      // If host completed all their games, pass turn to next host
      if (newCount >= myHostRecord.total_games_assigned) {
        const allHosts = await base44.entities.GameHost.filter({ event_id: eventId }, "host_order");
        const nextHost = allHosts.find(h => h.host_order > myHostRecord.host_order && h.games_completed < h.total_games_assigned);
        
        if (nextHost) {
          await base44.entities.GameHost.update(myHostRecord.id, { is_current_turn: false });
          await base44.entities.GameHost.update(nextHost.id, { is_current_turn: true });
        }
      }
      
      setShowWinnerDialog(false);
      setCurrentGame(null);
      await loadData();
    } catch (error) {
      alert(`Failed to save winner: ${error.message}`);
    }
  };

  const handleCancelGame = async () => {
    if (!window.confirm("Cancel this game and return it to the pool?")) return;

    try {
      await base44.entities.EventGame.update(currentGame.id, {
        status: "available",
        current_host_email: null,
        current_host_name: null,
        started_at: null
      });
      setCurrentGame(null);
      await loadData();
    } catch (error) {
      alert(`Failed to cancel game: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <p className="text-gray-600">Loading host dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Event
          </Button>
          <Card className="border-yellow-200">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
              <h2 className="text-2xl font-bold mb-4">{error}</h2>
              <div className="flex gap-3 justify-center">
                <Button onClick={loadData} variant="outline">Try Again</Button>
                <Button onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))}>Back to Event</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isMyTurn = myHostRecord?.is_current_turn;
  const gamesRemaining = myHostRecord ? myHostRecord.total_games_assigned - (myHostRecord.games_completed || 0) : 0;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Event
        </Button>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Game Host Dashboard
          </h1>
          <p className="text-xl text-gray-600">{event?.name}</p>
          <p className="text-lg text-gray-500 mt-2">Host: {currentUser?.full_name}</p>
          {isMyTurn ? (
            <Badge className="mt-3 bg-green-600 text-lg px-4 py-2">🎯 YOUR TURN!</Badge>
          ) : (
            <Badge className="mt-3 bg-gray-500 text-lg px-4 py-2">⏳ Waiting for your turn</Badge>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-3xl font-bold">{gamesRemaining}</p>
              <p className="text-gray-600">Games Remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-3xl font-bold">{currentGame ? 1 : 0}</p>
              <p className="text-gray-600">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-3xl font-bold">{myHostRecord?.games_completed || 0}</p>
              <p className="text-gray-600">Completed</p>
            </CardContent>
          </Card>
        </div>

        {currentGame ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-8">
            <Card className="border-4 border-purple-500 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Sparkles className="w-8 h-8" />CURRENT GAME IN PROGRESS
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-4xl font-bold mb-4 text-purple-900">{currentGame.name}</h2>
                    {currentGame.description && <p className="text-xl text-gray-700 mb-4">{currentGame.description}</p>}
                    <div className="inline-flex items-center gap-2 bg-yellow-100 px-6 py-3 rounded-full">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                      <span className="text-2xl font-bold text-yellow-900">Prize: {currentGame.prize_description}</span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-8">
                    <Button size="lg" onClick={handleCompleteGame} className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg px-8 py-6">
                      <Trophy className="w-5 h-5" />Declare Winner
                    </Button>
                    <Button size="lg" variant="outline" onClick={handleCancelGame} className="text-lg px-8 py-6">
                      Cancel Game
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : isMyTurn ? (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Select Your Next Game</CardTitle>
              </CardHeader>
              <CardContent>
                {availableGames.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                    <h3 className="text-2xl font-bold mb-2">All Games Completed! 🎉</h3>
                    <p className="text-gray-600">You've finished all your assigned games.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myHostRecord?.random_selection_enabled && (
                      <Button size="lg" onClick={handleSelectRandomGame} className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg py-6">
                        <Shuffle className="w-5 h-5" />AI Randomly Select Game
                      </Button>
                    )}
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3 text-lg">Or choose manually:</h3>
                      <div className="space-y-3">
                        {availableGames.map(game => (
                          <div key={game.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                            <div>
                              <h4 className="font-semibold text-lg">{game.name}</h4>
                              {game.description && <p className="text-sm text-gray-600">{game.description}</p>}
                              <div className="flex items-center gap-2 mt-2">
                                <Trophy className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium">{game.prize_description}</span>
                              </div>
                            </div>
                            <Button onClick={() => handleSelectManualGame(game.id)} className="gap-2">
                              <Play className="w-4 h-4" />Start Game
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-2xl font-bold mb-2">Waiting for Your Turn</h3>
              <p className="text-gray-600">Another host is currently calling games. Your turn is coming up!</p>
            </CardContent>
          </Card>
        )}

        {(myHostRecord?.games_completed || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-600" />Your Completed Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedGames.filter(g => g.current_host_email === currentUser?.email).map(game => (
                  <div key={game.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-lg">{game.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm">{game.prize_description}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-600 mb-1">✓ Completed</Badge>
                      <p className="text-sm font-medium">🏆 Winner: {game.winner_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showWinnerDialog} onOpenChange={setShowWinnerDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl">🏆 Declare Winner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="font-semibold text-lg mb-2">{currentGame?.name}</p>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium">Prize: {currentGame?.prize_description}</span>
                </div>
              </div>
              <div>
                <Label>Winner's Name *</Label>
                <Input value={winnerName} onChange={(e) => setWinnerName(e.target.value)} placeholder="Enter winner's full name" className="text-lg" />
              </div>
              <div>
                <Label>Winner's Email (optional)</Label>
                <Input type="email" value={winnerEmail} onChange={(e) => setWinnerEmail(e.target.value)} placeholder="winner@example.com" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWinnerDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveWinner} className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600">
                <CheckCircle className="w-4 h-4" />Save Winner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}