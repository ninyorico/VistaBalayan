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

let totalRoomDays = 0;
let totalGuestNights = 0;

accommodationData?.forEach((report) => {
  const date = new Date(report.report_date);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  totalRoomDays += report.total_rooms * daysInMonth;
  totalGuestNights += report.total_occupied_rooms;
});

const occupancyRate = totalRoomDays > 0 ? (totalGuestNights / totalRoomDays) * 100 : 0;
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
          color: name === "Batangas Resident" ? "#3b82f6" : name === "Outside Batangas" ? "#8b5cf6" : "#10b981",
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
        .select(`id, report_date, status, created_at, establishments(name)`)
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: accommodationRecent } = await supabase
        .from('accommodation_reports')
        .select(`id, report_date, status, created_at, establishments(name)`)
        .order('created_at', { ascending: false })
        .limit(3);

      const combined = [
        ...(visitorRecent || []).map((v: any) => ({
          id: v.id,
          establishment_name: v.establishments?.name || "Unknown",
          type: "Visitor Report",
          status: v.status,
          date: v.report_date,
          created_at: v.created_at,
        })),
        ...(accommodationRecent || []).map((a: any) => ({
          id: a.id,
          establishment_name: a.establishments?.name || "Unknown",
          type: "Accommodation Report",
          status: a.status,
          date: a.report_date,
          created_at: a.created_at,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       .slice(0, 5);

      setRecentSubmissions(combined);

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to VistaBalayan Tourism Management System</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Visitors</p>
              <p className="text-3xl font-bold text-gray-900">{totalVisitors.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Monthly Arrivals</p>
              <p className="text-3xl font-bold text-gray-900">{monthlyArrivals.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Occupancy Rate</p>
              <p className="text-3xl font-bold text-gray-900">{occupancyRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Bed className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Establishments</p>
              <p className="text-3xl font-bold text-gray-900">{totalEstablishments}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Visitor Trends</h3>
          {visitorTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={visitorTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="visitors" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Visitors" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No visitor data available</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visitor Demographics</h3>
          {demographics.length > 0 && demographics.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={demographics} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={100} dataKey="value">
                  {demographics.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No demographic data available</div>
          )}
        </div>
      </div>

      {/* Top Performing Establishments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Establishments (by visitors)</h3>
        {topEstablishments.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topEstablishments}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="visitors" fill="#3b82f6" name="Visitors" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">No establishment data available</div>
        )}
      </div>

      {/* Recent Submissions & Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Submissions</h3>
          <div className="space-y-3">
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{sub.establishment_name}</p>
                    <p className="text-sm text-gray-600">{sub.type}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      sub.status === "approved" ? "bg-green-100 text-green-700" :
                      sub.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    }`}>
                      {sub.status === "approved" && <CheckCircle className="w-3 h-3" />}
                      {sub.status === "pending" && <Clock className="w-3 h-3" />}
                      {sub.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{sub.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No submissions yet</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Anomaly Detections</h3>
          <div className="space-y-3">
            {anomalies.length > 0 ? (
              anomalies.map((anomaly) => (
                <div key={anomaly.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  anomaly.severity === "high" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
                }`}>
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    anomaly.severity === "high" ? "text-red-600" : "text-yellow-600"
                  }`} />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className="font-medium text-gray-900">{anomaly.anomaly_type}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        anomaly.severity === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      }`}>{anomaly.severity}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{anomaly.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No anomalies detected</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}