import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Mail } from "lucide-react";

export default function CoHostManager({ event, onUpdate }) {
  const [newCoHostEmail, setNewCoHostEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddCoHost = async () => {
    if (!newCoHostEmail || !newCoHostEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setAdding(true);
    try {
      const currentCoHosts = event.co_hosts || [];
      
      if (currentCoHosts.includes(newCoHostEmail)) {
        alert('This user is already a co-host');
        setAdding(false);
        return;
      }

      if (event.host_email === newCoHostEmail) {
        alert('This is the event host - already has full access');
        setAdding(false);
        return;
      }

      await onUpdate({
        co_hosts: [...currentCoHosts, newCoHostEmail]
      });

      setNewCoHostEmail('');
    } catch (error) {
      console.error('Failed to add co-host:', error);
      alert('Failed to add co-host. Please try again.');
    }
    setAdding(false);
  };

  const handleRemoveCoHost = async (emailToRemove) => {
    if (!window.confirm(`Remove ${emailToRemove} as co-host?`)) return;

    try {
      const currentCoHosts = event.co_hosts || [];
      await onUpdate({
        co_hosts: currentCoHosts.filter(email => email !== emailToRemove)
      });
    } catch (error) {
      console.error('Failed to remove co-host:', error);
      alert('Failed to remove co-host. Please try again.');
    }
  };

  const coHosts = event.co_hosts || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Co-Host Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Co-hosts have full access to manage this event, moderate photos, and view analytics.
        </p>

        <div className="space-y-2">
          <Label htmlFor="cohost-email">Add Co-Host by Email</Label>
          <div className="flex gap-2">
            <Input
              id="cohost-email"
              type="email"
              placeholder="cohost@example.com"
              value={newCoHostEmail}
              onChange={(e) => setNewCoHostEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCoHost()}
            />
            <Button onClick={handleAddCoHost} disabled={adding} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Current Co-Hosts</Label>
          {coHosts.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No co-hosts added yet</p>
          ) : (
            <div className="space-y-2">
              {coHosts.map(email => (
                <div key={email} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{email}</span>
                    <Badge variant="secondary" className="text-xs">Co-Host</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveCoHost(email)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Badge>Host</Badge>
            <span>{event.host_email}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}