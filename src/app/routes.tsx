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

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/officer",
    Component: OfficerLayout,  // <-- direct layout, no protection
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
  {
    path: "/staff",
    Component: StaffLayout,   // <-- direct layout, no protection
    children: [
      { index: true, Component: StaffDashboard },
      { path: "submit-visitor-report", Component: SubmitVisitorReport },
      { path: "submit-accommodation-report", Component: SubmitAccommodationReport },
      { path: "submission-history", Component: SubmissionHistory },
      { path: "analytics", Component: StaffAnalytics },
      { path: "ai-insights", Component: StaffAIInsights },
      { path: "profile", Component: Profile },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);