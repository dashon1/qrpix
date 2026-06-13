import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Edit, Trash2, Trophy, Users, Gamepad2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function GameManagement() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [games, setGames] = useState([]);
  const [gameHosts, setGameHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGameDialog, setShowGameDialog] = useState(false);
  const [showHostDialog, setShowHostDialog] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [editingHost, setEditingHost] = useState(null);
  const [gameFormData, setGameFormData] = useState({
    name: "",
    description: "",
    prize_description: "",
    game_order: 0
  });
  const [hostFormData, setHostFormData] = useState({
    host_email: "",
    host_name: "",
    total_games_assigned: 1,
    random_selection_enabled: false,
    host_order: 1
  });

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("eventId") || urlParams.get("eventid");

  useEffect(() => {
    if (eventId) {
      loadData();
    } else {
      setError("No event ID provided");
      setLoading(false);
    }
  }, [eventId]);

  const loadData = async () => {
    try {
      setError(null);
      const user = await base44.auth.me();
      const eventData = await base44.entities.Event.list();
      const foundEvent = eventData.find(e => e.id === eventId);
      
      if (!foundEvent) {
        setError("Event not found");
        setLoading(false);
        return;
      }

      const isHost = foundEvent.host_email === user.email || foundEvent.co_hosts?.includes(user.email);
      if (!isHost) {
        setError("Access denied: You must be a host of this event");
        setLoading(false);
        return;
      }

      setEvent(foundEvent);

      // Load games and hosts
      try {
        const gamesData = await base44.entities.EventGame.filter({ event_id: eventId }, "game_order");
        setGames(gamesData);
      } catch (e) {
        setGames([]);
      }

      try {
        const hostsData = await base44.entities.GameHost.filter({ event_id: eventId }, "host_order");
        setGameHosts(hostsData);
      } catch (e) {
        setGameHosts([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setError(`Failed to load data: ${error.message}`);
      setLoading(false);
    }
  };

  const handleOpenGameDialog = (game = null) => {
    if (game) {
      setEditingGame(game);
      setGameFormData({
        name: game.name,
        description: game.description || "",
        prize_description: game.prize_description,
        game_order: game.game_order || 0
      });
    } else {
      setEditingGame(null);
      setGameFormData({
        name: "",
        description: "",
        prize_description: "",
        game_order: games.length
      });
    }
    setShowGameDialog(true);
  };

  const handleOpenHostDialog = (host = null) => {
    if (host) {
      setEditingHost(host);
      setHostFormData({
        host_email: host.host_email,
        host_name: host.host_name,
        total_games_assigned: host.total_games_assigned,
        random_selection_enabled: host.random_selection_enabled,
        host_order: host.host_order
      });
    } else {
      setEditingHost(null);
      setHostFormData({
        host_email: "",
        host_name: "",
        total_games_assigned: 1,
        random_selection_enabled: false,
        host_order: gameHosts.length + 1
      });
    }
    setShowHostDialog(true);
  };

  const handleSaveGame = async () => {
    if (!gameFormData.name.trim() || !gameFormData.prize_description.trim()) {
      alert("Please fill in Game Name and Prize Description");
      return;
    }

    try {
      const gameData = {
        event_id: eventId,
        name: gameFormData.name.trim(),
        description: gameFormData.description.trim(),
        prize_description: gameFormData.prize_description.trim(),
        game_order: gameFormData.game_order || 0
      };

      if (editingGame) {
        await base44.entities.EventGame.update(editingGame.id, gameData);
      } else {
        await base44.entities.EventGame.create(gameData);
      }

      setShowGameDialog(false);
      await loadData();
    } catch (error) {
      console.error("Error saving game:", error);
      alert(`Failed to save game: ${error.message}`);
    }
  };

  const handleSaveHost = async () => {
    if (!hostFormData.host_email.trim() || !hostFormData.total_games_assigned) {
      alert("Please fill in Email and Number of Games");
      return;
    }

    try {
      const hostData = {
        event_id: eventId,
        host_email: hostFormData.host_email.trim(),
        host_name: hostFormData.host_name.trim() || hostFormData.host_email.trim(),
        total_games_assigned: hostFormData.total_games_assigned,
        random_selection_enabled: hostFormData.random_selection_enabled,
        host_order: hostFormData.host_order,
        is_current_turn: gameHosts.length === 0 && !editingHost
      };

      if (editingHost) {
        await base44.entities.GameHost.update(editingHost.id, hostData);
      } else {
        await base44.entities.GameHost.create(hostData);
      }

      setShowHostDialog(false);
      await loadData();
    } catch (error) {
      console.error("Error saving host:", error);
      alert(`Failed to save host: ${error.message}`);
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (!window.confirm("Delete this game?")) return;
    try {
      await base44.entities.EventGame.delete(gameId);
      await loadData();
    } catch (error) {
      alert(`Failed to delete: ${error.message}`);
    }
  };

  const handleDeleteHost = async (hostId) => {
    if (!window.confirm("Remove this host?")) return;
    try {
      await base44.entities.GameHost.delete(hostId);
      await loadData();
    } catch (error) {
      alert(`Failed to delete: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <p className="text-gray-600">Loading game management...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={() => navigate(createPageUrl("Home"))}>Go to Home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalGamesAssigned = gameHosts.reduce((sum, h) => sum + h.total_games_assigned, 0);
  const completedGames = games.filter(g => g.status === "completed").length;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Manage Event
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-purple-600" />Event Games Management
          </h1>
          <p className="text-gray-600">{event?.name}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-3xl font-bold">{games.length}</p>
              <p className="text-gray-600">Games in Pool</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-3xl font-bold">{gameHosts.length}</p>
              <p className="text-gray-600">Active Hosts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-3xl font-bold">{completedGames}/{totalGamesAssigned}</p>
              <p className="text-gray-600">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-3xl font-bold">{games.filter(g => g.status === "available").length}</p>
              <p className="text-gray-600">Available</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Hosts Section */}
        <Card className="mb-8">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />Game Hosts ({gameHosts.length})
              </CardTitle>
              <Button onClick={() => handleOpenHostDialog()} size="sm" className="gap-2">
                <UserPlus className="w-4 h-4" />Add Host
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {gameHosts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hosts assigned yet</p>
                <Button onClick={() => handleOpenHostDialog()}>Add First Host</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {gameHosts.map(host => (
                  <div key={host.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">Host #{host.host_order}: {host.host_name}</h3>
                        {host.is_current_turn && <Badge className="bg-green-600">Current Turn</Badge>}
                        {host.random_selection_enabled && <Badge variant="outline">🎲 Random</Badge>}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Email:</span> {host.host_email}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Games to Call:</span> {host.games_completed}/{host.total_games_assigned}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleOpenHostDialog(host)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteHost(host.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Games Pool Section */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-purple-600" />Games Pool ({games.length})
              </CardTitle>
              <Button onClick={() => handleOpenGameDialog()} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
                <Plus className="w-4 h-4" />Add Game
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {games.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-bold mb-2">No Games Yet</h3>
                <p className="text-gray-600 mb-6">Add games to the pool to get started!</p>
                <Button onClick={() => handleOpenGameDialog()} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
                  <Plus className="w-4 h-4" />Add Your First Game
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {games.map(game => (
                  <div key={game.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{game.name}</h3>
                        <Badge className={
                          game.status === "available" ? "bg-gray-500" :
                          game.status === "in_progress" ? "bg-yellow-500" : "bg-green-500"
                        }>{game.status}</Badge>
                      </div>
                      {game.description && <p className="text-sm text-gray-600 mb-2">{game.description}</p>}
                      <div className="flex items-center gap-2 text-sm">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium">Prize:</span>
                        <span className="text-gray-700">{game.prize_description}</span>
                      </div>
                      {game.winner_name && (
                        <div className="mt-2 text-sm text-green-700 font-medium">🏆 Winner: {game.winner_name}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleOpenGameDialog(game)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteGame(game.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Game Dialog */}
        <Dialog open={showGameDialog} onOpenChange={setShowGameDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingGame ? "Edit Game" : "Add New Game"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Game Name *</Label>
                <Input value={gameFormData.name} onChange={(e) => setGameFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Mystery Prize #3, Full House Bingo, etc." />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea value={gameFormData.description} onChange={(e) => setGameFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Rules or context..." rows={3} />
              </div>
              <div>
                <Label>Prize Description *</Label>
                <Input value={gameFormData.prize_description} onChange={(e) => setGameFormData(prev => ({ ...prev, prize_description: e.target.value }))} placeholder="$100 cash, Dinner voucher, etc." />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input type="number" value={gameFormData.game_order} onChange={(e) => setGameFormData(prev => ({ ...prev, game_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGameDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveGame} className="bg-gradient-to-r from-purple-600 to-pink-600">
                {editingGame ? "Save Changes" : "Create Game"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Host Dialog */}
        <Dialog open={showHostDialog} onOpenChange={setShowHostDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHost ? "Edit Host" : "Add Game Host"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>New:</strong> You can now assign anyone as a game host, not just event hosts/co-hosts! They'll only have access to call games, not manage the event.
                </p>
              </div>
              <div>
                <Label>Host Email *</Label>
                <Input 
                  type="email" 
                  value={hostFormData.host_email} 
                  onChange={(e) => setHostFormData(prev => ({ ...prev, host_email: e.target.value }))} 
                  placeholder="gamehost@example.com"
                  disabled={editingHost}
                />
                <p className="text-xs text-gray-500 mt-1">Enter the email of the person who will call games</p>
              </div>
              <div>
                <Label>Host Name (optional)</Label>
                <Input 
                  value={hostFormData.host_name} 
                  onChange={(e) => setHostFormData(prev => ({ ...prev, host_name: e.target.value }))} 
                  placeholder="Full name of the host"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to use email as display name</p>
              </div>
              <div>
                <Label>Number of Games to Call *</Label>
                <Input type="number" min="1" value={hostFormData.total_games_assigned} onChange={(e) => setHostFormData(prev => ({ ...prev, total_games_assigned: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Random Game Selection</Label>
                  <p className="text-sm text-gray-600">System randomly picks games for this host</p>
                </div>
                <Switch checked={hostFormData.random_selection_enabled} onCheckedChange={(val) => setHostFormData(prev => ({ ...prev, random_selection_enabled: val }))} />
              </div>
              <div>
                <Label>Turn Order</Label>
                <Input type="number" min="1" value={hostFormData.host_order} onChange={(e) => setHostFormData(prev => ({ ...prev, host_order: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHostDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveHost} className="bg-gradient-to-r from-blue-600 to-cyan-600">
                {editingHost ? "Save Changes" : "Add Host"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}