import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, Plus, Trash2, Star, Image as ImageIcon, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function SmartCollections() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("eventId");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const eventData = await base44.entities.Event.list();
      const foundEvent = eventData.find(e => e.id === eventId);
      
      if (!foundEvent || (foundEvent.host_email !== user.email && !foundEvent.co_hosts?.includes(user.email))) {
        navigate(createPageUrl("Home"));
        return;
      }
      
      setEvent(foundEvent);
      
      const photoData = await base44.entities.Photo.filter({ event_id: eventId }, "-created_date");
      setPhotos(photoData);
      
      const collectionData = await base44.entities.PhotoCollection.filter({ event_id: eventId }, "sort_order");
      setCollections(collectionData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      // Group photos by AI tags and time
      const timeBasedGroups = {};
      const tagBasedGroups = {};
      
      photos.forEach(photo => {
        // Time-based grouping
        const hour = new Date(photo.created_date).getHours();
        let timeKey;
        if (hour >= 6 && hour < 12) timeKey = "Morning Magic";
        else if (hour >= 12 && hour < 17) timeKey = "Afternoon Vibes";
        else if (hour >= 17 && hour < 20) timeKey = "Golden Hour";
        else timeKey = "Night Life";
        
        if (!timeBasedGroups[timeKey]) timeBasedGroups[timeKey] = [];
        timeBasedGroups[timeKey].push(photo.id);
        
        // Tag-based grouping
        if (photo.photo_type) {
          const typeKey = photo.photo_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          if (!tagBasedGroups[typeKey]) tagBasedGroups[typeKey] = [];
          tagBasedGroups[typeKey].push(photo.id);
        }
      });
      
      // Create collections
      const newCollections = [];
      
      for (const [name, photoIds] of Object.entries(timeBasedGroups)) {
        if (photoIds.length >= 3) {
          const coverPhoto = photos.find(p => p.id === photoIds[0]);
          newCollections.push({
            event_id: eventId,
            collection_name: name,
            collection_type: "time_based",
            photo_ids: photoIds,
            cover_photo_url: coverPhoto?.image_url,
            ai_summary: `${photoIds.length} photos captured during ${name.toLowerCase()}`
          });
        }
      }
      
      for (const [name, photoIds] of Object.entries(tagBasedGroups)) {
        if (photoIds.length >= 5) {
          const coverPhoto = photos.find(p => p.id === photoIds[0]);
          newCollections.push({
            event_id: eventId,
            collection_name: `${name} Collection`,
            collection_type: "ai_auto",
            photo_ids: photoIds,
            cover_photo_url: coverPhoto?.image_url,
            ai_summary: `${photoIds.length} ${name.toLowerCase()} photos automatically grouped by AI`
          });
        }
      }
      
      // Save all collections
      for (const collection of newCollections) {
        await base44.entities.PhotoCollection.create(collection);
      }
      
      await loadData();
      alert(`✨ Generated ${newCollections.length} smart collections!`);
    } catch (error) {
      console.error("Error generating collections:", error);
      alert("Failed to generate collections. Please try again.");
    }
    setGenerating(false);
  };

  const handleCreateManual = async () => {
    if (!newCollectionName || selectedPhotos.length === 0) {
      alert("Please enter a collection name and select photos");
      return;
    }
    
    try {
      const coverPhoto = photos.find(p => p.id === selectedPhotos[0]);
      await base44.entities.PhotoCollection.create({
        event_id: eventId,
        collection_name: newCollectionName,
        collection_type: "manual",
        photo_ids: selectedPhotos,
        cover_photo_url: coverPhoto?.image_url,
        ai_summary: `${selectedPhotos.length} hand-picked photos`
      });
      
      setShowDialog(false);
      setNewCollectionName("");
      setSelectedPhotos([]);
      await loadData();
    } catch (error) {
      console.error("Error creating collection:", error);
      alert("Failed to create collection");
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    if (window.confirm("Delete this collection?")) {
      try {
        await base44.entities.PhotoCollection.delete(collectionId);
        await loadData();
      } catch (error) {
        console.error("Error deleting collection:", error);
      }
    }
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manage Event
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              <Sparkles className="w-8 h-8 text-purple-600" />
              Smart Photo Collections
            </h1>
            <p className="text-gray-600">{event?.name} • {photos.length} photos</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAutoGenerate} disabled={generating} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  AI Auto-Generate
                </>
              )}
            </Button>
            <Button onClick={() => setShowDialog(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Manual
            </Button>
          </div>
        </div>

        {collections.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Collections Yet</h3>
              <p className="text-gray-600 mb-4">Let AI automatically organize your photos into beautiful collections</p>
              <Button onClick={handleAutoGenerate} disabled={generating}>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Collections Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection, index) => (
              <motion.div
                key={collection.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group hover:shadow-xl transition-all">
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={collection.cover_photo_url}
                      alt={collection.collection_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-bold text-lg">{collection.collection_name}</h3>
                      <p className="text-white/80 text-sm">{collection.photo_ids.length} photos</p>
                    </div>
                    {collection.is_featured && (
                      <Badge className="absolute top-3 right-3 bg-yellow-400 text-yellow-900">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-3">{collection.ai_summary}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {collection.collection_type.replace('_', ' ')}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCollection(collection.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Manual Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Collection Name</Label>
                <Input
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., Best Moments, Dance Floor, Family Photos"
                />
              </div>
              
              <div>
                <Label>Select Photos ({selectedPhotos.length} selected)</Label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-2 max-h-96 overflow-y-auto p-2 border rounded-lg">
                  {photos.map(photo => (
                    <div
                      key={photo.id}
                      onClick={() => togglePhotoSelection(photo.id)}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPhotos.includes(photo.id) 
                          ? 'border-purple-600 ring-2 ring-purple-600' 
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={photo.image_url}
                        alt=""
                        className="w-full aspect-square object-cover"
                      />
                      {selectedPhotos.includes(photo.id) && (
                        <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">{selectedPhotos.indexOf(photo.id) + 1}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateManual} disabled={!newCollectionName || selectedPhotos.length === 0}>
                Create Collection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}