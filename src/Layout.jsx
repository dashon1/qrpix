import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, Home, Plus, LifeBuoy, Briefcase, CreditCard, Shield, Mail, LogOut, Printer, HelpCircle, Bug, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import TutorialDialog from "./components/tour/TutorialDialog";
import LeadCaptureDialog from "./components/forms/LeadCaptureDialog";
import OnboardingDialog from "./components/tour/OnboardingDialog";
import BugReportDialog from "./components/forms/BugReportDialog";
import MobileBottomNav from "./components/mobile/MobileBottomNav";
import MobileHeader from "./components/mobile/MobileHeader";
import DeleteAccountDialog from "./components/mobile/DeleteAccountDialog";
import { motion, AnimatePresence } from "framer-motion";

// Tab URLs used to determine slide direction
const TAB_URLS = [
  createPageUrl("Home"),
  createPageUrl("CreateEvent"),
  createPageUrl("Browse"),
  createPageUrl("Pricing"),
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

const AppLayout = ({ children, currentUser, currentPageName }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [showContact, setShowContact] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState('host');
  const [showBugReport, setShowBugReport] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const navigationItems = [
    { title: "My Events", url: createPageUrl("Home"), icon: Home },
    { title: "Create Event", url: createPageUrl("CreateEvent"), icon: Plus },
    { title: "Browse Events", url: createPageUrl("Browse"), icon: Camera },
    { title: "Print Shop", url: createPageUrl("PrintShop"), icon: Printer },
    { title: "Enterprise", url: createPageUrl("Enterprise"), icon: Briefcase },
    { title: "Pricing", url: createPageUrl("Pricing"), icon: CreditCard },
  ];

  if (currentUser && currentUser.role === 'admin') {
    navigationItems.push({
      title: 'Admin Dashboard',
      url: createPageUrl('AdminDashboard'),
      icon: Shield,
    });
  }

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = createPageUrl('LandingPage');
  };

  const openOnboarding = (mode) => {
    setOnboardingMode(mode);
    setShowOnboarding(true);
  };

  const mainRef = React.useRef(null);
  const prevPathRef = React.useRef(location.pathname);
  const [slideDirection, setSlideDirection] = React.useState(0); // -1 left, 0 none, 1 right

  // Determine slide direction when path changes (mobile only)
  React.useEffect(() => {
    const prev = prevPathRef.current;
    const curr = location.pathname;
    prevPathRef.current = curr;

    if (!isMobile || prev === curr) {
      setSlideDirection(0);
      return;
    }

    const prevTabIndex = TAB_URLS.indexOf(prev);
    const currTabIndex = TAB_URLS.indexOf(curr);

    if (prevTabIndex >= 0 && currTabIndex >= 0) {
      // Both are tabs – slide in the direction of the tab order
      setSlideDirection(currTabIndex > prevTabIndex ? 1 : -1);
    } else if (prevTabIndex >= 0 && currTabIndex < 0) {
      // Going from a tab to a child page – slide right (forward)
      setSlideDirection(1);
    } else if (prevTabIndex < 0 && currTabIndex >= 0) {
      // Going from a child page back to a tab – slide left (back)
      setSlideDirection(-1);
    } else {
      setSlideDirection(0);
    }
  }, [location.pathname, isMobile]);

  // ─── MOBILE LAYOUT ───
  if (isMobile) {
    return (
      <>
        <style>{`
          :root {
            --primary: 271 91% 65%;
            --primary-foreground: 0 0% 100%;
          }
        `}</style>
        <div className="min-h-screen flex flex-col bg-theme-main">
          <MobileHeader
            currentUser={currentUser}
            currentPageName={currentPageName}
            onLogout={handleLogout}
            onOpenOnboarding={openOnboarding}
            onDeleteAccount={() => setShowDeleteAccount(true)}
            onBugReport={() => setShowBugReport(true)}
          />
          <main ref={mainRef} className="flex-1 overflow-auto pb-20">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentPageName}
                  initial={slideDirection !== 0 ? { opacity: 0, x: slideDirection * 60 } : { opacity: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={slideDirection !== 0 ? { opacity: 0, x: slideDirection * -60 } : { opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          <MobileBottomNav />
        </div>
        <LeadCaptureDialog
          open={showContact}
          onOpenChange={setShowContact}
          title="Contact Us"
          description="Have a question or need help? Fill out the form below and we'll get back to you."
          source="Contact Us Button"
        />
        <OnboardingDialog
          open={showOnboarding}
          onOpenChange={setShowOnboarding}
          mode={onboardingMode}
        />
        <BugReportDialog
          open={showBugReport}
          onOpenChange={setShowBugReport}
          currentPageName={currentPageName}
        />
        <DeleteAccountDialog
          open={showDeleteAccount}
          onOpenChange={setShowDeleteAccount}
          currentUser={currentUser}
        />
      </>
    );
  }

  // ─── DESKTOP LAYOUT (unchanged sidebar) ───
  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary: 271 91% 65%;
          --primary-foreground: 0 0% 100%;
        }
        
        .floating-bug-button {
          position: fixed;
          bottom: calc(20px + env(safe-area-inset-bottom));
          right: 90px;
          z-index: 999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-theme-main">
        <Sidebar className="border-r border-purple-100 bg-white/80 backdrop-blur-sm flex flex-col">
          <SidebarHeader className="border-b border-purple-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Eventpix QR
                </h2>
                <p className="text-xs text-gray-500">Scan. Smile. Capture. Share.</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2 flex-1">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2 select-none">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                     <SidebarMenuButton
                      asChild 
                      className={`hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 rounded-lg ${
                        location.pathname.includes(createPageUrl('HelpCenter')) || location.pathname.includes(createPageUrl('ArticleDetail')) ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700' : ''
                      }`}
                    >
                      <Link to={createPageUrl("HelpCenter")} className="flex items-center gap-3 px-3 py-2 select-none">
                        <LifeBuoy className="w-5 h-5" />
                        <span className="font-medium">Help Center</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                     <SidebarMenuButton
                       onClick={() => setShowContact(true)}
                       className="hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3 px-3 py-2 select-none">
                        <Mail className="w-5 h-5" />
                        <span className="font-medium">Contact Us</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <div className="border-t border-purple-100 p-4">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-purple-50 rounded-lg transition-colors select-none">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="font-bold text-gray-600">
                                {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{currentUser.full_name || 'User'}</p>
                              <p className="text-xs text-gray-500 truncate">{currentUser.email || 'No Email'}</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Tutorials & Help</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openOnboarding('host')} className="gap-2">
                            <HelpCircle className="w-4 h-4" />
                            Host Tutorial
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openOnboarding('guest')} className="gap-2">
                            <HelpCircle className="w-4 h-4" />
                            Guest Tutorial
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openOnboarding('team')} className="gap-2">
                            <HelpCircle className="w-4 h-4" />
                            Team Tutorial
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-600">
                            <LogOut className="w-4 h-4" />
                            Log Out
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowDeleteAccount(true)} className="gap-2 text-red-600 focus:text-red-700">
                            <Trash2 className="w-4 h-4" />
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto">
            {children}
          </div>
          
          {/* Floating Bug Report Button */}
          <Button
            onClick={() => setShowBugReport(true)}
            className="floating-bug-button bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-full w-14 h-14 p-0 flex items-center justify-center select-none"
            title="Report a Bug"
          >
            <Bug className="w-6 h-6 text-white" />
          </Button>
        </main>
      </div>
      <LeadCaptureDialog
        open={showContact}
        onOpenChange={setShowContact}
        title="Contact Us"
        description="Have a question or need help? Fill out the form below and we'll get back to you."
        source="Contact Us Button"
      />
      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        mode={onboardingMode}
      />
      <BugReportDialog
        open={showBugReport}
        onOpenChange={setShowBugReport}
        currentPageName={currentPageName}
      />
      <DeleteAccountDialog
        open={showDeleteAccount}
        onOpenChange={setShowDeleteAccount}
        currentUser={currentUser}
      />
    </SidebarProvider>
  );
};

// Pages that render WITHOUT any wrapper - instantly
const NO_LAYOUT_PAGES = ['LandingPage'];

// Guest pages - PUBLIC, render without layout
const GUEST_PAGES = ['EventGallery', 'Timeline', 'Slideshow', 'VideoSlideshow'];

// Public pages - show layout if logged in, otherwise no layout
const PUBLIC_PAGES = ['Browse', 'Enterprise', 'Pricing', 'HelpCenter', 'ArticleDetail'];

export default function Layout({ children, currentPageName }) {
  // ALL HOOKS AT TOP - always called
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check what type of page this is
  const isNoLayout = NO_LAYOUT_PAGES.includes(currentPageName);
  const isGuestPage = GUEST_PAGES.includes(currentPageName);
  const isPublicPage = PUBLIC_PAGES.includes(currentPageName);
  const needsAuth = !isNoLayout && !isGuestPage && !isPublicPage;

  // Auth check - runs once on mount
  useEffect(() => {
    // Skip auth for pages that don't need it
    if (isNoLayout || isGuestPage) {
      setLoading(false);
      return;
    }

    // Check auth for other pages
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []); // Only run once on mount

  // Redirect if needed - separate effect
  useEffect(() => {
    if (!needsAuth || loading || user !== null) return;
    
    // Need auth but no user - redirect
    base44.auth.redirectToLogin(window.location.href);
  }, [needsAuth, loading, user]);

  // 1. Landing Page - no layout, no auth
  if (isNoLayout) {
    return <>{children}</>;
  }

  // 2. Guest Pages (EventGallery, etc.) - no layout, no auth
  if (isGuestPage) {
    return <>{children}</>;
  }

  // 3. Still loading auth check
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-theme-main">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // 4. Public Pages (Browse, Pricing, etc.)
  if (isPublicPage) {
    // Show with layout if logged in
    if (user) {
      return <AppLayout currentUser={user} currentPageName={currentPageName}>{children}</AppLayout>;
    }
    // Show without layout if not logged in
    return <>{children}</>;
  }

  // 5. Authenticated Pages (Home, ManageEvent, etc.)
  
  // Redirecting to login
  if (user === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-theme-main">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-theme-secondary">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Logged in - show with layout
  return <AppLayout currentUser={user} currentPageName={currentPageName}>{children}</AppLayout>;
}