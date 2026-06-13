import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Sparkles, Crown, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function GameLeaderboard({ eventId }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadGames();
      const interval = setInterval(loadGames, 30000); // Refresh every 30s to avoid rate limits
      return () => clearInterval(interval);
    }
  }, [eventId]);

  const loadGames = async () => {
    try {
      const gamesData = await base44.entities.EventGame.filter({ event_id: eventId }, "game_order");
      setGames(gamesData);
    } catch (error) {
      console.error("Error loading games:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (games.length === 0) {
    return null;
  }

  const currentGame = games.find(g => g.status === "in_progress");
  const completedGames = games.filter(g => g.status === "completed");
  const upcomingGames = games.filter(g => g.status === "available");

  return (
    <div className="space-y-6">
      {currentGame && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-purple-200 bg-white shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Now Playing
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-600">LIVE</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-2">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {currentGame?.name || "Game in Progress"}
                  </h3>
                  
                  {currentGame?.description && (
                    <p className="text-gray-600 max-w-xl mx-auto">{currentGame.description}</p>
                  )}
                  
                  {currentGame?.prize_description && (
                    <div className="inline-flex items-center gap-2 bg-white px-5 py-2.5 rounded-full shadow-md border-2 border-yellow-300">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                      <span className="font-bold text-gray-900">{currentGame.prize_description}</span>
                    </div>
                  )}
                  
                  {currentGame?.assigned_host_name && (
                    <div className="pt-4 border-t border-purple-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Host:</span> {currentGame.assigned_host_name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {completedGames.length > 0 && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-600" />
              Winners Hall of Fame
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {completedGames.map((game, index) => (
                <motion.div
                  key={game?.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-white border-2 border-green-200 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
                      {index === 0 && <Crown className="w-6 h-6 text-yellow-600" />}
                      {index === 1 && <Medal className="w-6 h-6 text-gray-400" />}
                      {index === 2 && <Medal className="w-6 h-6 text-orange-600" />}
                      {index > 2 && <Trophy className="w-6 h-6 text-yellow-600" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{game?.name || "Unknown Game"}</h4>
                      {game?.prize_description && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Trophy className="w-4 h-4" />
                          <span>{game.prize_description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-600 mb-1">Winner</Badge>
                    <p className="text-lg font-bold text-green-700">🏆 {game?.winner_name || "Unknown"}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {upcomingGames.length > 0 && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Upcoming Games
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {upcomingGames.slice(0, 5).map((game, index) => (
                <motion.div
                  key={game?.id || index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-white border rounded-lg"
                >
                  <div>
                    <h4 className="font-semibold">{game?.name || "Unknown Game"}</h4>
                    {game?.prize_description && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span>{game.prize_description}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </motion.div>
              ))}
              {upcomingGames.length > 5 && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  + {upcomingGames.length - 5} more games
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}