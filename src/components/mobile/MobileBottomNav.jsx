import React, { useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Plus, Camera, CreditCard } from "lucide-react";

const navItems = [
  { title: "Home", url: createPageUrl("Home"), icon: Home },
  { title: "Create", url: createPageUrl("CreateEvent"), icon: Plus },
  { title: "Browse", url: createPageUrl("Browse"), icon: Camera },
  { title: "Pricing", url: createPageUrl("Pricing"), icon: CreditCard },
];

// Track last active tab so child screens know which tab to return to
let lastActiveTab = createPageUrl("Home");

export function getLastActiveTab() {
  return lastActiveTab;
}

// Persist scroll positions per tab path using sessionStorage
function saveScrollPosition(path) {
  try {
    sessionStorage.setItem(`tab_scroll_${path}`, String(window.scrollY || 0));
  } catch (_) { /* quota exceeded – ignore */ }
}

function restoreScrollPosition(path) {
  try {
    const saved = sessionStorage.getItem(`tab_scroll_${path}`);
    if (saved !== null) {
      // Use requestAnimationFrame so the DOM has time to paint
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10));
      });
    }
  } catch (_) { /* ignore */ }
}

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastPathRef = useRef(location.pathname);

  // Update last active tab whenever we're on a root tab
  useEffect(() => {
    const isTabPage = navItems.some(item => item.url === location.pathname);
    if (isTabPage) {
      lastActiveTab = location.pathname;
    }

    // When arriving at a tab page, restore its scroll position
    if (isTabPage && lastPathRef.current !== location.pathname) {
      restoreScrollPosition(location.pathname);
    }

    lastPathRef.current = location.pathname;
  }, [location.pathname]);

  // Continuously save scroll position for current tab page
  useEffect(() => {
    const isTabPage = navItems.some(item => item.url === location.pathname);
    if (!isTabPage) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          saveScrollPosition(location.pathname);
          ticking = false;
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  const handleTabClick = useCallback((e, item, isActive) => {
    e.preventDefault();
    if (isActive) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Save current scroll before leaving
      saveScrollPosition(location.pathname);
      navigate(item.url, { replace: false });
    }
  }, [location.pathname, navigate]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-theme-surface/95 backdrop-blur-md border-t border-theme shadow-lg select-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <button
              key={item.title}
              onClick={(e) => handleTabClick(e, item, isActive)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[60px] tap-target ${
                isActive
                  ? "text-purple-700 dark:text-purple-400"
                  : "text-theme-secondary active:text-purple-600"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-purple-600 dark:text-purple-400" : ""}`} />
              <span className={`text-[10px] font-medium ${isActive ? "text-purple-700 dark:text-purple-400" : ""}`}>
                {item.title}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-purple-600 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}