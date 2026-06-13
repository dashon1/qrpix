import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveGameStatus({ eventId }) {
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const loadCurrentGame = async () => {
      try {
        const games = await base44.entities.EventGame.filter({ event_id: eventId, status: "in_progress" });
        setCurrentGame(games.length > 0 ? games[0] : null);
      } catch (error) {
        console.error("Error loading current game:", error);
        setCurrentGame(null);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentGame();
    const interval = setInterval(loadCurrentGame, 30000); // Refresh every 30 seconds to avoid rate limits

    return () => clearInterval(interval);
  }, [eventId]);

  if (loading || !currentGame) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <Card className="border-2 border-purple-200 bg-white shadow-lg">
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  🎮 Current Game Board
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-600">LIVE</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">This is what guests see on the game board right now.</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-2">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                
                <div>
                  <h4 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {currentGame?.name || "Loading..."}
                  </h4>
                  {currentGame?.description && (
                    <p className="text-gray-600 text-sm max-w-2xl mx-auto mb-4">
                      {currentGame.description}
                    </p>
                  )}
                </div>

                {currentGame?.prize_description && (
                  <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md border-2 border-yellow-300">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    <span className="font-bold text-gray-900">
                      {currentGame.prize_description}
                    </span>
                  </div>
                )}

                {currentGame?.current_host_name && (
                  <div className="pt-4 border-t border-purple-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Called by:</span> {currentGame.current_host_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}