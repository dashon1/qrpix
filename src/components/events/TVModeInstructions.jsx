import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Tv, Smartphone, Cast } from "lucide-react";

export default function TVModeInstructions({ open, onOpenChange, eventId }) {
  const [copied, setCopied] = React.useState(false);

  // Generate the TV Mode URL correctly
  const tvModeUrl = `${window.location.origin}/#/TVMode?eventId=${eventId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(tvModeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate QR code URL using API instead of qrcode.react library
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tvModeUrl)}&color=8B5CF6&bgcolor=FFFFFF&qzone=2&format=svg`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Tv className="w-6 h-6 text-purple-600" />
            Connect to TV
          </DialogTitle>
          <DialogDescription>
            Display your event photos on a big screen for everyone to enjoy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code Section */}
          <div className="flex flex-col items-center bg-purple-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-3 text-lg">Scan with Your Phone</h3>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <img 
                src={qrCodeUrl} 
                alt="TV Mode QR Code" 
                className="w-[200px] h-[200px]"
              />
            </div>
            <p className="text-sm text-gray-600 mt-3 text-center">
              Then use your phone's casting feature to cast to your TV
            </p>
          </div>

          {/* URL Copy Section */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Or Copy the URL
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={tvModeUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
              />
              <Button onClick={handleCopy} variant="outline" className="gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Cast className="w-5 h-5" />
              How to Connect:
            </h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Smart TV Browser</p>
                  <p className="text-sm text-gray-600">
                    Open your TV's web browser and enter the URL above
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Cast from Phone/Laptop</p>
                  <p className="text-sm text-gray-600">
                    Use Chromecast, AirPlay, or Miracast to cast your screen to the TV
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">HDMI Cable</p>
                  <p className="text-sm text-gray-600">
                    Connect your laptop to the TV with an HDMI cable and open the URL in fullscreen mode
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Pro Tip:</strong> Once connected, the TV will automatically display new photos as they're uploaded in real-time!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}