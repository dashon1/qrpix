import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, Camera, Heart, MessageCircle, Download, Clock, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { format, startOfHour, differenceInHours } from 'date-fns';
import { motion } from 'framer-motion';
import AnimatedCounter from '../components/ui/AnimatedCounter';

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

export default function AdvancedAnalytics() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      
      const eventData = await base44.entities.Event.list();
      const foundEvent = eventData.find(e => e.id === eventId);
      
      const isHost = foundEvent && (foundEvent.host_email === user.email || foundEvent.co_hosts?.includes(user.email));
      
      if (!foundEvent || !isHost) {
        navigate(createPageUrl('Home'));
        return;
      }
      
      setEvent(foundEvent);
      
      const photoData = await base44.entities.Photo.filter({ event_id: eventId }, '-created_date');
      setPhotos(photoData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const calculateMetrics = () => {
    const totalPhotos = photos.length;
    const totalLikes = photos.reduce((sum, p) => sum + (p.like_count || 0), 0);
    const totalComments = photos.reduce((sum, p) => sum + (p.comment_count || 0), 0);
    const uniqueContributors = new Set(photos.map(p => p.uploaded_by)).size;
    const engagementRate = totalPhotos > 0 ? ((totalLikes + totalComments) / totalPhotos).toFixed(2) : 0;
    const avgLikesPerPhoto = totalPhotos > 0 ? (totalLikes / totalPhotos).toFixed(1) : 0;
    const avgCommentsPerPhoto = totalPhotos > 0 ? (totalComments / totalPhotos).toFixed(1) : 0;

    return {
      totalPhotos,
      totalLikes,
      totalComments,
      uniqueContributors,
      engagementRate,
      avgLikesPerPhoto,
      avgCommentsPerPhoto
    };
  };

  const getHourlyActivity = () => {
    if (!event.start_date) return [];
    
    const eventStart = new Date(event.start_date);
    const hourlyData = {};
    
    photos.forEach(photo => {
      const photoTime = new Date(photo.created_date);
      const hoursDiff = differenceInHours(photoTime, eventStart);
      const hour = `Hour ${Math.max(0, hoursDiff)}`;
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = { hour, uploads: 0, engagement: 0 };
      }
      hourlyData[hour].uploads++;
      hourlyData[hour].engagement += (photo.like_count || 0) + (photo.comment_count || 0);
    });
    
    return Object.values(hourlyData).slice(0, 24);
  };

  const getTopContributors = (limit = 10) => {
    const contributors = {};
    photos.forEach(photo => {
      const email = photo.uploaded_by;
      if (!contributors[email]) {
        contributors[email] = {
          name: photo.uploader_name,
          uploads: 0,
          likes: 0,
          comments: 0
        };
      }
      contributors[email].uploads++;
      contributors[email].likes += photo.like_count || 0;
      contributors[email].comments += photo.comment_count || 0;
    });

    return Object.values(contributors)
      .sort((a, b) => b.uploads - a.uploads)
      .slice(0, limit);
  };

  const getPhotoTypeDistribution = () => {
    const distribution = {};
    photos.forEach(photo => {
      const type = photo.photo_type || 'other';
      if (!distribution[type]) {
        distribution[type] = 0;
      }
      distribution[type]++;
    });
    
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const getEngagementHeatmap = () => {
    // Group photos by day of week and hour
    const heatmapData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    photos.forEach(photo => {
      const date = new Date(photo.created_date);
      const day = days[date.getDay()];
      const hour = date.getHours();
      const engagement = (photo.like_count || 0) + (photo.comment_count || 0);
      
      heatmapData.push({ day, hour, engagement });
    });
    
    return heatmapData;
  };

  const getPredictiveAnalytics = () => {
    if (photos.length < 10) return null;
    
    const metrics = calculateMetrics();
    const eventStart = event.start_date ? new Date(event.start_date) : new Date(photos[photos.length - 1].created_date);
    const now = new Date();
    const hoursElapsed = Math.max(1, differenceInHours(now, eventStart));
    const uploadVelocity = photos.length / hoursElapsed;
    
    const eventEnd = event.expiration_date ? new Date(event.expiration_date) : null;
    const remainingHours = eventEnd ? Math.max(0, differenceInHours(eventEnd, now)) : 24;
    
    const predictedFinalPhotos = Math.round(photos.length + (uploadVelocity * remainingHours));
    const trend = uploadVelocity > 1 ? 'increasing' : uploadVelocity > 0.5 ? 'stable' : 'decreasing';
    
    return {
      uploadVelocity: uploadVelocity.toFixed(2),
      predictedFinalPhotos,
      trend,
      confidenceScore: photos.length > 50 ? 'High' : photos.length > 20 ? 'Medium' : 'Low'
    };
  };

  const exportReport = () => {
    const metrics = calculateMetrics();
    const predictive = getPredictiveAnalytics();
    
    const report = {
      event_name: event.name,
      report_date: format(new Date(), 'PPP'),
      metrics,
      predictive_analytics: predictive,
      top_contributors: getTopContributors(5),
      photo_type_distribution: getPhotoTypeDistribution()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.name}-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const metrics = calculateMetrics();
  const hourlyActivity = getHourlyActivity();
  const topContributors = getTopContributors();
  const photoTypeData = getPhotoTypeDistribution();
  const predictive = getPredictiveAnalytics();

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Advanced Analytics
            </h1>
            <p className="text-gray-600">{event.name}</p>
          </div>
          <Button onClick={exportReport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Camera className="w-8 h-8 text-purple-600" />
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={metrics.totalPhotos} />
                </div>
                <div className="text-sm text-gray-600">Total Photos</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-8 h-8 text-pink-600" />
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={metrics.totalLikes} />
                </div>
                <div className="text-sm text-gray-600">Total Likes</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={metrics.totalComments} />
                </div>
                <div className="text-sm text-gray-600">Total Comments</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-green-600" />
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={metrics.uniqueContributors} />
                </div>
                <div className="text-sm text-gray-600">Contributors</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Predictive Analytics */}
        {predictive && (
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Predictive Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Upload Velocity</p>
                  <p className="text-2xl font-bold text-purple-600">{predictive.uploadVelocity}</p>
                  <p className="text-xs text-gray-500">photos/hour</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Predicted Final Count</p>
                  <p className="text-2xl font-bold text-blue-600">{predictive.predictedFinalPhotos}</p>
                  <p className="text-xs text-gray-500">photos by event end</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Trend</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${predictive.trend === 'increasing' ? 'text-green-600' : predictive.trend === 'stable' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {predictive.trend === 'increasing' ? '↗' : predictive.trend === 'stable' ? '→' : '↘'}
                    </p>
                    <p className="text-sm capitalize">{predictive.trend}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Confidence</p>
                  <p className={`text-2xl font-bold ${predictive.confidenceScore === 'High' ? 'text-green-600' : predictive.confidenceScore === 'Medium' ? 'text-yellow-600' : 'text-orange-600'}`}>
                    {predictive.confidenceScore}
                  </p>
                  <p className="text-xs text-gray-500">prediction accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Hourly Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Activity Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={hourlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="uploads" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="engagement" stroke="#EC4899" fill="#EC4899" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Photo Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Content Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={photoTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {photoTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Contributors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Top Contributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topContributors.map((contributor, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{contributor.name}</p>
                    <p className="text-sm text-gray-600">
                      {contributor.uploads} uploads · {contributor.likes} likes · {contributor.comments} comments
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-purple-600">
                      {contributor.uploads + contributor.likes + contributor.comments}
                    </p>
                    <p className="text-xs text-gray-500">total points</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}