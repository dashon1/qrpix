import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "@/functions/deleteAccount";

export default function DeleteAccountDialog({ open, onOpenChange, currentUser }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await deleteAccount({});
      alert("Your account has been deleted. You will now be logged out.");
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Please try again or contact support.");
    }
    setDeleting(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">Delete Account</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This will <strong>permanently delete</strong> your account and all associated data including events, photos, and settings.
            </p>
            <p className="font-semibold text-red-600">
              This action cannot be undone.
            </p>
            <div className="pt-2">
              <p className="text-sm mb-2">Type <strong>DELETE</strong> to confirm:</p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="border-red-200 focus:border-red-400"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete My Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}