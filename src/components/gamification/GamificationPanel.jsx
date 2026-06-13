import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Target, TrendingUp, Award, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const POINT_VALUES = {
  photo_upload: 10,
  like_received: 2,
  comment_made: 5,
  guestbook_entry: 15,
  challenge_completed: 50,
  contest_vote: 3
};

const BADGES = [
  { id: 'first_photo', name: 'First Upload', description: 'Upload your first photo', icon: '📸', threshold: 1, type: 'photo_uploads' },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Leave 10 comments', icon: '🦋', threshold: 10, type: 'comments_made' },
  { id: 'photo_enthusiast', name: 'Photo Enthusiast', description: 'Upload 10 photos', icon: '📷', threshold: 10, type: 'photo_uploads' },
  { id: 'beloved', name: 'Beloved', description: 'Receive 50 likes', icon: '❤️', threshold: 50, type: 'likes_received' },
  { id: 'challenge_master', name: 'Challenge Master', description: 'Complete 5 challenges', icon: '🏆', threshold: 5, type: 'challenges_completed' },
  { id: 'guestbook_star', name: 'Guestbook Star', description: 'Leave a guestbook entry', icon: '⭐', threshold: 1, type: 'guestbook_entries' }
];

export default function GamificationPanel({ event, currentUser, compact = false }) {
  const [userPoints, setUserPoints] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadGamificationData();
    }
  }, [currentUser]);

  const loadGamificationData = async () => {
    try {
      // Load user's points
      const points = await base44.entities.GamificationPoints.filter({
        event_id: event.id,
        user_email: currentUser.email
      });

      if (points.length > 0) {
        setUserPoints(points[0]);
      } else {
        // Create initial points record
        const newPoints = await base44.entities.GamificationPoints.create({
          event_id: event.id,
          user_email: currentUser.email,
          user_name: currentUser.full_name,
          total_points: 0,
          points_breakdown: {
            photo_uploads: 0,
            likes_received: 0,
            comments_made: 0,
            guestbook_entries: 0,
            challenges_completed: 0,
            contest_votes: 0
          },
          achievements: []
        });
        setUserPoints(newPoints);
      }

      // Load leaderboard
      const allPoints = await base44.entities.GamificationPoints.filter(
        { event_id: event.id },
        '-total_points',
        10
      );
      setLeaderboard(allPoints);

      // Load challenges
      const eventChallenges = await base44.entities.EventChallenge.filter({
        event_id: event.id,
        is_active: true
      });
      setChallenges(eventChallenges);

    } catch (error) {
      console.error('Error loading gamification data:', error);
    }
    setLoading(false);
  };

  const checkAndAwardBadges = async (currentBreakdown) => {
    if (!userPoints) return;

    const newBadges = [];
    for (const badge of BADGES) {
      const alreadyEarned = userPoints.achievements?.some(a => a.badge_id === badge.id);
      if (!alreadyEarned) {
        const count = currentBreakdown[badge.type] || 0;
        if (count >= badge.threshold) {
          newBadges.push({
            badge_id: badge.id,
            badge_name: badge.name,
            earned_date: new Date().toISOString()
          });
        }
      }
    }

    if (newBadges.length > 0) {
      const updatedAchievements = [...(userPoints.achievements || []), ...newBadges];
      await base44.entities.GamificationPoints.update(userPoints.id, {
        achievements: updatedAchievements
      });
      
      // Show celebration
      newBadges.forEach(badge => {
        alert(`🎉 Badge Earned: ${badge.badge_name}!`);
      });
      
      await loadGamificationData();
    }
  };

  const awardPoints = async (action) => {
    if (!userPoints || !currentUser) return;

    const pointsToAdd = POINT_VALUES[action] || 0;
    const currentBreakdown = userPoints.points_breakdown || {
      photo_uploads: 0,
      likes_received: 0,
      comments_made: 0,
      guestbook_entries: 0,
      challenges_completed: 0,
      contest_votes: 0
    };

    currentBreakdown[action] = (currentBreakdown[action] || 0) + 1;

    const newTotal = (userPoints.total_points || 0) + pointsToAdd;

    await base44.entities.GamificationPoints.update(userPoints.id, {
      total_points: newTotal,
      points_breakdown: currentBreakdown
    });

    await checkAndAwardBadges(currentBreakdown);
    await loadGamificationData();
  };

  // Export function to be called from parent components
  React.useImperativeHandle(React.useRef(), () => ({
    awardPoints
  }));

  if (loading || !userPoints) {
    return null;
  }

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400 rounded-full p-2">
                <Trophy className="w-5 h-5 text-yellow-900" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-900">{userPoints.total_points}</div>
                <div className="text-xs text-yellow-700">Points</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-900">
                {userPoints.achievements?.length || 0} Badges
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const userRank = leaderboard.findIndex(p => p.user_email === currentUser.email) + 1;

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-purple-600" />
            Your Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{userPoints.total_points}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">#{userRank || '-'}</div>
              <div className="text-sm text-gray-600">Rank</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{userPoints.achievements?.length || 0}</div>
              <div className="text-sm text-gray-600">Badges</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{challenges.filter(c => c.completions?.some(comp => comp.user_email === currentUser.email)).length}</div>
              <div className="text-sm text-gray-600">Challenges</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Points Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">📸 Photos Uploaded</span>
              <span className="font-bold">{userPoints.points_breakdown?.photo_uploads || 0} × {POINT_VALUES.photo_upload} = {(userPoints.points_breakdown?.photo_uploads || 0) * POINT_VALUES.photo_upload}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">❤️ Likes Received</span>
              <span className="font-bold">{userPoints.points_breakdown?.likes_received || 0} × {POINT_VALUES.like_received} = {(userPoints.points_breakdown?.likes_received || 0) * POINT_VALUES.like_received}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">💬 Comments Made</span>
              <span className="font-bold">{userPoints.points_breakdown?.comments_made || 0} × {POINT_VALUES.comment_made} = {(userPoints.points_breakdown?.comments_made || 0) * POINT_VALUES.comment_made}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">📖 Guestbook Entries</span>
              <span className="font-bold">{userPoints.points_breakdown?.guestbook_entries || 0} × {POINT_VALUES.guestbook_entry} = {(userPoints.points_breakdown?.guestbook_entries || 0) * POINT_VALUES.guestbook_entry}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">🎯 Challenges Completed</span>
              <span className="font-bold">{userPoints.points_breakdown?.challenges_completed || 0} × {POINT_VALUES.challenge_completed} = {(userPoints.points_breakdown?.challenges_completed || 0) * POINT_VALUES.challenge_completed}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges/Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {BADGES.map(badge => {
              const earned = userPoints.achievements?.some(a => a.badge_id === badge.id);
              return (
                <motion.div
                  key={badge.id}
                  whileHover={{ scale: 1.05 }}
                  className={`p-4 rounded-lg border-2 text-center ${
                    earned 
                      ? 'bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-400' 
                      : 'bg-gray-50 border-gray-200 opacity-50'
                  }`}
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="font-bold text-sm mb-1">{badge.name}</div>
                  <div className="text-xs text-gray-600">{badge.description}</div>
                  {earned && (
                    <Badge className="mt-2 bg-green-500 text-white">Earned!</Badge>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.user_email === currentUser.email 
                    ? 'bg-purple-100 border-2 border-purple-400' 
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-orange-400 text-orange-900' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{player.user_name}</div>
                    <div className="text-xs text-gray-600">{player.achievements?.length || 0} badges</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-600">{player.total_points}</div>
                  <div className="text-xs text-gray-600">points</div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Challenges */}
      {challenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-red-600" />
              Active Challenges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {challenges.map(challenge => {
                const completed = challenge.completions?.some(c => c.user_email === currentUser.email);
                return (
                  <div key={challenge.id} className={`p-4 rounded-lg border-2 ${
                    completed ? 'bg-green-50 border-green-400' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold">{challenge.challenge_title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{challenge.challenge_description}</p>
                      </div>
                      <Badge className="bg-purple-600 text-white">
                        <Zap className="w-3 h-3 mr-1" />
                        {challenge.points_reward} pts
                      </Badge>
                    </div>
                    {completed && (
                      <Badge className="bg-green-500 text-white mt-2">
                        ✓ Completed
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export the awardPoints function for use in parent components
export { POINT_VALUES };