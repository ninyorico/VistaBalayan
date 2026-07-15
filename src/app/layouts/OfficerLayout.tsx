import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Building2,
  Users,
  Bed,
  FileText,
  BarChart3,
  Brain,
  UserCog,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
// import { useAuth } from "../../contexts/AuthContext"; // TEMPORARILY REMOVED

const menuItems = [
  { path: "/officer", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/officer/establishments", icon: Building2, label: "Establishments & Users" },
  { path: "/officer/visitor-monitoring", icon: Users, label: "Visitor Monitoring" },
  { path: "/officer/accommodation-monitoring", icon: Bed, label: "Accommodation Monitoring" },
  { path: "/officer/reports", icon: FileText, label: "Reports" },
  { path: "/officer/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/officer/ai-insights", icon: Brain, label: "AI Insights" },
];

export default function OfficerLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // TEMPORARY hardcoded profile
  const profile = { full_name: "Municipal Tourism Officer", email: "officer@balayan.gov" };
  
const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = "/admin/login";
};

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return "MTO";
  };

  return (
    <div className="min-h-screen bg-[#F2F5F7]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 lg:top-0 h-full lg:h-full bg-white border-r border-[#D9E2EC] transition-all duration-300 shadow-xl ${
          sidebarOpen ? "w-64 z-50" : "w-0 lg:w-64 z-40"
        } overflow-hidden`}
      >
        <div className="p-6 border-b border-[#D9E2EC] bg-gradient-to-r from-[#1293B8] to-[#1CA7C9]">
          <h1 className="text-xl font-bold text-white">VistaBalayan</h1>
          <p className="text-sm text-white/80 mt-1">Tourism Officer Portal</p>
        </div>

        <nav className="p-4 space-y-1.5 overflow-y-auto h-[calc(100vh-130px)] lg:h-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/officer"}
              onClick={closeSidebarOnMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-[#1293B8] to-[#1CA7C9] text-white shadow-md"
                    : "text-[#6B7280] hover:bg-[#F2F5F7] hover:text-[#0F172A]"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-semibold text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Navbar */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-[#D9E2EC] sticky top-0 z-40 shadow-sm">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2.5 bg-gradient-to-r from-[#1293B8] to-[#1CA7C9] hover:from-[#0F4C75] hover:to-[#1293B8] rounded-xl transition-all duration-200 shadow-md"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>

              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search analytics..."
                  className="pl-10 pr-4 py-2.5 bg-[#F2F5F7] border border-[#D9E2EC] rounded-xl focus:ring-2 focus:ring-[#1CA7C9] focus:border-[#1CA7C9] outline-none w-40 lg:w-80 text-sm transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="relative p-2.5 hover:bg-[#F2F5F7] rounded-xl transition-colors"
                >
                  <Bell className="w-5 h-5 text-[#6B7280]" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#F59E0B] rounded-full ring-2 ring-white"></span>
                </button>

                {/* Notification Dropdown */}
                {notificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[#D9E2EC] z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-[#D9E2EC]">
                      <h3 className="text-sm font-semibold text-[#0F172A]">Notifications</h3>
                    </div>
                    <div className="py-2">
                      <div className="px-4 py-3 hover:bg-[#F2F5F7] transition-colors border-l-4 border-[#F59E0B]">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-[#FEF3C7] rounded-lg flex items-center justify-center flex-shrink-0">
                            <Bell className="w-4 h-4 text-[#F59E0B]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#0F172A]">Pending Review</p>
                            <p className="text-xs text-[#6B7280] mt-1">2 new establishment reports awaiting your review</p>
                            <p className="text-xs text-[#F59E0B] font-medium mt-1">1 hour ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-3 hover:bg-[#F2F5F7] transition-colors border-l-4 border-[#3B82F6]">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-[#DBEAFE] rounded-lg flex items-center justify-center flex-shrink-0">
                            <Bell className="w-4 h-4 text-[#3B82F6]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#0F172A]">Monthly Report Available</p>
                            <p className="text-xs text-[#6B7280] mt-1">May 2026 consolidated tourism report is ready for export</p>
                            <p className="text-xs text-[#6B7280] font-medium mt-1">3 hours ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-3 hover:bg-[#F2F5F7] transition-colors border-l-4 border-[#22C55E]">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-[#D1FAE5] rounded-lg flex items-center justify-center flex-shrink-0">
                            <Bell className="w-4 h-4 text-[#22C55E]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#0F172A]">New Establishment Registered</p>
                            <p className="text-xs text-[#6B7280] mt-1">Balayan Heritage Park has been added to the system</p>
                            <p className="text-xs text-[#6B7280] font-medium mt-1">1 day ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-t border-[#D9E2EC]">
                      <button className="w-full text-center text-sm font-medium text-[#1CA7C9] hover:text-[#0F4C75] transition-colors">
                        View All Notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-8 w-px bg-[#D9E2EC]"></div>

              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 sm:gap-3 hover:bg-[#F2F5F7] rounded-xl transition-colors px-2 py-1.5"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#1293B8] to-[#26B6D4] rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md">
                    {getInitials()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-semibold text-[#0F172A]">
                      {profile?.full_name || 'Municipal Tourism Officer'}
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      {profile?.email || 'officer@balayan.gov'}
                    </div>
                  </div>
                </button>

                {/* Profile Dropdown */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#D9E2EC] py-2 z-50">
                    <button
                      onClick={() => {
                        navigate("/officer/settings");
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F2F5F7] transition-colors text-left"
                    >
                      <Settings className="w-5 h-5 text-[#6B7280]" />
                      <span className="text-sm font-medium text-[#0F172A]">Settings</span>
                    </button>
                    <div className="border-t border-[#D9E2EC] my-2"></div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}