import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Camera, Bug, HelpCircle, LogOut, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";

const ROOT_PAGES = ["Home", "Browse", "CreateEvent", "Pricing"];

export default function MobileHeader({ currentUser, currentPageName, onLogout, onOpenOnboarding, onDeleteAccount, onBugReport }) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isChildRoute = !ROOT_PAGES.includes(currentPageName);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(createPageUrl("Home"), { replace: true });
    }
  };

  const handleAction = (action) => {
    setDrawerOpen(false);
    setTimeout(() => action(), 150);
  };

  return (
    <header className="sticky top-0 z-40 bg-theme-surface/95 backdrop-blur-md border-b border-theme select-none"
      style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {isChildRoute ? (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-lg hover:bg-purple-50 active:bg-purple-100 transition-colors tap-target"
            >
              <ArrowLeft className="w-5 h-5 text-theme-primary" />
            </button>
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
          )}
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {isChildRoute ? (currentPageName || "").replace(/([A-Z])/g, ' $1').trim() : "Eventpix QR"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBugReport}
            className="p-2 rounded-lg hover:bg-orange-50 active:bg-orange-100 transition-colors tap-target"
          >
            <Bug className="w-5 h-5 text-orange-500" />
          </button>

          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center tap-target">
                <span className="font-bold text-gray-600 text-sm">
                  {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                </span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="px-4" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
              <DrawerHeader className="px-0 pt-4 pb-2">
                <DrawerTitle className="text-left">Profile</DrawerTitle>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="font-bold text-white text-lg">
                      {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-theme-primary">{currentUser?.full_name || 'User'}</p>
                    <p className="text-xs text-theme-secondary">{currentUser?.email || ''}</p>
                  </div>
                </div>
              </DrawerHeader>

              <Separator className="my-2" />

              <p className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">Tutorials</p>
              <button onClick={() => handleAction(() => onOpenOnboarding('host'))} className="flex items-center gap-3 w-full py-3 text-sm text-theme-primary active:bg-purple-50 dark:active:bg-purple-900/20 rounded-lg px-2 tap-target">
                <HelpCircle className="w-5 h-5 text-purple-500" /> Host Tutorial
              </button>
              <button onClick={() => handleAction(() => onOpenOnboarding('guest'))} className="flex items-center gap-3 w-full py-3 text-sm text-theme-primary active:bg-purple-50 dark:active:bg-purple-900/20 rounded-lg px-2 tap-target">
                <HelpCircle className="w-5 h-5 text-purple-500" /> Guest Tutorial
              </button>

              <Separator className="my-2" />

              <button onClick={() => handleAction(onLogout)} className="flex items-center gap-3 w-full py-3 text-sm text-red-600 active:bg-red-50 rounded-lg px-2 tap-target">
                <LogOut className="w-5 h-5" /> Log Out
              </button>
              <button onClick={() => handleAction(onDeleteAccount)} className="flex items-center gap-3 w-full py-3 text-sm text-red-600 active:bg-red-50 rounded-lg px-2 tap-target">
                <Trash2 className="w-5 h-5" /> Delete Account
              </button>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
}