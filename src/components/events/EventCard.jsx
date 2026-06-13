import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Camera, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import MobileConfirmDialog from "../mobile/MobileConfirmDialog";
import MobileAlertDialog from "../mobile/MobileAlertDialog";

export default function EventCard({ event, onDelete, showDeleteButton = true }) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = React.useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = React.useState(false);
  const [downloadPhotos, setDownloadPhotos] = React.useState([]);
  const [alertInfo, setAlertInfo] = React.useState({ open: false, title: "", description: "" });
  const isExpired = event.expiration_date && new Date(event.expiration_date) < new Date();
  
  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(event.id);
    }
  };

  const [downloadProgress, setDownloadProgress] = React.useState('');
  
  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDownloading(true);
    setDownloadProgress('Loading photos...');
    
    const photos = await base44.entities.Photo.filter({ event_id: event.id }, '-created_date');
    
    if (photos.length === 0) {
      setAlertInfo({ open: true, title: "No Photos", description: "No photos found to download." });
      setDownloading(false);
      setDownloadProgress('');
      return;
    }

    setDownloadPhotos(photos);
    setShowDownloadConfirm(true);
    setDownloading(false);
    setDownloadProgress('');
  };

  const executeDownload = async () => {
    setShowDownloadConfirm(false);
    const photos = downloadPhotos;
    if (photos.length === 0) return;

    setDownloading(true);
    let downloaded = 0;
    let failed = 0;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      setDownloadProgress(`${i + 1} of ${photos.length}`);
      try {
        const response = await fetch(photo.image_url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const urlPath = new URL(photo.image_url).pathname;
        const ext = urlPath.split('.').pop() || (photo.is_video ? 'mp4' : 'jpg');
        a.download = `${event.name.replace(/[^a-z0-9]/gi, '_')}_${String(i + 1).padStart(4, '0')}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        downloaded++;
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (err) {
        console.error(`Failed to download photo ${i + 1}:`, err);
        failed++;
      }
    }
    
    setDownloading(false);
    setDownloadProgress('');
    if (failed > 0) {
      setAlertInfo({ open: true, title: "Download Complete", description: `✅ Downloaded: ${downloaded}\n❌ Failed: ${failed}` });
    } else {
      setAlertInfo({ open: true, title: "Download Complete", description: `Successfully downloaded ${downloaded} files!` });
    }
  };

  const handleCardClick = () => {
    navigate(createPageUrl(`EventGallery?eventId=${event.id}`));
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      className="cursor-pointer relative"
    >
      <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-200 h-full">
        <div 
          className="h-40 bg-gradient-to-br relative overflow-hidden group"
          style={{ 
            background: `linear-gradient(135deg, ${event.theme_color || '#8B5CF6'} 0%, ${event.theme_color || '#8B5CF6'}99 100%)`
          }}
        >
          {event.cover_image_url ? (
            <img 
              src={event.cover_image_url} 
              alt={event.name}
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="w-16 h-16 text-white/30" />
            </div>
          )}
          <div className="absolute top-4 right-4">
            {isExpired ? (
              <Badge variant="secondary" className="bg-gray-800/80 text-white">
                Expired
              </Badge>
            ) : (
              <Badge className="bg-white/90 text-gray-900">
                Active
              </Badge>
            )}
          </div>
        </div>
        
        <CardContent className="p-6">
          <h3 className="font-bold text-xl mb-2 text-theme-primary">{event.name}</h3>
          {event.description && (
            <p className="text-theme-secondary text-sm mb-4 line-clamp-2">{event.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-theme-secondary">
            <div className="flex items-center gap-1">
              <Camera className="w-4 h-4" />
              <span>{event.photo_count || 0}</span>
            </div>
            {event.expiration_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(event.expiration_date), "MMM d")}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              disabled={downloading || (event.photo_count || 0) === 0}
            >
              <Download className="w-4 h-4" />
              {downloading ? (downloadProgress || 'Downloading...') : 'Download All'}
            </Button>
            {showDeleteButton && onDelete && (
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="sm"
                className="flex-1 gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <MobileConfirmDialog
        open={showDownloadConfirm}
        onOpenChange={(v) => { if (!v) { setShowDownloadConfirm(false); } }}
        title="Download All"
        description={`Download all ${downloadPhotos.length} photos/videos from "${event.name}"? They will download one by one.`}
        confirmLabel="Download"
        onConfirm={executeDownload}
      />
      <MobileAlertDialog
        open={alertInfo.open}
        onOpenChange={(v) => setAlertInfo(prev => ({ ...prev, open: v }))}
        title={alertInfo.title}
        description={alertInfo.description}
      />
    </motion.div>
  );
}