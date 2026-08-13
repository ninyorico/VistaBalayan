import { useEffect, useState } from "react";
import {
  Users,
  TrendingUp,
  Bed,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../../lib/supabase";
import { calculateAccommodationOccupancy } from "../../../lib/reportMetrics";
import { calculateAverageResolutionHours, normalizeReportStatus } from "../../../lib/governance";

interface RecentSubmission {
  id: string;
  establishment_name: string;
  type: string;
  status: string;
  date: string;
  created_at: string;
}

interface TopEstablishment {
  name: string;
  visitors: number;
}

interface Demographic {
  name: string;
  value: number;
  color: string;
}

export default function OfficerDashboard() {
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [monthlyArrivals, setMonthlyArrivals] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [totalEstablishments, setTotalEstablishments] = useState(0);
  const [visitorTrends, setVisitorTrends] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [demographics, setDemographics] = useState<Demographic[]>([]);
  const [topEstablishments, setTopEstablishments] = useState<TopEstablishment[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [workflowMetrics, setWorkflowMetrics] = useState({
    activeReports: 0,
    pendingReports: 0,
    onHoldReports: 0,
    resolvedReports: 0,
    averageResolutionHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllDashboardData();
  }, []);

  const fetchAllDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('=== FETCHING DASHBOARD DATA ===');
      
      // 1. Fetch all approved visitor reports
      const { data: visitorData, error: visitorError } = await supabase
        .from('visitor_reports')
        .select('report_date, total_guests')
        .in('status', ['pending', 'approved'])
        .order('report_date', { ascending: true });

      if (visitorError) {
        console.error('Visitor data error:', visitorError);
        setError('Failed to load visitor data');
        setLoading(false);
        return;
      }

      console.log('Visitor data count:', visitorData?.length || 0);
      
      // Calculate total visitors
      const total = visitorData?.reduce((sum, v) => sum + (v.total_guests || 0), 0) || 0;
      setTotalVisitors(total);
      console.log('Total visitors set to:', total);

      // Calculate monthly trends
      const monthly: Record<string, number> = {};
      visitorData?.forEach((v) => {
        const month = new Date(v.report_date).toLocaleString('default', { month: 'short' });
        monthly[month] = (monthly[month] || 0) + (v.total_guests || 0);
      });
      const trends = Object.entries(monthly).map(([month, visitors]) => ({ month, visitors }));
      setVisitorTrends(trends);
      console.log('Monthly trends:', trends);

// Calculate monthly arrivals (current month from data)
if (visitorData && visitorData.length > 0) {
  // Get the most recent month with data
  const sortedDates = visitorData
    .map(v => new Date(v.report_date))
    .sort((a: Date, b: Date) => b.getTime() - a.getTime());  // ← Fixed: use getTime()
  
  const latestDate = sortedDates[0];
  const currentMonthStr = latestDate.toLocaleString('default', { month: 'short' });
  const currentMonthVisitors = monthly[currentMonthStr] || 0;
  setMonthlyArrivals(currentMonthVisitors);
  console.log('Monthly arrivals (current month) set to:', currentMonthVisitors);
}

      // 2. Fetch accommodation reports
// Get the number of days in the month for each report
// If your reports are monthly, you need to know which month each report is for

// Option 1: If you have report_date in accommodation_reports
const { data: accommodationData } = await supabase
  .from('accommodation_reports')
  .select('total_rooms, total_occupied_rooms, report_date')
  .in('status', ['pending', 'approved']);

let weightedOccupancySum = 0;
let occupancyReportCount = 0;

accommodationData?.forEach((report) => {
  const reportOccupancy = calculateAccommodationOccupancy(
    report.total_occupied_rooms,
    report.total_rooms,
    report.report_date
  );
  weightedOccupancySum += reportOccupancy;
  occupancyReportCount += 1;
});

const occupancyRate = occupancyReportCount > 0 ? weightedOccupancySum / occupancyReportCount : 0;
setOccupancyRate(occupancyRate);

      // 3. Fetch establishments count
      const { count: establishmentsCount, error: estError } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true });

      if (!estError) {
        setTotalEstablishments(establishmentsCount || 0);
        console.log('Total establishments set to:', establishmentsCount);
      }

      // 4. Fetch demographics
      const { data: demoData } = await supabase
        .from('visitor_reports')
        .select('residence_type, total_guests')
        .in('status', ['pending', 'approved']);

      if (demoData && demoData.length > 0) {
        const dist: Record<string, number> = {};
        demoData.forEach((item) => {
          const type = item.residence_type || "Unknown";
          dist[type] = (dist[type] || 0) + (item.total_guests || 0);
        });
        const totalDemo = Object.values(dist).reduce((a, b) => a + b, 0);
        const chartData = Object.entries(dist).map(([name, value]) => ({
          name,
          value: totalDemo > 0 ? Math.round((value / totalDemo) * 100) : 0,
          color: name === "Batangas Resident" ? "#86BCBD" : name === "Outside Batangas" ? "#BA5A5A" : "#A4CE8B",
        }));
        setDemographics(chartData);
        console.log('Demographics set:', chartData);
      }

      // 5. Fetch top establishments
      const { data: topData } = await supabase
        .from('visitor_reports')
        .select(`establishment_id, total_guests, establishments(name)`)
        .in('status', ['pending', 'approved']);

      if (topData && topData.length > 0) {
        const stats: Record<string, { name: string; visitors: number }> = {};
        topData.forEach((item: any) => {
          const id = item.establishment_id;
          const name = item.establishments?.name;
          if (id && name) {
            if (!stats[id]) stats[id] = { name, visitors: 0 };
            stats[id].visitors += item.total_guests || 0;
          }
        });
        const sorted = Object.values(stats).sort((a, b) => b.visitors - a.visitors).slice(0, 5);
        setTopEstablishments(sorted);
        console.log('Top establishments:', sorted);
      }

      // 6. Fetch recent submissions
      const { data: visitorRecent } = await supabase
        .from('visitor_reports')
        .select(`id, report_date, status, created_at, reviewed_at, establishments(name)`)
        .order('created_at', { ascending: false })
        .limit(25);

      const { data: accommodationRecent } = await supabase
        .from('accommodation_reports')
        .select(`id, report_date, status, created_at, reviewed_at, establishments(name)`)
        .order('created_at', { ascending: false })
        .limit(25);

      const combined = [
        ...(visitorRecent || []).map((v: any) => ({
          id: v.id,
          establishment_name: v.establishments?.name || "Unknown",
          type: "Resort Report",
          status: v.status,
          date: v.report_date,
          created_at: v.created_at,
          reviewed_at: v.reviewed_at,
        })),
        ...(accommodationRecent || []).map((a: any) => ({
          id: a.id,
          establishment_name: a.establishments?.name || "Unknown",
          type: "Hotel Report",
          status: a.status,
          date: a.report_date,
          created_at: a.created_at,
          reviewed_at: a.reviewed_at,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setWorkflowMetrics({
        activeReports: combined.filter((report) => ["pending", "under_review", "on_hold"].includes(normalizeReportStatus(report.status))).length,
        pendingReports: combined.filter((report) => normalizeReportStatus(report.status) === "pending").length,
        onHoldReports: combined.filter((report) => normalizeReportStatus(report.status) === "on_hold").length,
        resolvedReports: combined.filter((report) => ["approved", "rejected"].includes(normalizeReportStatus(report.status))).length,
        averageResolutionHours: calculateAverageResolutionHours(combined),
      });

      setRecentSubmissions(combined.slice(0, 5));

      // 7. Fetch anomalies
      const { data: anomalyData } = await supabase
        .from('ai_anomalies_cache')
        .select('*')
        .eq('status', 'active')
        .order('detected_at', { ascending: false })
        .limit(5);
      setAnomalies(anomalyData || []);

      console.log('=== DASHBOARD DATA LOAD COMPLETE ===');
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1CA7C9] mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchAllDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#6F3F3F] shadow-sm">
        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#86BCBD]/35 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-44 w-72 rounded-full bg-[#A4CE8B]/22 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#F7E49B]">Officer command center</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
                Tourism activity, submissions, and AI alerts in one workspace.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#FFF9DF] opacity-80 sm:text-base">
                Monitor approved and pending tourism records, inspect establishment performance, and act on anomalies before report generation.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FFF9DF] opacity-80">Current occupancy</p>
              <p className="mt-2 text-3xl font-bold text-white">{occupancyRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total visitors", value: totalVisitors.toLocaleString(), icon: Users, tone: "bg-sky-50 text-sky-700 ring-sky-100" },
          { label: "Monthly arrivals", value: monthlyArrivals.toLocaleString(), icon: TrendingUp, tone: "bg-cyan-50 text-cyan-700 ring-cyan-100" },
          { label: "Occupancy rate", value: `${occupancyRate.toFixed(1)}%`, icon: Bed, tone: "bg-amber-50 text-amber-700 ring-amber-100" },
          { label: "Establishments", value: totalEstablishments.toString(), icon: Building2, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-[#BA5A5A]/12 bg-[#FFFEF7]/86 p-5 shadow-[0_14px_38px_rgba(111,63,63,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#74665F]/85">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[#2E3436]">{stat.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${stat.tone}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Active reports", value: workflowMetrics.activeReports, helper: "Pending, under review, or on hold", icon: AlertTriangle, tone: "bg-orange-50 text-orange-700 ring-orange-100" },
          { label: "Pending reports", value: workflowMetrics.pendingReports, helper: "Waiting for officer review", icon: Clock, tone: "bg-yellow-50 text-yellow-700 ring-yellow-100" },
          { label: "On-hold reports", value: workflowMetrics.onHoldReports, helper: "Needs manual verification", icon: AlertTriangle, tone: "bg-red-50 text-red-700 ring-red-100" },
          { label: "Resolved reports", value: workflowMetrics.resolvedReports, helper: "Approved or rejected", icon: CheckCircle, tone: "bg-green-50 text-green-700 ring-green-100" },
          { label: "Avg. resolution", value: `${workflowMetrics.averageResolutionHours.toFixed(1)}h`, helper: "From submit to decision", icon: TrendingUp, tone: "bg-blue-50 text-blue-700 ring-blue-100" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-[#BA5A5A]/12 bg-[#FFFEF7]/86 p-5 shadow-[0_14px_38px_rgba(111,63,63,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#74665F]/85">{metric.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[#2E3436]">{metric.value}</p>
                <p className="mt-1 text-xs text-[#74665F]/85">{metric.helper}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${metric.tone}`}>
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-[#BA5A5A]/12 bg-[#FFFEF7]/86 p-6 shadow-[0_14px_38px_rgba(111,63,63,0.08)] backdrop-blur">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-[#2E3436]">Monthly visitor trends</h3>
            <p className="mt-1 text-sm text-[#74665F]/85">Aggregated visitor counts by report month.</p>
          </div>
          {visitorTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={visitorTrends}>
                <defs>
                  <linearGradient id="visitorFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#BA5A5A" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#BA5A5A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7DCA9" />
                <XAxis dataKey="month" stroke="#74665F" />
                <YAxis stroke="#74665F" />
                <Tooltip />
                <Area type="monotone" dataKey="visitors" stroke="#BA5A5A" fill="url(#visitorFill)" strokeWidth={3} name="Visitors" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#BA5A5A]/25 py-12 text-center text-sm text-[#74665F]/85">No visitor data available</div>
          )}
        </div>

        <div className="rounded-3xl border border-[#BA5A5A]/12 bg-[#FFFEF7]/86 p-6 shadow-[0_14px_38px_rgba(111,63,63,0.08)] backdrop-blur">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-[#2E3436]">Visitor demographics</h3>
            <p className="mt-1 text-sm text-[#74665F]/85">Share of visitors by residence category.</p>
          </div>
          {demographics.length > 0 && demographics.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={demographics} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={100} dataKey="value">
                  {demographics.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#BA5A5A]/25 py-12 text-center text-sm text-[#74665F]/85">No demographic data available</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-[#BA5A5A]/12 bg-[#FFFEF7]/86 p-6 shadow-[0_14px_38px_rgba(111,63,63,0.08)] backdrop-blur">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-[#2E3436]">Top performing establishments</h3>
          <p className="mt-1 text-sm text-[#74665F]/85">Ranked by submitted visitor volume.</p>
        </div>
        {topEstablishments.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topEstablishments}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7DCA9" />
              <XAxis dataKey="name" angle={-35} textAnchor="end" height={90} stroke="#74665F" />
              <YAxis stroke="#74665F" />
              <Tooltip />
              <Bar dataKey="visitors" fill="#BA5A5A" radius={[10, 10, 0, 0]} name="Visitors" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#BA5A5A]/25 py-12 text-center text-sm text-[#74665F]/85">No establishment data available</div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-[#BA5A5A]/12 bg-[#FFFEF7]/86 p-6 shadow-[0_14px_38px_rgba(111,63,63,0.08)] backdrop-blur">
          <h3 className="text-lg font-bold text-[#2E3436]">Recent submissions</h3>
          <div className="mt-5 space-y-3">
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-4 rounded-2xl bg-[#FFF9DF]/70 p-4">
                  <div>
                    <p className="font-semibold text-[#2E3436]">{sub.establishment_name}</p>
                    <p className="mt-1 text-sm text-[#74665F]">{sub.type}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${
                      sub.status === "approved" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                      sub.status === "pending" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-rose-50 text-rose-700 ring-rose-200"
                    }`}>
                      {sub.status === "approved" && <CheckCircle className="h-3 w-3" />}
                      {sub.status === "pending" && <Clock className="h-3 w-3" />}
                      {sub.status}
                    </span>
                    <p className="mt-1 text-xs text-[#74665F]/85">{sub.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#BA5A5A]/25 py-10 text-center text-sm text-[#74665F]/85">No submissions yet</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#BA5A5A]/12 bg-[#FFFEF7]/86 p-6 shadow-[0_14px_38px_rgba(111,63,63,0.08)] backdrop-blur">
          <h3 className="text-lg font-bold text-[#2E3436]">Service Gaps or Operational Challenges</h3>
          <div className="mt-5 space-y-3">
            {anomalies.length > 0 ? (
              anomalies.map((anomaly) => (
                <div key={anomaly.id} className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  anomaly.severity === "high" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"
                }`}>
                  <AlertTriangle className={`mt-0.5 h-5 w-5 ${
                    anomaly.severity === "high" ? "text-rose-700" : "text-amber-700"
                  }`} />
                  <div className="flex-1">
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold text-[#2E3436]">{anomaly.anomaly_type}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                        anomaly.severity === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                      }`}>{anomaly.severity}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[#5F5650]">{anomaly.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#BA5A5A]/25 py-10 text-center text-sm text-[#74665F]/85">No service gaps or operational challenges detected</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}