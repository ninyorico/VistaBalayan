import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  FileText,
  BarChart3,
  Brain,
  Settings,
  LogOut,
  Bell,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
// import { useAuth } from "../../contexts/AuthContext"; // TEMPORARILY REMOVED

const menuItems = [
  { path: "/officer", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/officer/establishments", icon: Building2, label: "Establishments" },
  { path: "/officer/report-monitoring", icon: ClipboardCheck, label: "Report Monitoring" },
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
    <div className="relative min-h-[100dvh] vb-shell-bg vb-noise text-[#2E3436]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 lg:top-0 h-full lg:h-full border-r border-[#BA5A5A]/15 vb-sidebar backdrop-blur-xl transition-all duration-300 ${
          sidebarOpen ? "w-64 z-50" : "w-0 lg:w-64 z-40"
        } overflow-hidden`}
      >
        <div className="border-b border-[#BA5A5A]/15 bg-[radial-gradient(circle_at_15%_5%,rgba(247,228,155,0.9),transparent_65%),linear-gradient(135deg,rgba(255,254,247,0.95),rgba(164,206,139,0.22))] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-[#BA5A5A] text-sm font-black text-[#FFF9DF] shadow-lg shadow-[#BA5A5A]/20 ring-4 ring-[#F7E49B]/70">VB</div>
            <div>
              <h1 className="text-xl font-extrabold tracking-[-0.04em] text-[#2E3436]">VistaBalayan</h1>
              <p className="mt-0.5 text-sm font-semibold text-[#BA5A5A]">Tourism Officer Portal</p>
            </div>
          </div>
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
                    ? "bg-[#BA5A5A] text-[#FFF9DF] shadow-lg shadow-[#BA5A5A]/18"
                    : "text-[#74665F] hover:bg-[#F7E49B]/55 hover:text-[#2E3436]"
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
        <header className="sticky top-0 z-40 border-b border-[#BA5A5A]/12 bg-[#FFF9DF]/80 shadow-sm shadow-[#6F3F3F]/5 backdrop-blur-xl">
          <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-2xl bg-[#BA5A5A] p-2.5 shadow-lg shadow-[#BA5A5A]/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#A94E4E] active:translate-y-0 lg:hidden"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>

            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="relative rounded-2xl p-2.5 transition-colors hover:bg-[#F7E49B]/55 vb-focus-ring"
                >
                  <Bell className="w-5 h-5 text-[#74665F]" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#BA5A5A] rounded-full ring-2 ring-[#FFF9DF]"></span>
                </button>

                {/* Notification Dropdown */}
                {notificationOpen && (
                  <div className="absolute right-0 z-50 mt-2 max-h-96 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-[#BA5A5A]/15 bg-[#FFFEF7] shadow-xl shadow-[#6F3F3F]/12">
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

              <div className="h-8 w-px bg-[#BA5A5A]/15"></div>

              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 rounded-2xl px-2 py-1.5 transition-colors hover:bg-[#F7E49B]/55 sm:gap-3 vb-focus-ring"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#86BCBD] text-xs font-extrabold text-[#2E3436] shadow-md ring-2 ring-[#F7E49B] sm:h-10 sm:w-10 sm:text-sm">
                    {getInitials()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-semibold text-[#2E3436]">
                      {profile?.full_name || 'Municipal Tourism Officer'}
                    </div>
                    <div className="text-xs text-[#74665F]">
                      {profile?.email || 'officer@balayan.gov'}
                    </div>
                  </div>
                </button>

                {/* Profile Dropdown */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-3xl border border-[#BA5A5A]/15 bg-[#FFFEF7] py-2 shadow-xl shadow-[#6F3F3F]/12">
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
        <main className="relative z-[1] mx-auto w-full max-w-[1500px] p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}