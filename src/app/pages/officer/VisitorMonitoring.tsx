import { useState, useEffect } from "react";
import { Search, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";
import { datestampedFilename, downloadCsv } from "../../../lib/exportCsv";

interface VisitorRecord {
  id: string;
  establishment: string;
  date: string;
  guestName: string;
  male: number;
  female: number;
  total: number;
  residenceType: string;
  location: string;
}

export default function VisitorMonitoring({ embedded = false }: { embedded?: boolean }) {
  const [visitorRecords, setVisitorRecords] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResidence, setFilterResidence] = useState("all");
  const [specificMonth, setSpecificMonth] = useState("");

  useEffect(() => {
    fetchVisitorRecords();
  }, []);

  const fetchVisitorRecords = async () => {
    setLoading(true);
    
    // Fetch visitor reports with establishment names
    const { data, error } = await supabase
      .from("visitor_reports")
      .select(`
        id,
        report_date,
        total_male,
        total_female,
        total_guests,
        residence_type,
        place_of_residence,
        establishments (name)
      `)
      .in("status", ["pending", "approved"])
      .order("report_date", { ascending: false });

    if (error) {
      console.error("Error fetching visitor records:", error);
      setLoading(false);
      return;
    }

    // Transform data for display
    const formattedRecords: VisitorRecord[] = (data || []).map((item: any) => ({
      id: item.id,
      establishment: item.establishments?.name || "Unknown",
      date: item.report_date,
      guestName: "N/A", // Note: guest_name field doesn't exist in your schema
      male: item.total_male || 0,
      female: item.total_female || 0,
      total: item.total_guests || 0,
      residenceType: item.residence_type || "Unknown",
      location: item.place_of_residence || "Unknown",
    }));

    setVisitorRecords(formattedRecords);
    setLoading(false);
  };

  // Filter records based on search, residence, date/month
  const filteredRecords = visitorRecords.filter((record) => {
    const matchesSearch = 
      record.establishment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesResidence = filterResidence === "all" || record.residenceType === filterResidence;
      
    let matchesDate = true;
    if (specificMonth) {
      matchesDate = record.date.startsWith(specificMonth);
    }
    
    return matchesSearch && matchesResidence && matchesDate;
  });

  const totalVisitors = filteredRecords.reduce((sum, r) => sum + r.total, 0);
  const totalMale = filteredRecords.reduce((sum, r) => sum + r.male, 0);
  const totalFemale = filteredRecords.reduce((sum, r) => sum + r.female, 0);

  const handleExport = () => {
    downloadCsv(
      datestampedFilename("visitor-records"),
      ["Date", "Establishment", "Guest/Group", "Male", "Female", "Total", "Place of Residence", "Location"],
      filteredRecords.map((record) => [
        record.date,
        record.establishment,
        record.guestName,
        record.male,
        record.female,
        record.total,
        record.residenceType,
        record.location,
      ])
    );
    toast.success(`Exported ${filteredRecords.length} visitor record(s)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1CA7C9] mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading visitor records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visitor Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Monitor and review visitor data from all establishments
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Visitors</p>
          <p className="text-3xl font-bold text-gray-900">{totalVisitors}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Male</p>
          <p className="text-3xl font-bold text-blue-600">{totalMale}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Female</p>
          <p className="text-3xl font-bold text-purple-600">{totalFemale}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Records</p>
          <p className="text-3xl font-bold text-gray-900">{filteredRecords.length}</p>
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
                placeholder="Search by establishment or location..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <select
              value={filterResidence}
              onChange={(e) => setFilterResidence(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="all">All Places of Residence</option>
              <option value="Batangas Resident">Batangas Resident</option>
              <option value="Outside Batangas">Outside Batangas</option>
              <option value="Foreign">Foreign</option>
            </select>
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
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Visitor Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Establishment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Guest/Group</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Male</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Female</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Place of Residence</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location<br/><span className="normal-case tracking-normal text-slate-400">If outside Batangas, state municipality</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{record.date}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{record.establishment}</td>
                    <td className="px-6 py-4 text-gray-900">{record.guestName}</td>
                    <td className="px-6 py-4 text-blue-600 font-medium">{record.male}</td>
                    <td className="px-6 py-4 text-purple-600 font-medium">{record.female}</td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">{record.total}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        record.residenceType === "Batangas Resident"
                          ? "bg-blue-100 text-blue-700"
                          : record.residenceType === "Outside Batangas"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {record.residenceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{record.location}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No visitor records found.
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