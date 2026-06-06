import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  FileUp,
  Bed,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);

  useEffect(() => {
    loadUserAndData();
  }, []);

  const loadUserAndData = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("No user found, redirecting to login");
      window.location.href = "/";
      return;
    }
    
    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    setProfile(profileData);
    
    if (profileData) {
      // Fetch visitor reports for this user
      const { data: visitorData } = await supabase
        .from("visitor_reports")
        .select("*")
        .eq("submitted_by", profileData.id);

      // Fetch accommodation reports for this user
      const { data: accommodationData } = await supabase
        .from("accommodation_reports")
        .select("*")
        .eq("submitted_by", profileData.id);

      const allReports = [...(visitorData || []), ...(accommodationData || [])];
      
      // Calculate stats
      const total = allReports.length;
      const pending = allReports.filter(r => r.status === "pending").length;
      const approved = allReports.filter(r => r.status === "approved").length;
      const rejected = allReports.filter(r => r.status === "rejected").length;
      
      setStats({ total, pending, approved, rejected });
      
      // Get recent submissions
      const recent = allReports
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(r => ({
          id: r.id,
          type: r.total_rooms !== undefined ? "Accommodation Report" : "Visitor Report",
          date: new Date(r.created_at).toISOString().slice(0, 10),
          status: r.status,
          data: r.total_guests ? `${r.total_guests} visitors` : 
                r.total_occupied_rooms ? `${Math.round((r.total_occupied_rooms / r.total_rooms) * 100)}% occupancy` : "",
        }));
      
      setRecentSubmissions(recent);
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  const submissionStats = [
    { title: "Total Submissions", value: stats.total.toString(), icon: CheckCircle, color: "blue" },
    { title: "Pending Review", value: stats.pending.toString(), icon: Clock, color: "yellow" },
    { title: "Rejected", value: stats.rejected.toString(), icon: AlertCircle, color: "red" },
    { title: "Approval Rate", value: `${approvalRate}%`, icon: TrendingUp, color: "green" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1CA7C9] mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#1293B8] to-[#1CA7C9] text-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome to VistaBalayan Portal
        </h1>
        <p className="text-white/90">
          Submit your visitor and accommodation reports to help monitor tourism in Balayan, Batangas
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => navigate("/staff/submit-visitor-report")}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileUp className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Submit Visitor Report</h3>
              <p className="text-sm text-gray-600 mt-1">Report daily visitor data for your establishment</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate("/staff/submit-accommodation-report")}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bed className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Submit Accommodation Report</h3>
              <p className="text-sm text-gray-600 mt-1">Report room occupancy and guest information</p>
            </div>
          </div>
        </button>
      </div>

      {/* Submission Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {submissionStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Submissions</h3>
          <div className="space-y-3">
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{submission.type}</p>
                    <p className="text-sm text-gray-600">{submission.data}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        submission.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : submission.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {submission.status === "approved" && <CheckCircle className="w-3 h-3" />}
                      {submission.status === "pending" && <Clock className="w-3 h-3" />}
                      {submission.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{submission.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No submissions yet. Start by submitting a report.</p>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Daily Report Deadline</p>
                <p className="text-sm text-gray-600 mt-1">Submit daily reports before end of day</p>
                <p className="text-sm text-blue-600 font-medium mt-1">Submit now to avoid delays</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications & Reminders</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Daily Report Reminder</p>
              <p className="text-sm text-gray-600 mt-1">
                Don't forget to submit your daily visitor and accommodation reports.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}