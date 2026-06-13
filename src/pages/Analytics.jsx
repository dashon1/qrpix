
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Users, Camera, Heart, MessageCircle, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format } from "date-fns";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import { motion } from "framer-motion";

const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6"];

export default function Analytics() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [stats, setStats] = useState({ totalLikes: 0, totalComments: 0 });
  const [loading, setLoading] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("eventId");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const eventData = await base44.entities.Event.list();
    const foundEvent = eventData.find((e) => e.id === eventId);
    setEvent(foundEvent);

    const photoData = await base44.entities.Photo.filter({ event_id: eventId }, "-created_date");
    setPhotos(photoData);

    const totalLikes = photoData.reduce((sum, p) => sum + (p.like_count || 0), 0);
    const totalComments = photoData.reduce((sum, p) => sum + (p.comment_count || 0), 0);
    setStats({ totalLikes, totalComments });

    setLoading(false);
  };

  const getTopPhotos = () => {
    return [...photos]
      .sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
      .slice(0, 5);
  };

  const getTopContributors = () => {
    const contributors = {};
    photos.forEach(photo => {
      const email = photo.uploaded_by;
      if (!contributors[email]) {
        contributors[email] = {
          name: photo.uploader_name,
          count: 0,
          likes: 0
        };
      }
      contributors[email].count++;
      contributors[email].likes += photo.like_count || 0;
    });

    return Object.entries(contributors)
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getEngagementOverTime = () => {
    const timeData = {};
    
    photos.forEach(photo => {
      const date = format(new Date(photo.created_date), "MMM d");
      if (!timeData[date]) {
        timeData[date] = { date, photos: 0, engagement: 0 };
      }
      timeData[date].photos++;
      timeData[date].engagement += (photo.like_count || 0) + (photo.comment_count || 0);
    });

    return Object.values(timeData).slice(-7);
  };

  const getPhotoTypeDistribution = () => {
    const distribution = {};
    photos.forEach(photo => {
      const type = photo.photo_type || 'other';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const getSeatingStats = () => {
    if (!event || !event.num_tables || !event.people_per_table) return null;
    
    return {
      total_capacity: event.num_tables * event.people_per_table,
      tickets_sold: event.tickets_sold || 0,
      occupancy_rate: ((event.tickets_sold || 0) / (event.num_tables * event.people_per_table) * 100).toFixed(1)
    };
  };

  const exportReport = () => {
    const report = {
      event: event.name,
      date: format(new Date(), "PPP"),
      stats: {
        total_photos: photos.length,
        total_likes: stats.totalLikes,
        total_comments: stats.totalComments,
        avg_likes_per_photo: (stats.totalLikes / (photos.length || 1)).toFixed(2),
      },
      top_photos: getTopPhotos().map(p => ({
        uploader: p.uploader_name,
        likes: p.like_count,
        comments: p.comment_count,
      })),
      top_contributors: getTopContributors()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name}-analytics-report.json`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-b-2 border-t-2 border-purple-600"
        />
      </div>
    );
  }

  const topPhotos = getTopPhotos();
  const topContributors = getTopContributors();
  const engagementData = getEngagementOverTime();
  const photoTypeData = getPhotoTypeDistribution();
  const seatingStats = getSeatingStats();

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Event Analytics
              </h1>
              <p className="text-gray-600">{event?.name}</p>
            </div>
          </div>
          <Button onClick={exportReport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Photos</CardTitle>
                <Camera className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={photos.length} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Uploaded by {new Set(photos.map(p => p.uploaded_by)).size} contributors
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Likes</CardTitle>
                <Heart className="w-4 h-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={stats.totalLikes} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Avg {(stats.totalLikes / (photos.length || 1)).toFixed(1)} per photo
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Comments</CardTitle>
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={stats.totalComments} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Avg {(stats.totalComments / (photos.length || 1)).toFixed(1)} per photo
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Engagement Rate</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={parseFloat(((stats.totalLikes + stats.totalComments) / (photos.length || 1)).toFixed(1))} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Interactions per photo</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {seatingStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Total Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={seatingStats.total_capacity} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {event.num_tables} tables × {event.people_per_table} seats
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Tickets Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={seatingStats.tickets_sold} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {seatingStats.total_capacity - seatingStats.tickets_sold} remaining
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Occupancy Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{seatingStats.occupancy_rate}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${seatingStats.occupancy_rate}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Engagement Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="photos" stroke="#8B5CF6" strokeWidth={2} />
                    <Line type="monotone" dataKey="engagement" stroke="#EC4899" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <Card>
            <CardHeader>
              <CardTitle>Photo Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={photoTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
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

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Top Contributors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topContributors.map((contributor, index) => (
                    <motion.div 
                      key={contributor.email}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="flex items-center gap-4"
                    >
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold"
                      >
                        {index + 1}
                      </motion.div>
                      <div className="flex-1">
                        <p className="font-medium">{contributor.name}</p>
                        <p className="text-sm text-gray-500">
                          {contributor.count} photos · {contributor.likes} likes
                        </p>
                      </div>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(contributor.count / (photos.length || 1)) * 100}%` }}
                          transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {topPhotos.map((photo, index) => (
                  <motion.div 
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="relative group"
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.caption}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center text-white">
                      <motion.div 
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        className="flex items-center gap-2 mb-2"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                        <span>{photo.like_count || 0}</span>
                      </motion.div>
                      <motion.div 
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{photo.comment_count || 0}</span>
                      </motion.div>
                    </div>
                    <div className="absolute top-2 left-2">
                      <motion.div
                        initial={{ rotate: 0 }}
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold"
                      >
                        #{index + 1}
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Share on Social Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => {
                    const text = encodeURIComponent(`Check out amazing photos from ${event?.name}! 📸✨`);
                    const url = encodeURIComponent(event?.qr_code_data);
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                  }}
                  className="bg-[#1877F2] hover:bg-[#0C63D4]"
                >
                  Facebook
                </Button>
                <Button
                  onClick={() => {
                    const text = encodeURIComponent(`Check out ${event?.name}! 📸`);
                    const url = encodeURIComponent(event?.qr_code_data);
                    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
                  }}
                  className="bg-[#1DA1F2] hover:bg-[#0C8BD9]"
                >
                  Twitter
                </Button>
                <Button
                  onClick={() => {
                    const text = encodeURIComponent(`Check out ${event?.name}! 📸 ${event?.qr_code_data}`);
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="bg-[#25D366] hover:bg-[#1EBE57]"
                >
                  WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {seatingStats && (
                <Button
                  onClick={() => navigate(createPageUrl(`SeatingChart?eventId=${eventId}`))}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Users className="w-4 h-4" />
                  Manage Seating Chart
                </Button>
              )}
              <Button
                onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))}
                variant="outline"
                className="w-full gap-2"
              >
                Manage Event Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
