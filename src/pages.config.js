/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIAgenda from './pages/AIAgenda';
import AIPlanner from './pages/AIPlanner';
import AdminDashboard from './pages/AdminDashboard';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import Analytics from './pages/Analytics';
import ArticleDetail from './pages/ArticleDetail';
import Browse from './pages/Browse';
import CreateEvent from './pages/CreateEvent';
import EnhancedAIPlanner from './pages/EnhancedAIPlanner';
import Enterprise from './pages/Enterprise';
import EventGallery from './pages/EventGallery';
import EventReviews from './pages/EventReviews';
import FeatureFlags from './pages/FeatureFlags';
import FollowUpManager from './pages/FollowUpManager';
import GameHostDashboard from './pages/GameHostDashboard';
import GameManagement from './pages/GameManagement';
import HelpCenter from './pages/HelpCenter';
import Home from './pages/Home';
import LandingPage from './pages/LandingPage';
import ManageEvent from './pages/ManageEvent';
import PaymentCancel from './pages/PaymentCancel';
import PaymentSuccess from './pages/PaymentSuccess';
import Pricing from './pages/Pricing';
import PrintShop from './pages/PrintShop';
import SeatingChart from './pages/SeatingChart';
import SelectPrintProducts from './pages/SelectPrintProducts';
import ShareCredits from './pages/ShareCredits';
import Slideshow from './pages/Slideshow';
import SmartCollections from './pages/SmartCollections';
import SocialMediaManager from './pages/SocialMediaManager';
import TVMode from './pages/TVMode';
import TicketConfirmation from './pages/TicketConfirmation';
import TicketScanner from './pages/TicketScanner';
import Timeline from './pages/Timeline';
import VideoSlideshow from './pages/VideoSlideshow';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAgenda": AIAgenda,
    "AIPlanner": AIPlanner,
    "AdminDashboard": AdminDashboard,
    "AdvancedAnalytics": AdvancedAnalytics,
    "Analytics": Analytics,
    "ArticleDetail": ArticleDetail,
    "Browse": Browse,
    "CreateEvent": CreateEvent,
    "EnhancedAIPlanner": EnhancedAIPlanner,
    "Enterprise": Enterprise,
    "EventGallery": EventGallery,
    "EventReviews": EventReviews,
    "FeatureFlags": FeatureFlags,
    "FollowUpManager": FollowUpManager,
    "GameHostDashboard": GameHostDashboard,
    "GameManagement": GameManagement,
    "HelpCenter": HelpCenter,
    "Home": Home,
    "LandingPage": LandingPage,
    "ManageEvent": ManageEvent,
    "PaymentCancel": PaymentCancel,
    "PaymentSuccess": PaymentSuccess,
    "Pricing": Pricing,
    "PrintShop": PrintShop,
    "SeatingChart": SeatingChart,
    "SelectPrintProducts": SelectPrintProducts,
    "ShareCredits": ShareCredits,
    "Slideshow": Slideshow,
    "SmartCollections": SmartCollections,
    "SocialMediaManager": SocialMediaManager,
    "TVMode": TVMode,
    "TicketConfirmation": TicketConfirmation,
    "TicketScanner": TicketScanner,
    "Timeline": Timeline,
    "VideoSlideshow": VideoSlideshow,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};