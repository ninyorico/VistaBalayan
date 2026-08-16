import { useState, useEffect } from "react";
import { Search, Eye, Download, CheckCircle, Clock, XCircle, ChevronDown, CalendarDays } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { formatMonthYear, groupStaffSubmissions, StaffSubmissionSummary } from "../../../lib/reportMetrics";
import { canSubmitAccommodationReport, canSubmitVisitorReport } from "../../../lib/establishmentReportForms";

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
  const [allowedForms, setAllowedForms] = useState({ visitor: false, accommodation: false });
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("establishment_id")
      .eq("id", user.id)
      .maybeSingle();

    let canSeeVisitor = false;
    let canSeeAccommodation = false;

    if (profileData?.establishment_id) {
      const { data: establishment } = await supabase
        .from("establishments")
        .select("type,total_rooms")
        .eq("id", profileData.establishment_id)
        .maybeSingle();

      canSeeVisitor = canSubmitVisitorReport(establishment);
      canSeeAccommodation = canSubmitAccommodationReport(establishment);
    }

    setAllowedForms({ visitor: canSeeVisitor, accommodation: canSeeAccommodation });

    const [{ data: visitorData }, { data: accommodationData }] = await Promise.all([
      canSeeVisitor
        ? supabase
            .from("visitor_reports")
            .select("id, report_date, created_at, status, total_guests")
            .eq("submitted_by", user.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      canSeeAccommodation
        ? supabase
            .from("accommodation_reports")
            .select("id, report_date, created_at, status, total_rooms, total_occupied_rooms, total_check_ins, total_guest_nights")
            .eq("submitted_by", user.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

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

  const compactLimit = 6;
  const visibleSubmissions = showAll ? filteredSubmissions : filteredSubmissions.slice(0, compactLimit);
  const hiddenSubmissionCount = Math.max(filteredSubmissions.length - compactLimit, 0);

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
            {allowedForms.visitor && <option value="Visitor Report">Resort</option>}
            {allowedForms.accommodation && <option value="Accommodation Report">Hotels</option>}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#0F4C75] focus:bg-white focus:ring-4 focus:ring-cyan-100">
            <option value="all">All status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Recent submissions</h2>
            <p className="text-sm text-slate-500">
              Showing {visibleSubmissions.length} of {filteredSubmissions.length} matching records.
            </p>
          </div>
          {hiddenSubmissionCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#0F4C75] hover:text-[#0F4C75]"
            >
              {showAll ? "Show fewer" : `Show ${hiddenSubmissionCount} more`}
            </button>
          )}
        </div>

        {filteredSubmissions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {visibleSubmissions.map((submission) => {
              const isExpanded = expandedSubmissionId === submission.id;
              const StatusIcon = submission.status === "approved" ? CheckCircle : submission.status === "rejected" ? XCircle : Clock;

              return (
                <article key={submission.id} className="bg-white transition hover:bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() => setExpandedSubmissionId(isExpanded ? null : submission.id)}
                    className="grid w-full grid-cols-1 gap-3 px-5 py-4 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    aria-expanded={isExpanded}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#0F4C75]/10 px-2.5 py-1 text-xs font-bold text-[#0F4C75]">
                          {getReportTypeLabel(submission.type)}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusStyles[submission.status as keyof typeof statusStyles] || statusStyles.pending}`}>
                          <StatusIcon className="h-3 w-3" />
                          {submission.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <h3 className="text-lg font-bold tracking-[-0.02em] text-slate-950">{formatMonthYear(submission.reportDate)}</h3>
                        <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                        <p className="truncate text-sm font-medium text-slate-600">{submission.dataSummary}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CalendarDays className="h-4 w-4" />
                        <span>{submission.submittedDate}</span>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-slate-400 transition ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mx-5 mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                        <div>
                          <p className="font-semibold text-slate-500">Report type</p>
                          <p className="mt-1 font-bold text-slate-950">{getReportTypeLabel(submission.type)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500">Report month</p>
                          <p className="mt-1 font-bold text-slate-950">{formatMonthYear(submission.reportDate)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500">Submitted</p>
                          <p className="mt-1 font-bold text-slate-950">{submission.submittedDate}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Data summary</p>
                        <p className="mt-2 text-sm font-medium text-slate-800">{submission.dataSummary}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button className="inline-flex items-center gap-2 rounded-2xl bg-[#0F4C75] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b3d61]" aria-label="View submission">
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" aria-label="Download submission">
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-500">No submissions found.</p>
          </div>
        )}
      </section>
    </div>
  );
}
