import { useState, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Eye,
  X,
  TrendingUp,
  TrendingDown,
  Users,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";

interface Submission {
  id: string;
  establishment: string;
  type: "Visitor Report" | "Accommodation Report";
  reportDate: string;
  visitors: number;
  submitted: string;
  status: string;
  reviewedBy?: string;
  reviewedDate?: string;
  notes?: string;
  details: any;
}

// Hardcoded user ID for now (replace with your actual user ID)
const CURRENT_USER_ID = "a71b14e7-c790-427a-b14b-0c34d4c796f9";

export default function Reports() {
  const [filterPeriod, setFilterPeriod] = useState("monthly");
  const [specificDate, setSpecificDate] = useState("");
  const [specificMonth, setSpecificMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Real chart data from database
  const [chartData, setChartData] = useState<any[]>([]);
  const [visitorStats, setVisitorStats] = useState({
    currentTotal: 0,
    previousTotal: 0,
    difference: 0,
    percentageChange: "0",
    isIncrease: true,
  });

const fetchSubmissions = async () => {
  setLoading(true);
  
  // Fetch visitor reports with establishment names
  const { data: visitorData, error: visitorError } = await supabase
    .from("visitor_reports")
    .select(`
      *,
      establishments!visitor_reports_establishment_id_fkey (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (visitorError) {
    console.error("Visitor reports error:", visitorError);
  }

  // Fetch accommodation reports with establishment names
  const { data: accommodationData, error: accError } = await supabase
    .from("accommodation_reports")
    .select(`
      *,
      establishments!accommodation_reports_establishment_id_fkey (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (accError) {
    console.error("Accommodation reports error:", accError);
  }

  console.log("Visitor data:", visitorData);
  console.log("Accommodation data:", accommodationData);

  // Helper function to get establishment name
  const getEstablishmentName = (item: any) => {
    if (item.establishments) {
      if (Array.isArray(item.establishments) && item.establishments.length > 0) {
        return item.establishments[0].name;
      } else if (item.establishments.name) {
        return item.establishments.name;
      }
    }
    return "Unknown";
  };

  // Format visitor reports
  const visitorSubmissions: Submission[] = (visitorData || []).map((item: any) => ({
    id: item.id,
    establishment: getEstablishmentName(item),
    type: "Visitor Report",
    reportDate: item.report_date,
    visitors: item.total_guests || 0,
    submitted: new Date(item.created_at).toISOString().slice(0, 10),
    status: item.status,
    reviewedBy: item.reviewed_by ? "Municipal Tourism Officer" : undefined,
    reviewedDate: item.reviewed_at ? new Date(item.reviewed_at).toISOString().slice(0, 10) : undefined,
    notes: item.notes,
    details: item,
  }));

  // Format accommodation reports
  const accommodationSubmissions: Submission[] = (accommodationData || []).map((item: any) => ({
    id: item.id,
    establishment: getEstablishmentName(item),
    type: "Accommodation Report",
    reportDate: item.report_date,
    visitors: item.total_check_ins || 0,
    submitted: new Date(item.created_at).toISOString().slice(0, 10),
    status: item.status,
    reviewedBy: item.reviewed_by ? "Municipal Tourism Officer" : undefined,
    reviewedDate: item.reviewed_at ? new Date(item.reviewed_at).toISOString().slice(0, 10) : undefined,
    notes: item.notes,
    details: item,
  }));

  const combined = [...visitorSubmissions, ...accommodationSubmissions].sort(
    (a, b) => new Date(b.submitted).getTime() - new Date(a.submitted).getTime()
  );
  setSubmissions(combined);
  setLoading(false);
};

  // Fetch real chart data based on selected period
  const fetchChartData = async () => {
    let startDate = "";
    let endDate = "";
    const today = new Date();
    
    switch (filterPeriod) {
      case "weekly":
        startDate = new Date(today.setDate(today.getDate() - 28)).toISOString().slice(0, 10);
        endDate = new Date().toISOString().slice(0, 10);
        break;
      case "monthly":
        startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().slice(0, 10);
        endDate = new Date().toISOString().slice(0, 10);
        break;
      case "quarterly":
        startDate = new Date(today.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
        endDate = new Date().toISOString().slice(0, 10);
        break;
      case "yearly":
        startDate = new Date(today.getFullYear() - 4, 0, 1).toISOString().slice(0, 10);
        endDate = new Date().toISOString().slice(0, 10);
        break;
    }

    const { data } = await supabase
      .from("visitor_reports")
      .select("report_date, total_guests")
      .eq("status", "approved")
      .gte("report_date", startDate)
      .lte("report_date", endDate)
      .order("report_date", { ascending: true });

    if (data && data.length) {
      // Group by period
      const grouped: Record<string, number> = {};
      data.forEach((item: any) => {
        let key = "";
        const date = new Date(item.report_date);
        if (filterPeriod === "weekly") {
          const week = Math.ceil(date.getDate() / 7);
          key = `Week ${week}`;
        } else if (filterPeriod === "monthly") {
          key = date.toLocaleString('default', { month: 'short' });
        } else if (filterPeriod === "quarterly") {
          key = `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
        } else {
          key = date.getFullYear().toString();
        }
        grouped[key] = (grouped[key] || 0) + (item.total_guests || 0);
      });

      const chartDataArray = Object.entries(grouped).map(([period, visitors]) => ({
        period,
        visitors,
      }));
      setChartData(chartDataArray);
      
      // Calculate stats (compare last period with previous)
      const currentTotal = chartDataArray[chartDataArray.length - 1]?.visitors || 0;
      const previousTotal = chartDataArray[chartDataArray.length - 2]?.visitors || 0;
      const difference = currentTotal - previousTotal;
      const percentageChange = previousTotal > 0 ? ((difference / previousTotal) * 100).toFixed(1) : "0";
      setVisitorStats({
        currentTotal,
        previousTotal,
        difference,
        percentageChange,
        isIncrease: difference > 0,
      });
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [filterPeriod]);

  const handleExport = () => {
    toast.success("Exporting report data...");
  };

  const handleViewDetails = (submission: Submission) => {
    setSelectedSubmission(submission);
    setReviewNotes(submission.notes || "");
    setShowDetailModal(true);
  };

  const handleApprove = async (id: string, type: string) => {
    const table = type === "Visitor Report" ? "visitor_reports" : "accommodation_reports";
    const { error } = await supabase
      .from(table)
      .update({
        status: "approved",
        reviewed_by: CURRENT_USER_ID,
        reviewed_at: new Date().toISOString(),
        notes: reviewNotes || null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to approve: " + error.message);
    } else {
      toast.success("Submission approved");
      fetchSubmissions();
      setShowDetailModal(false);
      setReviewNotes("");
    }
  };

  const handleReject = async (id: string, type: string) => {
    if (!reviewNotes) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    const table = type === "Visitor Report" ? "visitor_reports" : "accommodation_reports";
    const { error } = await supabase
      .from(table)
      .update({
        status: "rejected",
        reviewed_by: CURRENT_USER_ID,
        reviewed_at: new Date().toISOString(),
        notes: reviewNotes,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to reject: " + error.message);
    } else {
      toast.success("Submission rejected");
      fetchSubmissions();
      setShowDetailModal(false);
      setReviewNotes("");
    }
  };

  const filteredReports = submissions.filter((report) => {
    const matchesSearch = report.establishment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || report.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalSubmissions = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const approvedCount = submissions.filter((s) => s.status === "approved").length;
  const rejectedCount = submissions.filter((s) => s.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate and export tourism data reports</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Period</label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specific Date</label>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => {
                  setSpecificDate(e.target.value);
                  setSpecificMonth("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specific Month</label>
              <input
                type="month"
                value={specificMonth}
                onChange={(e) => {
                  setSpecificMonth(e.target.value);
                  setSpecificDate("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Establishment</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export to Excel
            </button>
          </div>
        </div>
      </div>

      {/* Report Chart - Real data from database */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Visitor Trends ({filterPeriod})
        </h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} name="Visitors" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">No data available for the selected period</div>
        )}
      </div>

      {/* Visitor Count Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Current Period Visitors</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{visitorStats.currentTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Previous Period Visitors</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{visitorStats.previousTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            {visitorStats.isIncrease ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
            <p className="text-sm text-gray-600">Change</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${visitorStats.isIncrease ? "text-green-600" : "text-red-600"}`}>
              {visitorStats.isIncrease ? "+" : ""}
              {visitorStats.difference.toLocaleString()}
            </p>
            <span className={`text-sm font-medium ${visitorStats.isIncrease ? "text-green-600" : "text-red-600"}`}>
              ({visitorStats.isIncrease ? "+" : ""}{visitorStats.percentageChange}%)
            </span>
          </div>
        </div>
      </div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Total Submissions</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalSubmissions}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-5 h-5 text-yellow-600" />
            <p className="text-sm text-gray-600">Pending Review</p>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Approved</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-gray-600">Rejected</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Establishment Submissions - Review & Verification</h3>
          <p className="text-sm text-gray-600 mt-1">Click "Review" to verify and approve/reject submissions</p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">Loading submissions...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Establishment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Report Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Report Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Visitors</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{report.establishment}</td>
                    <td className="px-6 py-4 text-gray-600">{report.type}</td>
                    <td className="px-6 py-4 text-gray-900">{report.reportDate}</td>
                    <td className="px-6 py-4 text-gray-900">{report.visitors}</td>
                    <td className="px-6 py-4 text-gray-600">{report.submitted}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        report.status === "approved" ? "bg-green-100 text-green-700" :
                        report.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleViewDetails(report)} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                        <Eye className="w-4 h-4" /> Review
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review Detail Modal */}
      {showDetailModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Review Submission</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedSubmission.establishment} - {selectedSubmission.type}
                </p>
              </div>
              <button onClick={() => { setShowDetailModal(false); setReviewNotes(""); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Establishment</label><p className="text-gray-900">{selectedSubmission.establishment}</p></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label><p className="text-gray-900">{selectedSubmission.type}</p></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label><p className="text-gray-900">{selectedSubmission.reportDate}</p></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Submitted On</label><p className="text-gray-900">{selectedSubmission.submitted}</p></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    selectedSubmission.status === "approved" ? "bg-green-100 text-green-700" :
                    selectedSubmission.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{selectedSubmission.status}</span>
                </div>
              </div>
              
              {selectedSubmission.status === "pending" && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Notes (required for rejection)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Add notes about this submission..."
                  />
                </div>
              )}
            </div>
            {selectedSubmission.status === "pending" && (
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => handleReject(selectedSubmission.id, selectedSubmission.type)} className="flex items-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => handleApprove(selectedSubmission.id, selectedSubmission.type)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
              </div>
            )}
            {selectedSubmission.status !== "pending" && (
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button onClick={() => { setShowDetailModal(false); setReviewNotes(""); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}