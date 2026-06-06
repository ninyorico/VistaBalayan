import { useState, useEffect } from "react";
import { Search, Download, Eye, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";

interface AccommodationRecord {
  id: string;
  establishment: string;
  month: string;
  date: string;
  totalRooms: number;
  avgOccupancy: number;
  totalGuests: number;
  guestNights: number;
}

export default function AccommodationMonitoring() {
  const [accommodationRecords, setAccommodationRecords] = useState<AccommodationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [specificDate, setSpecificDate] = useState("");
  const [specificMonth, setSpecificMonth] = useState("");

  useEffect(() => {
    fetchAccommodationRecords();
  }, []);

  const fetchAccommodationRecords = async () => {
    setLoading(true);
    
    try {
      // DEBUG: First, get all accommodation reports without any filter
      const { data: allReports, error: allError } = await supabase
        .from("accommodation_reports")
        .select("*");
      
      console.log("=== DEBUG INFO ===");
      console.log("All accommodation reports:", allReports);
      console.log("All reports error:", allError);
      console.log("Total count:", allReports?.length);
      
      if (allReports && allReports.length > 0) {
        console.log("First report sample:", {
          id: allReports[0].id,
          status: allReports[0].status,
          establishment_id: allReports[0].establishment_id,
          report_date: allReports[0].report_date
        });
      }
      
      // Now fetch with proper join using the correct foreign key syntax
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
          establishment_id
        `)
        .eq("status", "approved")
        .order("report_date", { ascending: false });

      console.log("Filtered reports (approved):", reports);
      console.log("Filtered reports error:", reportsError);

      if (reportsError) {
        console.error("Error fetching accommodation reports:", reportsError);
        toast.error("Failed to load accommodation data: " + reportsError.message);
        setLoading(false);
        return;
      }

      if (!reports || reports.length === 0) {
        console.log("No approved accommodation reports found");
        setAccommodationRecords([]);
        setLoading(false);
        return;
      }

      // Get unique establishment IDs
      const establishmentIds = [...new Set(reports.map(r => r.establishment_id).filter(id => id))];
      console.log("Unique establishment IDs:", establishmentIds);
      
      // Fetch establishment names
      let establishmentMap = new Map();
      if (establishmentIds.length > 0) {
        const { data: establishments, error: estError } = await supabase
          .from("establishments")
          .select("id, name")
          .in("id", establishmentIds);
        
        console.log("Establishments found:", establishments);
        console.log("Establishments error:", estError);
        
        if (!estError && establishments) {
          establishments.forEach(est => {
            establishmentMap.set(est.id, est.name);
          });
        }
      }

      // Format records
      const formattedRecords: AccommodationRecord[] = reports.map((item: any) => {
        const reportDate = new Date(item.report_date);
        const monthName = reportDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const avgOccupancy = item.total_rooms > 0 
          ? Math.round((item.total_occupied_rooms / item.total_rooms) * 100) 
          : 0;
        
        return {
          id: item.id,
          establishment: establishmentMap.get(item.establishment_id) || `Unknown (ID: ${item.establishment_id?.slice(0, 8)}...)`,
          month: monthName,
          date: item.report_date,
          totalRooms: item.total_rooms || 0,
          avgOccupancy: avgOccupancy,
          totalGuests: item.total_check_ins || 0,
          guestNights: item.total_guest_nights || 0,
        };
      });

      console.log("Final formatted records:", formattedRecords);
      setAccommodationRecords(formattedRecords);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Failed to load accommodation data");
    } finally {
      setLoading(false);
    }
  };

  // Filter records based on search and date/month
  const filteredRecords = accommodationRecords.filter((record) => {
    const matchesSearch = record.establishment.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesDate = true;
    
    if (specificDate) {
      matchesDate = record.date === specificDate;
    } else if (specificMonth) {
      matchesDate = record.date.startsWith(specificMonth);
    }

    return matchesSearch && matchesDate;
  });

  // Calculate statistics
  const totalRooms = filteredRecords.reduce((sum, r) => sum + r.totalRooms, 0);
  const avgOccupancyRate = filteredRecords.length > 0
    ? filteredRecords.reduce((sum, r) => sum + r.avgOccupancy, 0) / filteredRecords.length
    : 0;
  const totalGuests = filteredRecords.reduce((sum, r) => sum + r.totalGuests, 0);
  const totalGuestNights = filteredRecords.reduce((sum, r) => sum + r.guestNights, 0);

  const avgGuestNight = totalGuests > 0 ? (totalGuestNights / totalGuests) : 0;
  const totalRoomsOccupied = filteredRecords.reduce(
    (sum, r) => sum + (r.totalRooms * r.avgOccupancy / 100),
    0
  );
  const avgGuestsPerRoom = totalRoomsOccupied > 0 ? (totalGuestNights / totalRoomsOccupied) : 0;

  const handleExport = () => {
    toast.success("Exporting accommodation data...");
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Accommodation Monitoring</h1>
        <p className="text-gray-600 mt-1">Monitor room occupancy and guest accommodation data</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Rooms</p>
          <p className="text-3xl font-bold text-gray-900">{totalRooms}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Guests</p>
          <p className="text-3xl font-bold text-blue-600">{totalGuests}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Guest Nights</p>
          <p className="text-3xl font-bold text-purple-600">{totalGuestNights}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Avg Guest-Night</p>
          <p className="text-3xl font-bold text-orange-600">{avgGuestNight.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-gray-600">Avg Room Occupancy</p>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{avgOccupancyRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Avg Guests/Room</p>
          <p className="text-3xl font-bold text-teal-600">{avgGuestsPerRoom.toFixed(2)}</p>
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
          <div>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => {
                setSpecificDate(e.target.value);
                setSpecificMonth("");
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <input
              type="month"
              value={specificMonth}
              onChange={(e) => {
                setSpecificMonth(e.target.value);
                setSpecificDate("");
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Accommodation Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Establishment</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Month</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Rooms</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg Occupancy</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Guests</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Guest Nights</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Performance</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{record.establishment}</td>
                    <td className="px-6 py-4 text-gray-600">{record.month}</td>
                    <td className="px-6 py-4 text-gray-900">{record.totalRooms}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                          <div
                            className={`h-2 rounded-full ${
                              record.avgOccupancy >= 90 ? "bg-green-500" :
                              record.avgOccupancy >= 70 ? "bg-blue-500" :
                              record.avgOccupancy >= 50 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${record.avgOccupancy}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{record.avgOccupancy}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-blue-600 font-medium">{record.totalGuests}</td>
                    <td className="px-6 py-4 text-gray-900">{record.guestNights}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        record.avgOccupancy >= 90 ? "bg-green-100 text-green-700" :
                        record.avgOccupancy >= 70 ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {record.avgOccupancy >= 90 ? "Excellent" : record.avgOccupancy >= 70 ? "Good" : "Fair"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded transition">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
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