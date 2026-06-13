import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Photo } from "@/entities/all";
import { Award, Camera, Heart, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LeaderboardDialog({ open, onOpenChange, eventId }) {
  const [topContributors, setTopContributors] = useState([]);
  const [topPhotos, setTopPhotos] = useState([]);

  useEffect(() => {
    if (open) {
      loadLeaderboard();
    }
  }, [open]);

  const loadLeaderboard = async () => {
    const photos = await Photo.filter({ event_id: eventId });

    // Top Contributors
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
    const sortedContributors = Object.values(contributors).sort((a, b) => b.count - a.count).slice(0, 10);
    setTopContributors(sortedContributors);

    // Top Photos
    const sortedPhotos = [...photos].sort((a, b) => (b.like_count || 0) - (a.like_count || 0)).slice(0, 10);
    setTopPhotos(sortedPhotos);
  };

  const LeaderboardList = ({ items, dataKey, icon: Icon, title }) => (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: ["#FFD700", "#C0C0C0", "#CD7F32"][index] || '#A0AEC0' }}>
            {index + 1}
          </div>
          <div className="flex-1">
            <p className="font-medium">{item.name || item.uploader_name}</p>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Icon className="w-4 h-4" />
            <span>{item[dataKey]}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Event Leaderboard
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="contributors" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contributors">Top Contributors</TabsTrigger>
            <TabsTrigger value="photos">Top Photos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="contributors" className="mt-4">
            <LeaderboardList items={topContributors} dataKey="count" icon={Camera} title="Top Contributors" />
          </TabsContent>
          
          <TabsContent value="photos" className="mt-4">
            <LeaderboardList items={topPhotos} dataKey="like_count" icon={Heart} title="Top Photos" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}