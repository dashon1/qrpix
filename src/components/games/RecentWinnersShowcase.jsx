import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function RecentWinnersShowcase({ eventId }) {
  const [recentWinners, setRecentWinners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const loadRecentWinners = async () => {
      try {
        const completedGames = await base44.entities.EventGame.filter(
          { event_id: eventId, status: "completed" },
          "-updated_date"
        );
        setRecentWinners(completedGames.slice(0, 3)); // Show last 3 winners
      } catch (error) {
        console.error("Error loading recent winners:", error);
        setRecentWinners([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecentWinners();
    const interval = setInterval(loadRecentWinners, 60000); // Refresh every 60 seconds to avoid rate limits

    return () => clearInterval(interval);
  }, [eventId]);

  if (loading || recentWinners.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Trophy className="w-6 h-6" />
            Recent Winners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentWinners.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg p-4 shadow-sm border border-green-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <span className="font-semibold text-gray-900">{game?.name || "Unknown Game"}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Winner:</span> {game?.winner_name || "Unknown"}
                    </p>
                    {game?.prize_description && (
                      <p className="text-sm text-green-700 font-medium">
                        <span className="opacity-70">Prize:</span> {game.prize_description}
                      </p>
                    )}
                  </div>
                  <Trophy className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}