import { Fragment, useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Download, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";
import { datestampedFilename, downloadCsv } from "../../../lib/exportCsv";
import { calculateAccommodationOccupancy, calculateAverageAccommodationOccupancy } from "../../../lib/reportMetrics";

interface AccommodationRecord {
  id: string;
  establishmentId: string;
  establishment: string;
  month: string;
  date: string;
  totalRooms: number;
  reportedRooms: number;
  avgOccupancy: number;
  totalGuests: number;
  guestNights: number;
  // Additional fields for calculations
  occupiedRooms: number;
  daysInMonth: number;
}

export default function AccommodationMonitoring({ embedded = false }: { embedded?: boolean }) {
  const [accommodationRecords, setAccommodationRecords] = useState<AccommodationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [specificMonth, setSpecificMonth] = useState("");
  const [establishmentTotalRooms, setEstablishmentTotalRooms] = useState(0);
  const [expandedEstablishments, setExpandedEstablishments] = useState<Set<string>>(new Set());

  // Summary statistics
  const [summaryStats, setSummaryStats] = useState({
    totalRooms: 0,
    totalGuests: 0,
    totalGuestNights: 0,
    avgGuestNight: 0,
    avgOccupancyRate: 0,
    avgGuestsPerRoom: 0,
    totalOccupiedRooms: 0,
    totalAvailableRoomDays: 0,
  });

  useEffect(() => {
    fetchAccommodationRecords();
  }, []);

  const fetchAccommodationRecords = async () => {
    setLoading(true);
    
    try {
      // Match the Establishments page total rooms exactly: sum establishments.total_rooms from the canonical establishments table.
      // Report rows repeat room inventory, so the summary card must not depend on report rows being present.
      const { data: establishments, error: establishmentsError } = await supabase
        .from("establishments")
        .select("total_rooms");

      if (establishmentsError) {
        console.error("Error fetching establishment room totals:", establishmentsError);
        toast.error("Failed to load establishment room totals: " + establishmentsError.message);
        setLoading(false);
        return;
      }

      const canonicalTotalRooms = (establishments || []).reduce(
        (sum: number, establishment: any) => sum + Number(establishment.total_rooms || 0),
        0
      );
      setEstablishmentTotalRooms(canonicalTotalRooms);

      // Fetch all accommodation reports with establishment names
      const { data: reports, error: reportsError } = await supabase
        .from("accommodation_reports")
        .select(`
          id,
          report_date,
          total_rooms,
          total_occupied_rooms,
          total_check_ins,
          total_guest_nights,
          status,
          establishment_id,
          establishments!accommodation_reports_establishment_id_fkey (
            name,
            total_rooms
          )
        `)
        .in("status", ["pending", "approved"])
        .order("report_date", { ascending: false });

      console.log("Accommodation reports:", reports);
      console.log("Error:", reportsError);

      if (reportsError) {
        console.error("Error fetching accommodation reports:", reportsError);
        toast.error("Failed to load accommodation data: " + reportsError.message);
        setLoading(false);
        return;
      }

      if (!reports || reports.length === 0) {
        console.log("No accommodation reports found");
        setAccommodationRecords([]);
        setLoading(false);
        return;
      }

      // Helpers to read establishment metadata from Supabase joins.
      const getEstablishment = (item: any) => {
        if (Array.isArray(item.establishments)) {
          return item.establishments[0] || null;
        }
        return item.establishments || null;
      };

      const getEstablishmentName = (item: any) => getEstablishment(item)?.name || "Unknown";

      const getConfiguredRoomCount = (item: any) => {
        const configuredRooms = Number(getEstablishment(item)?.total_rooms || 0);
        return configuredRooms > 0 ? configuredRooms : Number(item.total_rooms || 0);
      };

      // Format records with proper calculations
      const formattedRecords: AccommodationRecord[] = reports.map((item: any) => {
        const reportDate = new Date(item.report_date);
        const monthName = reportDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        // Get days in month for accurate occupancy calculation
        const daysInMonth = new Date(
          reportDate.getFullYear(), 
          reportDate.getMonth() + 1, 
          0
        ).getDate();
        
        const configuredRooms = getConfiguredRoomCount(item);
        const reportedRooms = Number(item.total_rooms || 0);
        const avgOccupancy = calculateAccommodationOccupancy(
          item.total_occupied_rooms,
          configuredRooms,
          item.report_date
        );

        return {
          id: item.id,
          establishmentId: item.establishment_id,
          establishment: getEstablishmentName(item),
          month: monthName,
          date: item.report_date,
          totalRooms: configuredRooms,
          reportedRooms: reportedRooms,
          avgOccupancy: avgOccupancy,
          totalGuests: item.total_check_ins || 0,
          guestNights: item.total_guest_nights || 0,
          occupiedRooms: item.total_occupied_rooms || 0,
          daysInMonth: daysInMonth,
        };
      });

      console.log("Formatted records:", formattedRecords);
      setAccommodationRecords(formattedRecords);

      // Calculate summary statistics
      calculateSummaryStats(formattedRecords);

    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Failed to load accommodation data");
    } finally {
      setLoading(false);
    }
  };

  const calculateSummaryStats = (records: AccommodationRecord[]) => {
    if (records.length === 0) {
      setSummaryStats({
        totalRooms: 0,
        totalGuests: 0,
        totalGuestNights: 0,
        avgGuestNight: 0,
        avgOccupancyRate: 0,
        avgGuestsPerRoom: 0,
        totalOccupiedRooms: 0,
        totalAvailableRoomDays: 0,
      });
      return;
    }

    // Total rooms are configured establishment capacity, counted once per establishment.
    // Do not sum every report's total_rooms because daily/monthly reports repeat the same room inventory.
    const totalRoomsByEstablishment = new Map<string, number>();
    records.forEach((record) => {
      totalRoomsByEstablishment.set(record.establishmentId, Math.max(totalRoomsByEstablishment.get(record.establishmentId) || 0, record.totalRooms));
    });
    const totalRooms = Array.from(totalRoomsByEstablishment.values()).reduce((sum, rooms) => sum + rooms, 0);
    const totalGuests = records.reduce((sum, r) => sum + r.totalGuests, 0);
    const totalGuestNights = records.reduce((sum, r) => sum + r.guestNights, 0);
    const totalOccupiedRooms = records.reduce((sum, r) => sum + r.occupiedRooms, 0);
    
    // Calculate total available room days (total_rooms × days_in_month for each record)
    const totalAvailableRoomDays = records.reduce((sum, r) => sum + (r.totalRooms * r.daysInMonth), 0);

    // 1) Average Guest-Night = Total Guest Nights / Total Check-ins
    const avgGuestNight = totalGuests > 0 ? totalGuestNights / totalGuests : 0;

    const avgOccupancyRate = calculateAverageAccommodationOccupancy(
      records.map((record) => ({
        id: record.id,
        report_date: record.date,
        total_rooms: record.totalRooms,
        total_occupied_rooms: record.occupiedRooms,
      }))
    );

    // 3) Average Guests per Room = Total Guest Nights / Total Occupied Rooms
    const avgGuestsPerRoom = totalOccupiedRooms > 0 ? totalGuestNights / totalOccupiedRooms : 0;

    setSummaryStats({
      totalRooms,
      totalGuests,
      totalGuestNights,
      avgGuestNight,
      avgOccupancyRate,
      avgGuestsPerRoom,
      totalOccupiedRooms,
      totalAvailableRoomDays,
    });
  };

  // Filter records based on search and date/month
  const filteredRecords = accommodationRecords.filter((record) => {
    const matchesSearch = record.establishment.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesDate = true;
    
    if (specificMonth) {
      matchesDate = record.date.startsWith(specificMonth);
    }

    return matchesSearch && matchesDate;
  });

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      establishment: string;
      records: AccommodationRecord[];
      totalRooms: number;
      totalGuests: number;
      guestNights: number;
      occupiedRooms: number;
      monthNames: Set<string>;
    }>();

    filteredRecords.forEach((record) => {
      const key = record.establishmentId || record.establishment;
      const current = groups.get(key) || {
        key,
        establishment: record.establishment,
        records: [],
        totalRooms: 0,
        totalGuests: 0,
        guestNights: 0,
        occupiedRooms: 0,
        monthNames: new Set<string>(),
      };

      current.records.push(record);
      current.totalRooms = Math.max(current.totalRooms, record.totalRooms);
      current.totalGuests += record.totalGuests;
      current.guestNights += record.guestNights;
      current.occupiedRooms += record.occupiedRooms;
      current.monthNames.add(record.month);
      groups.set(key, current);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        records: [...group.records].sort((a, b) => b.date.localeCompare(a.date)),
        avgOccupancy: calculateAverageAccommodationOccupancy(
          group.records.map((record) => ({
            id: record.id,
            report_date: record.date,
            total_rooms: record.totalRooms,
            total_occupied_rooms: record.occupiedRooms,
          }))
        ),
        avgGuestsPerRoom: group.occupiedRooms > 0 ? group.guestNights / group.occupiedRooms : 0,
      }))
      .sort((a, b) => a.establishment.localeCompare(b.establishment));
  }, [filteredRecords]);

  const toggleEstablishment = (key: string) => {
    setExpandedEstablishments((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const monthLabel = specificMonth
    ? new Date(`${specificMonth}-01T00:00:00`).toLocaleString("default", { month: "long", year: "numeric" })
    : "all available months";

  // Recalculate stats for filtered records
  const filteredStats = {
    totalRooms: searchTerm || specificMonth
      ? Array.from(
          filteredRecords.reduce((roomsByEstablishment, record) => {
            roomsByEstablishment.set(
              record.establishmentId,
              Math.max(roomsByEstablishment.get(record.establishmentId) || 0, record.totalRooms)
            );
            return roomsByEstablishment;
          }, new Map<string, number>()).values()
        ).reduce((sum, rooms) => sum + rooms, 0)
      : establishmentTotalRooms,
    totalGuests: filteredRecords.reduce((sum, r) => sum + r.totalGuests, 0),
    totalGuestNights: filteredRecords.reduce((sum, r) => sum + r.guestNights, 0),
    avgGuestNight: filteredRecords.reduce((sum, r) => sum + r.totalGuests, 0) > 0 
      ? filteredRecords.reduce((sum, r) => sum + r.guestNights, 0) / filteredRecords.reduce((sum, r) => sum + r.totalGuests, 0)
      : 0,
    avgOccupancyRate: calculateAverageAccommodationOccupancy(
      filteredRecords.map((record) => ({
        id: record.id,
        report_date: record.date,
        total_rooms: record.totalRooms,
        total_occupied_rooms: record.occupiedRooms,
      }))
    ),
    avgGuestsPerRoom: filteredRecords.reduce((sum, r) => sum + r.occupiedRooms, 0) > 0
      ? filteredRecords.reduce((sum, r) => sum + r.guestNights, 0) / filteredRecords.reduce((sum, r) => sum + r.occupiedRooms, 0)
      : 0,
  };

  const handleExport = () => {
    downloadCsv(
      datestampedFilename("accommodation-records"),
      ["Date", "Month", "Establishment", "Total Rooms", "Reported Rooms", "Occupied Rooms", "Average Occupancy %", "Total Guests", "Guest Nights", "Days In Month"],
      filteredRecords.map((record) => [
        record.date,
        record.month,
        record.establishment,
        record.totalRooms,
        record.reportedRooms,
        record.occupiedRooms,
        record.avgOccupancy.toFixed(2),
        record.totalGuests,
        record.guestNights,
        record.daysInMonth,
      ])
    );
    toast.success(`Exported ${filteredRecords.length} accommodation record(s)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1CA7C9] mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading accommodation data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accommodation Monitoring</h1>
          <p className="text-gray-600 mt-1">Monitor room occupancy and guest accommodation data</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Rooms</p>
          <p className="text-3xl font-bold text-gray-900">{filteredStats.totalRooms}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Guests (Check-ins)</p>
          <p className="text-3xl font-bold text-blue-600">{filteredStats.totalGuests}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Guest Nights</p>
          <p className="text-3xl font-bold text-purple-600">{filteredStats.totalGuestNights}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Avg Guest-Night</p>
          <p className="text-3xl font-bold text-orange-600">{filteredStats.avgGuestNight.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-gray-600">Avg Room Occupancy Rate</p>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{filteredStats.avgOccupancyRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Avg Guests per Room</p>
          <p className="text-3xl font-bold text-teal-600">{filteredStats.avgGuestsPerRoom.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by establishment..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white transition"
              aria-pressed="true"
            >
              Month
            </button>
          </div>
          <input
            type="month"
            value={specificMonth}
            onChange={(e) => setSpecificMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            title="Select report month"
          />
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Accommodation Records by Establishment */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Accommodation records by establishment</h2>
          <p className="mt-1 text-sm text-gray-600">Click an establishment to expand and view the full {monthLabel} record.</p>
        </div>
        <div className="space-y-3 p-4 sm:hidden">
          {groupedRecords.length > 0 ? (
            groupedRecords.map((group) => {
              const isExpanded = expandedEstablishments.has(group.key);
              return (
                <div key={group.key} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <button
                    type="button"
                    className="w-full p-4 text-left"
                    onClick={() => toggleEstablishment(group.key)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />}
                          <p className="truncate font-semibold text-gray-900">{group.establishment}</p>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{group.records.length} record(s) • {Array.from(group.monthNames).join(", ")}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        group.avgOccupancy >= 90 ? "bg-green-100 text-green-700" :
                        group.avgOccupancy >= 70 ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {group.avgOccupancy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-gray-500">Rooms</p>
                        <p className="font-semibold text-gray-900">{group.totalRooms}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-gray-500">Guests</p>
                        <p className="font-semibold text-blue-600">{group.totalGuests}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-gray-500">Guest Nights</p>
                        <p className="font-semibold text-gray-900">{group.guestNights}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-gray-500">Avg Guest/Room</p>
                        <p className="font-semibold text-teal-600">{group.avgGuestsPerRoom.toFixed(2)}</p>
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-slate-50 p-3">
                      <div className="max-h-72 space-y-3 overflow-y-auto overscroll-contain pr-1">
                        {group.records.map((record) => (
                          <div key={record.id} className="rounded-xl border border-gray-200 bg-white p-3 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-900">{record.date}</p>
                                <p className="text-xs text-gray-500">{record.month}</p>
                              </div>
                              <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">{record.avgOccupancy.toFixed(1)}%</span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <p><span className="text-gray-500">Total rooms:</span> <span className="font-medium text-gray-900">{record.totalRooms}</span></p>
                              <p><span className="text-gray-500">Reported:</span> <span className="font-medium text-gray-900">{record.reportedRooms}</span></p>
                              <p><span className="text-gray-500">Occupied:</span> <span className="font-medium text-gray-900">{record.occupiedRooms}</span></p>
                              <p><span className="text-gray-500">Guests:</span> <span className="font-medium text-blue-600">{record.totalGuests}</span></p>
                              <p className="col-span-2"><span className="text-gray-500">Guest nights:</span> <span className="font-medium text-gray-900">{record.guestNights}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              No accommodation records found.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[920px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Establishment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Records</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Month(s)</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Rooms</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg Occupancy</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Guests</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Guest Nights</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg Guest/Room</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {groupedRecords.length > 0 ? (
                groupedRecords.map((group) => {
                  const isExpanded = expandedEstablishments.has(group.key);
                  return (
                    <Fragment key={group.key}>
                      <tr className="cursor-pointer hover:bg-gray-50" onClick={() => toggleEstablishment(group.key)}>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                            {group.establishment}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{group.records.length}</td>
                        <td className="px-6 py-4 text-gray-600">{Array.from(group.monthNames).join(", ")}</td>
                        <td className="px-6 py-4 text-gray-900">{group.totalRooms}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                              <div
                                className={`h-2 rounded-full ${
                                  group.avgOccupancy >= 90 ? "bg-green-500" :
                                  group.avgOccupancy >= 70 ? "bg-blue-500" :
                                  group.avgOccupancy >= 50 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(group.avgOccupancy, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{group.avgOccupancy.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-blue-600 font-medium">{group.totalGuests}</td>
                        <td className="px-6 py-4 text-gray-900">{group.guestNights}</td>
                        <td className="px-6 py-4 text-teal-600 font-medium">{group.avgGuestsPerRoom.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            group.avgOccupancy >= 90 ? "bg-green-100 text-green-700" :
                            group.avgOccupancy >= 70 ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {group.avgOccupancy >= 90 ? "Excellent" : group.avgOccupancy >= 70 ? "Good" : "Fair"}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${group.key}-details`} className="bg-slate-50/80">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="max-h-80 overflow-auto overscroll-contain rounded-lg border border-gray-200 bg-white">
                              <table className="w-full min-w-[820px]">
                                <thead className="sticky top-0 z-10 bg-white border-b border-gray-200">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Month</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Total Rooms</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Reported Rooms</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Occupied Rooms</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Avg Occupancy</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Total Guests</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Guest Nights</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {group.records.map((record) => (
                                    <tr key={record.id}>
                                      <td className="px-4 py-3 text-sm text-gray-600">{record.date}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{record.month}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{record.totalRooms}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{record.reportedRooms}</td>
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.occupiedRooms}</td>
                                      <td className="px-4 py-3 text-sm font-medium text-green-700">{record.avgOccupancy.toFixed(1)}%</td>
                                      <td className="px-4 py-3 text-sm font-medium text-blue-600">{record.totalGuests}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{record.guestNights}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No accommodation records found.
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