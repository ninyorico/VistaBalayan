import { useState, useEffect } from "react";
import { Search, Eye, Download, CheckCircle, Clock, XCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface Submission {
  id: string;
  type: "Visitor Report" | "Accommodation Report";
  month: string;
  dataSummary: string;
  submittedDate: string;
  status: string;
}

export default function SubmissionHistory() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }
    
    // Fetch visitor reports
    const { data: visitorData } = await supabase
      .from("visitor_reports")
      .select("*")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false });

    // Fetch accommodation reports
    const { data: accommodationData } = await supabase
      .from("accommodation_reports")
      .select("*")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false });

    const visitorSubmissions: Submission[] = (visitorData || []).map((item: any) => ({
      id: item.id,
      type: "Visitor Report",
      month: new Date(item.report_date).toLocaleString('default', { month: 'long', year: 'numeric' }),
      dataSummary: `${item.total_guests || 0} visitors`,
      submittedDate: new Date(item.created_at).toISOString().slice(0, 10),
      status: item.status,
    }));

    const accommodationSubmissions: Submission[] = (accommodationData || []).map((item: any) => ({
      id: item.id,
      type: "Accommodation Report",
      month: new Date(item.report_date).toLocaleString('default', { month: 'long', year: 'numeric' }),
      dataSummary: `${((item.total_occupied_rooms || 0) / (item.total_rooms || 1) * 100).toFixed(0)}% occupancy`,
      submittedDate: new Date(item.created_at).toISOString().slice(0, 10),
      status: item.status,
    }));

    const combined = [...visitorSubmissions, ...accommodationSubmissions].sort(
      (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
    );
    
    setSubmissions(combined);
    setLoading(false);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = sub.month.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || sub.type === filterType;
    const matchesStatus = filterStatus === "all" || sub.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalSubmissions = submissions.length;
  const approvedCount = submissions.filter((s) => s.status === "approved").length;
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const rejectedCount = submissions.filter((s) => s.status === "rejected").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1CA7C9] mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your submissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Submission History</h1>
        <p className="text-gray-600 mt-1">View and manage your report submission history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Total Submissions</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalSubmissions}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Approved</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-yellow-600" />
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-gray-600">Rejected</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by month..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option value="all">All Types</option>
              <option value="Visitor Report">Visitor Report</option>
              <option value="Accommodation Report">Accommodation Report</option>
            </select>
          </div>
          <div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Report Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data Summary</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Submitted Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{submission.type}</td>
                    <td className="px-6 py-4 text-gray-600">{submission.month}</td>
                    <td className="px-6 py-4 text-gray-900">{submission.dataSummary}</td>
                    <td className="px-6 py-4 text-gray-600">{submission.submittedDate}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        submission.status === "approved" ? "bg-green-100 text-green-700" :
                        submission.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                      }`}>
                        {submission.status === "approved" && <CheckCircle className="w-3 h-3" />}
                        {submission.status === "pending" && <Clock className="w-3 h-3" />}
                        {submission.status === "rejected" && <XCircle className="w-3 h-3" />}
                        {submission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No submissions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}