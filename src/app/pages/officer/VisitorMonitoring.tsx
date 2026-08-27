import { Fragment, useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Download, Search } from "lucide-react";
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
  const [expandedEstablishments, setExpandedEstablishments] = useState<Set<string>>(new Set());

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

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, {
      establishment: string;
      records: VisitorRecord[];
      male: number;
      female: number;
      total: number;
      locations: Set<string>;
      residenceTypes: Set<string>;
    }>();

    filteredRecords.forEach((record) => {
      const current = groups.get(record.establishment) || {
        establishment: record.establishment,
        records: [],
        male: 0,
        female: 0,
        total: 0,
        locations: new Set<string>(),
        residenceTypes: new Set<string>(),
      };

      current.records.push(record);
      current.male += record.male;
      current.female += record.female;
      current.total += record.total;
      current.locations.add(record.location);
      current.residenceTypes.add(record.residenceType);
      groups.set(record.establishment, current);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        records: [...group.records].sort((a, b) => b.date.localeCompare(a.date)),
      }))
      .sort((a, b) => a.establishment.localeCompare(b.establishment));
  }, [filteredRecords]);

  const toggleEstablishment = (establishment: string) => {
    setExpandedEstablishments((current) => {
      const next = new Set(current);
      if (next.has(establishment)) {
        next.delete(establishment);
      } else {
        next.add(establishment);
      }
      return next;
    });
  };

  const monthLabel = specificMonth
    ? new Date(`${specificMonth}-01T00:00:00`).toLocaleString("default", { month: "long", year: "numeric" })
    : "all available months";

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

      {/* Visitor Records by Establishment */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Visitor records by establishment</h2>
          <p className="mt-1 text-sm text-gray-600">Click an establishment to expand and view the full {monthLabel} record.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Establishment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Records</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Male</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Female</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Visitors</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Places of Residence</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Locations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {groupedRecords.length > 0 ? (
                groupedRecords.map((group) => {
                  const isExpanded = expandedEstablishments.has(group.establishment);
                  return (
                    <Fragment key={group.establishment}>
                      <tr className="cursor-pointer hover:bg-gray-50" onClick={() => toggleEstablishment(group.establishment)}>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                            {group.establishment}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{group.records.length}</td>
                        <td className="px-6 py-4 text-blue-600 font-medium">{group.male}</td>
                        <td className="px-6 py-4 text-purple-600 font-medium">{group.female}</td>
                        <td className="px-6 py-4 text-gray-900 font-semibold">{group.total}</td>
                        <td className="px-6 py-4 text-gray-600">{Array.from(group.residenceTypes).join(", ")}</td>
                        <td className="px-6 py-4 text-gray-600">{Array.from(group.locations).join(", ")}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${group.establishment}-details`} className="bg-slate-50/80">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="max-h-80 overflow-auto overscroll-contain rounded-lg border border-gray-200 bg-white">
                              <table className="w-full min-w-[760px]">
                                <thead className="sticky top-0 z-10 bg-white border-b border-gray-200">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Guest/Group</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Male</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Female</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Place of Residence</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Location</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {group.records.map((record) => (
                                    <tr key={record.id}>
                                      <td className="px-4 py-3 text-sm text-gray-600">{record.date}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{record.guestName}</td>
                                      <td className="px-4 py-3 text-sm font-medium text-blue-600">{record.male}</td>
                                      <td className="px-4 py-3 text-sm font-medium text-purple-600">{record.female}</td>
                                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{record.total}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{record.residenceType}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{record.location}</td>
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
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
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