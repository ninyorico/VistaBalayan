import { useState, useEffect } from "react";
import { Search, Eye, Download, CheckCircle, Clock, XCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { formatMonthYear, groupStaffSubmissions, StaffSubmissionSummary } from "../../../lib/reportMetrics";

const statusStyles = {
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

const getReportTypeLabel = (type: string) =>
  type === "Visitor Report" ? "Resort" : type === "Accommodation Report" ? "Hotels" : type;

export default function SubmissionHistory() {
  const [submissions, setSubmissions] = useState<StaffSubmissionSummary[]>([]);
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

    const { data: visitorData } = await supabase
      .from("visitor_reports")
      .select("id, report_date, created_at, status, total_guests")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false });

    const { data: accommodationData } = await supabase
      .from("accommodation_reports")
      .select("id, report_date, created_at, status, total_rooms, total_occupied_rooms, total_check_ins, total_guest_nights")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false });

    setSubmissions(groupStaffSubmissions(visitorData || [], accommodationData || []));
    setLoading(false);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const month = formatMonthYear(sub.reportDate).toLowerCase();
    const matchesSearch = month.includes(searchTerm.toLowerCase()) || sub.dataSummary.toLowerCase().includes(searchTerm.toLowerCase());
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
      <div className="grid min-h-[60vh] place-items-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-b-[#0F4C75]"></div>
          <p className="mt-4 text-sm font-medium text-slate-600">Loading your submissions</p>
        </div>
      </div>
    );
  }

  const summaryCards = [
    { label: "Total submissions", value: totalSubmissions, icon: CheckCircle, tone: "text-sky-700 bg-sky-50 ring-sky-100" },
    { label: "Approved", value: approvedCount, icon: CheckCircle, tone: "text-emerald-700 bg-emerald-50 ring-emerald-100" },
    { label: "Pending", value: pendingCount, icon: Clock, tone: "text-amber-700 bg-amber-50 ring-amber-100" },
    { label: "Rejected", value: rejectedCount, icon: XCircle, tone: "text-rose-700 bg-rose-50 ring-rose-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950">Submission history</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-950">{card.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${card.tone}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by month or summary"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#0F4C75] focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />
            </div>
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#0F4C75] focus:bg-white focus:ring-4 focus:ring-cyan-100">
            <option value="all">All types</option>
            <option value="Visitor Report">Resort</option>
            <option value="Accommodation Report">Hotels</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#0F4C75] focus:bg-white focus:ring-4 focus:ring-cyan-100">
            <option value="all">All status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Report type</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Month</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Data summary</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Submitted date</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="transition hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-semibold text-slate-950">{getReportTypeLabel(submission.type)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatMonthYear(submission.reportDate)}</td>
                    <td className="px-6 py-4 text-slate-900">{submission.dataSummary}</td>
                    <td className="px-6 py-4 text-slate-600">{submission.submittedDate}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusStyles[submission.status as keyof typeof statusStyles] || statusStyles.pending}`}>
                        {submission.status === "approved" && <CheckCircle className="h-3 w-3" />}
                        {submission.status === "pending" && <Clock className="h-3 w-3" />}
                        {submission.status === "rejected" && <XCircle className="h-3 w-3" />}
                        {submission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="rounded-xl p-2 text-[#0F4C75] transition hover:bg-cyan-50" aria-label="View submission">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100" aria-label="Download submission">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
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
