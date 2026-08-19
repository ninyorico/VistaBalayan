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
  ArrowRight,
  History,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { groupStaffSubmissions } from "../../../lib/reportMetrics";
import { canSubmitAccommodationReport, canSubmitVisitorReport, getPrimaryReportFormLabel } from "../../../lib/establishmentReportForms";

const statusStyles = {
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [establishment, setEstablishment] = useState<any>(null);
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

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    setProfile(profileData);

    if (profileData) {
      if (profileData.establishment_id) {
        const { data: establishmentData } = await supabase
          .from("establishments")
          .select("name,type,total_rooms")
          .eq("id", profileData.establishment_id)
          .maybeSingle();
        setEstablishment(establishmentData);
      }

      const { data: visitorData } = await supabase
        .from("visitor_reports")
        .select("id, report_date, created_at, status, total_guests")
        .eq("submitted_by", profileData.id);

      const { data: accommodationData } = await supabase
        .from("accommodation_reports")
        .select("id, report_date, created_at, status, total_rooms, total_occupied_rooms, total_check_ins, total_guest_nights")
        .eq("submitted_by", profileData.id);

      const submissions = groupStaffSubmissions(visitorData || [], accommodationData || []);

      setStats({
        total: submissions.length,
        pending: submissions.filter((r) => r.status === "pending").length,
        approved: submissions.filter((r) => r.status === "approved").length,
        rejected: submissions.filter((r) => r.status === "rejected").length,
      });

      setRecentSubmissions(submissions.slice(0, 5));
    }

    setLoading(false);
  };

  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
  const showVisitorForm = canSubmitVisitorReport(establishment);
  const showAccommodationForm = canSubmitAccommodationReport(establishment);
  const reportFormLabel = getPrimaryReportFormLabel(establishment);

  const submissionStats = [
    { title: "Total submissions", value: stats.total.toString(), icon: CheckCircle, tone: "bg-sky-50 text-sky-700 ring-sky-100" },
    { title: "Pending review", value: stats.pending.toString(), icon: Clock, tone: "bg-amber-50 text-amber-700 ring-amber-100" },
    { title: "Rejected", value: stats.rejected.toString(), icon: AlertCircle, tone: "bg-rose-50 text-rose-700 ring-rose-100" },
    { title: "Approval rate", value: `${approvalRate}%`, icon: TrendingUp, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  ];

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-b-[#0E5A72]"></div>
          <p className="mt-4 text-sm font-medium text-[#5D6F73]">Loading establishment dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[2rem] border border-white/20 tourism-panel-dark shadow-[0_28px_90px_rgba(7,59,76,0.22)]">
        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-40 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">Establishment portal</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
                Submit your assigned {reportFormLabel.toLowerCase()} for Balayan tourism monitoring.
              </h1>
            </div>
            <button
              onClick={() => navigate("/staff/submission-history")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#0B2530] transition hover:bg-cyan-50 active:scale-[0.98]"
            >
              View history
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {showVisitorForm && (
          <button
            onClick={() => navigate("/staff/submit-visitor-report")}
            className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#0E5A72]/30 hover:shadow-lg active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0E5A72] text-white shadow-lg shadow-cyan-950/15">
                  <FileUp className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0B2530]">Resort</h3>
                  <p className="mt-1 text-sm leading-5 text-[#5D6F73]">Submit resort visitor arrivals by origin and count.</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#0E5A72]" />
            </div>
          </button>
        )}

        {showAccommodationForm && (
          <button
            onClick={() => navigate("/staff/submit-accommodation-report")}
            className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#0E5A72]/30 hover:shadow-lg active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-950/15">
                  <Bed className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0B2530]">Hotels</h3>
                  <p className="mt-1 text-sm leading-5 text-[#5D6F73]">Submit hotel room occupancy, check-ins, and guest nights.</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#0E5A72]" />
            </div>
          </button>
        )}

        {!showVisitorForm && !showAccommodationForm && (
          <div className="rounded-3xl border border-dashed border-[#b8d2cf] bg-[#f8fbf8] bg-white p-6 text-sm text-[#5D6F73]">
            No report form is assigned to this establishment yet. Please ask the municipal tourism officer to update the establishment type or room count.
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {submissionStats.map((stat) => (
          <div key={stat.title} className="rounded-3xl border border-[#d7e5e2] bg-white/88 p-5 shadow-tourism backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-tourism-hover">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#5D6F73]">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[#0B2530]">{stat.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${stat.tone}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[#d7e5e2] bg-white/88 p-6 shadow-tourism backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#0B2530]">Recent submissions</h3>
              <p className="mt-1 text-sm text-[#5D6F73]">Grouped by actual submitted report.</p>
            </div>
            <History className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-5 space-y-3">
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#d7e5e2]/70 bg-[#f8fbf8] p-4">
                  <div>
                    <p className="font-semibold text-[#0B2530]">{submission.type}</p>
                    <p className="mt-1 text-sm text-[#5D6F73]">{submission.dataSummary}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusStyles[submission.status as keyof typeof statusStyles] || statusStyles.pending}`}>
                      {submission.status}
                    </span>
                    <p className="mt-1 text-xs text-[#5D6F73]">{submission.submittedDate}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#b8d2cf] bg-[#f8fbf8] p-8 text-center text-sm text-[#5D6F73]">
                No submissions yet. Start by submitting a resort or hotel report.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#d7e5e2] bg-white/88 p-6 shadow-tourism backdrop-blur-xl">
          <h3 className="text-lg font-bold text-[#0B2530]">Reporting reminder</h3>
          <div className="mt-5 rounded-2xl bg-cyan-50 p-4 ring-1 ring-cyan-100">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-[#0E5A72]" />
              <div>
                <p className="font-semibold text-[#0B2530]">Daily reports keep analytics reliable</p>
                <p className="mt-1 text-sm leading-6 text-[#5D6F73]">
                  Submit resort and hotel data after business close. The tourism office uses approved records for reports, analytics, and AI insights.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
              <p className="text-sm leading-6 text-slate-700">
                Occupied rooms cannot be higher than your configured room inventory. The form now validates this before submission.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
