import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import LeadCaptureForm from './LeadCaptureForm';

export default function LeadCaptureDialog({ open, onOpenChange, title, description, source }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <LeadCaptureForm source={source} onSuccess={() => setTimeout(() => onOpenChange(false), 3000)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}