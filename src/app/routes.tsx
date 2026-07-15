import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import OfficerLayout from "./layouts/OfficerLayout";
import StaffLayout from "./layouts/StaffLayout";
// import { ProtectedRoute } from "./components/ProtectedRoute"; // <-- commented out for now
import OfficerDashboard from "./pages/officer/Dashboard";
import Establishments from "./pages/officer/Establishments";
import VisitorMonitoring from "./pages/officer/VisitorMonitoring";
import AccommodationMonitoring from "./pages/officer/AccommodationMonitoring";
import Reports from "./pages/officer/Reports";
import Analytics from "./pages/officer/Analytics";
import AIInsights from "./pages/officer/AIInsights";
import Settings from "./pages/officer/Settings";
import StaffDashboard from "./pages/staff/Dashboard";
import SubmitVisitorReport from "./pages/staff/SubmitVisitorReport";
import SubmitAccommodationReport from "./pages/staff/SubmitAccommodationReport";
import SubmissionHistory from "./pages/staff/SubmissionHistory";
import StaffAnalytics from "./pages/staff/Analytics";
import StaffAIInsights from "./pages/staff/AIInsights";
import Profile from "./pages/staff/Profile";
import NotFound from "./pages/NotFound";
import ManageListing from "./pages/staff/ManageListing";
import TourismHome from "./pages/public/TourismHome";

export const router = createBrowserRouter([
  // Public Routes (No login required)
  {
    path: "/",
    Component: TourismHome,  // Public tourism website - home page
  },
  {
    path: "/explore",
    Component: TourismHome,  // Alias for the tourism page
  },

  // Admin Login
  {
    path: "/admin/login",
    Component: Login,
  },

  // Officer Routes (Admin System)
  {
    path: "/officer",
    Component: OfficerLayout,
    children: [
      { index: true, Component: OfficerDashboard },
      { path: "establishments", Component: Establishments },
      { path: "visitor-monitoring", Component: VisitorMonitoring },
      { path: "accommodation-monitoring", Component: AccommodationMonitoring },
      { path: "reports", Component: Reports },
      { path: "analytics", Component: Analytics },
      { path: "ai-insights", Component: AIInsights },
      { path: "settings", Component: Settings },
    ],
  },

  // Staff Routes (Admin System)
  {
    path: "/staff",
    Component: StaffLayout,
    children: [
      { index: true, Component: StaffDashboard },
      { path: "submit-visitor-report", Component: SubmitVisitorReport },
      { path: "submit-accommodation-report", Component: SubmitAccommodationReport },
      { path: "submission-history", Component: SubmissionHistory },
      { path: "analytics", Component: StaffAnalytics },
      { path: "ai-insights", Component: StaffAIInsights },
      { path: "profile", Component: Profile },
      { path: "manage-listing", Component: ManageListing },
    ],
  },

  // 404 - Not Found
  {
    path: "*",
    Component: NotFound,
  },
]);