import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Moon, Percent, UsersRound } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../../lib/supabase";
import { calculateAccommodationOccupancy } from "../../../lib/reportMetrics";
import { canSubmitAccommodationReport } from "../../../lib/establishmentReportForms";

interface VisitorReport {
  id: string;
  report_date?: string | null;
  created_at?: string | null;
  status?: string | null;
  total_guests?: number | null;
}

interface AccommodationReport {
  id: string;
  report_date?: string | null;
  created_at?: string | null;
  status?: string | null;
  total_rooms?: number | null;
  total_occupied_rooms?: number | null;
  total_check_ins?: number | null;
  total_guest_nights?: number | null;
}

const formatDate = (dateValue: Date) => dateValue.toISOString().slice(0, 10);

const defaultStartDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 5);
  date.setDate(1);
  return formatDate(date);
};

const defaultEndDate = () => formatDate(new Date());

const formatMonthLabel = (dateValue?: string | null) => {
  if (!dateValue) return "No date";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Invalid";
  return date.toLocaleString("default", { month: "short", year: "numeric" });
};

const isWithinDateRange = (reportDate: string | null | undefined, startDate: string, endDate: string) => {
  if (!reportDate) return false;
  return reportDate >= startDate && reportDate <= endDate;
};

const csvEscape = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [establishment, setEstablishment] = useState<any>(null);
  const [visitorReports, setVisitorReports] = useState<VisitorReport[]>([]);
  const [accommodationReports, setAccommodationReports] = useState<AccommodationReport[]>([]);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
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

    if (!profileData) {
      setLoading(false);
      return;
    }

    if (profileData.establishment_id) {
      const { data: establishmentData } = await supabase
        .from("establishments")
        .select("name,type,total_rooms")
        .eq("id", profileData.establishment_id)
        .maybeSingle();
      setEstablishment(establishmentData);
    }

    const [{ data: visitorData }, { data: accommodationData }] = await Promise.all([
      supabase
        .from("visitor_reports")
        .select("id, report_date, created_at, status, total_guests")
        .eq("submitted_by", profileData.id),
      supabase
        .from("accommodation_reports")
        .select("id, report_date, created_at, status, total_rooms, total_occupied_rooms, total_check_ins, total_guest_nights")
        .eq("submitted_by", profileData.id),
    ]);

    setVisitorReports(visitorData || []);
    setAccommodationReports(accommodationData || []);
    setLoading(false);
  };

  const showHotelAnalytics = canSubmitAccommodationReport(establishment);

  const filteredVisitorReports = useMemo(
    () => visitorReports.filter((report) => isWithinDateRange(report.report_date, startDate, endDate)),
    [visitorReports, startDate, endDate]
  );

  const filteredAccommodationReports = useMemo(
    () => accommodationReports.filter((report) => isWithinDateRange(report.report_date, startDate, endDate)),
    [accommodationReports, startDate, endDate]
  );

  const hotelMetrics = useMemo(() => {
    const totalCheckIns = filteredAccommodationReports.reduce((sum, report) => sum + Number(report.total_check_ins || 0), 0);
    const totalGuestNights = filteredAccommodationReports.reduce((sum, report) => sum + Number(report.total_guest_nights || 0), 0);
    const totalOccupiedRooms = filteredAccommodationReports.reduce((sum, report) => sum + Number(report.total_occupied_rooms || 0), 0);
    const occupancyRates = filteredAccommodationReports.map((report) =>
      calculateAccommodationOccupancy(report.total_occupied_rooms, report.total_rooms, report.report_date)
    );

    return {
      averageGuestNight: totalCheckIns > 0 ? (totalGuestNights / totalCheckIns).toFixed(2) : "0.00",
      averageRoomOccupancyRate:
        occupancyRates.length > 0
          ? (occupancyRates.reduce((sum, rate) => sum + rate, 0) / occupancyRates.length).toFixed(2)
          : "0.00",
      averageGuestPerRoom: totalOccupiedRooms > 0 ? (totalGuestNights / totalOccupiedRooms).toFixed(2) : "0.00",
    };
  }, [filteredAccommodationReports]);

  const chartData = useMemo(() => {
    const grouped = new Map<string, { month: string; visitors: number; occupancyTotal: number; occupancyReports: number; guests: number; guestNights: number }>();

    const ensureMonth = (dateValue?: string | null) => {
      const key = (dateValue || "No date").slice(0, 7);
      const existing = grouped.get(key);
      if (existing) return existing;
      const item = { month: formatMonthLabel(dateValue), visitors: 0, occupancyTotal: 0, occupancyReports: 0, guests: 0, guestNights: 0 };
      grouped.set(key, item);
      return item;
    };

    filteredVisitorReports.forEach((report) => {
      const item = ensureMonth(report.report_date);
      item.visitors += Number(report.total_guests || 0);
    });

    filteredAccommodationReports.forEach((report) => {
      const item = ensureMonth(report.report_date);
      item.guests += Number(report.total_check_ins || 0);
      item.guestNights += Number(report.total_guest_nights || 0);
      item.occupancyTotal += calculateAccommodationOccupancy(report.total_occupied_rooms, report.total_rooms, report.report_date);
      item.occupancyReports += 1;
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, item]) => ({
        month: item.month,
        visitors: item.visitors,
        occupancy: item.occupancyReports > 0 ? Number((item.occupancyTotal / item.occupancyReports).toFixed(2)) : 0,
        guests: item.guests,
        guestNights: item.guestNights,
      }));
  }, [filteredVisitorReports, filteredAccommodationReports]);

  const exportAnalytics = () => {
    const rows = [
      ["VistaBalayan Establishment Analytics"],
      ["Date range", startDate, endDate],
      [],
      ["Metric", "Value", "Subtitle"],
      ["Average Guest Night", hotelMetrics.averageGuestNight, "nights per guest"],
      ["Average Room Occupancy Rate", `${hotelMetrics.averageRoomOccupancyRate}%`, "monthly average"],
      ["Average Guest Per Room", hotelMetrics.averageGuestPerRoom, "guests per room"],
      [],
      ["Report Type", "Report Date", "Status", "Total Visitors", "Total Rooms", "Occupied Rooms", "Check-ins", "Guest Nights", "Occupancy Rate"],
      ...filteredVisitorReports.map((report) => [
        "Visitor",
        report.report_date || "",
        report.status || "pending",
        report.total_guests || 0,
        "",
        "",
        "",
        "",
        "",
      ]),
      ...filteredAccommodationReports.map((report) => [
        "Accommodation",
        report.report_date || "",
        report.status || "pending",
        "",
        report.total_rooms || 0,
        report.total_occupied_rooms || 0,
        report.total_check_ins || 0,
        report.total_guest_nights || 0,
        `${calculateAccommodationOccupancy(report.total_occupied_rooms, report.total_rooms, report.report_date).toFixed(2)}%`,
      ]),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `establishment-analytics-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hotelAnalyticsCards = [
    { title: "Average Guest Night", value: hotelMetrics.averageGuestNight, subtitle: "nights per guest", icon: Moon, tone: "bg-sky-50 text-sky-700 ring-sky-100" },
    { title: "Average Room Occupancy Rate", value: `${hotelMetrics.averageRoomOccupancyRate}%`, subtitle: "monthly average", icon: Percent, tone: "bg-violet-50 text-violet-700 ring-violet-100" },
    { title: "Average Guest Per Room", value: hotelMetrics.averageGuestPerRoom, subtitle: "guests per room", icon: UsersRound, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  ];

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-b-[#0E5A72]"></div>
          <p className="mt-4 text-sm font-medium text-[#5D6F73]">Loading analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Establishment Analytics</h1>
          <p className="text-gray-600 mt-1">Track your establishment's performance and trends</p>
        </div>
        <button
          onClick={exportAnalytics}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0E5A72] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0B2530] active:scale-[0.98]"
        >
          <Download className="h-4 w-4" />
          Export analytics
        </button>
      </div>

      <section className="rounded-3xl border border-[#d7e5e2] bg-white/88 p-5 shadow-tourism backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#0B2530]">Date filters</h3>
            <p className="mt-1 text-sm text-[#5D6F73]">Filter analytics and exports by report date.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#5D6F73]">
              From
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block w-full rounded-2xl border border-[#d7e5e2] px-4 py-2 text-[#0B2530] outline-none focus:border-[#0E5A72] focus:ring-2 focus:ring-[#0E5A72]/15" />
            </label>
            <label className="text-sm font-medium text-[#5D6F73]">
              To
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block w-full rounded-2xl border border-[#d7e5e2] px-4 py-2 text-[#0B2530] outline-none focus:border-[#0E5A72] focus:ring-2 focus:ring-[#0E5A72]/15" />
            </label>
          </div>
        </div>
      </section>

      {showHotelAnalytics && (
        <section className="rounded-3xl border border-[#d7e5e2] bg-white/88 p-5 shadow-tourism backdrop-blur-xl sm:p-6">
          <div>
            <h3 className="text-lg font-bold text-[#0B2530]">Hotel analytics</h3>
            <p className="mt-1 text-sm text-[#5D6F73]">Computed from hotel accommodation reports in the selected date range.</p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {hotelAnalyticsCards.map((metric) => (
              <div key={metric.title} className="rounded-3xl border border-[#d7e5e2]/80 bg-[#f8fbf8] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#5D6F73]">{metric.title}</p>
                    <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[#0B2530]">{metric.value}</p>
                    <p className="mt-1 text-xs font-medium text-[#5D6F73]">{metric.subtitle}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${metric.tone}`}>
                    <metric.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div key="visitor-occupancy-card" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#0E5A72]" />
          <h3 className="text-lg font-semibold text-gray-900">Visitor & Occupancy Trends</h3>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line key="visitors-line" yAxisId="left" type="monotone" dataKey="visitors" stroke="#0E5A72" strokeWidth={2} name="Visitors" />
            <Line key="occupancy-line" yAxisId="right" type="monotone" dataKey="occupancy" stroke="#64748b" strokeWidth={2} name="Occupancy %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div key="monthly-performance-card" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Guest Overview</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar key="guests-bar" dataKey="guests" fill="#0E5A72" name="Total Guests" />
            <Bar key="guest-nights-bar" dataKey="guestNights" fill="#94a3b8" name="Guest Nights" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-gradient-to-br from-cyan-50 to-slate-50 rounded-lg border border-cyan-100 p-6">
        <h4 className="font-semibold text-[#0B2530] mb-2">Filtered analytics</h4>
        <p className="text-sm text-[#5D6F73]">
          Showing {filteredVisitorReports.length} visitor report entries and {filteredAccommodationReports.length} hotel accommodation reports from {startDate} to {endDate}.
        </p>
      </div>
    </div>
  );
}
