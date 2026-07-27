import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Save, Send, Settings, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";
import { calculateAccommodationOccupancy } from "../../../lib/reportMetrics";
import { canSubmitAccommodationReport } from "../../../lib/establishmentReportForms";

interface RoomOccupancy {
  roomType: string;
  roomCode: string;
  numberOfRooms: number;
  occupied: number;
  checkIns: number;
  guestNights: number;
}

const roomTypes = [
  { type: "Green", code: "G" },
  { type: "Red", code: "R" },
  { type: "Orange", code: "O" },
  { type: "Rose", code: "RS" },
  { type: "Blue", code: "B" },
  { type: "Ocean View", code: "OV" },
];

const parseNonNegativeInteger = (value: string) => {
  if (value.trim() === "") return 0;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const numericInputValue = (value: number) => (value === 0 ? "" : String(value));

export default function SubmitAccommodationReport() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [establishmentName, setEstablishmentName] = useState("Loading...");
  const [showRoomSetup, setShowRoomSetup] = useState(false);
  const [tempRoomCounts, setTempRoomCounts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [reportDate, setReportDate] = useState(getTodayDate());

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoadingProfile(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setError("No user found. Please log in.");
      setLoadingProfile(false);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (!profileData) {
      setError("Profile not found");
      setLoadingProfile(false);
      return;
    }

    setProfile(profileData);
    
    if (!profileData.establishment_id) {
      setError("No establishment associated with your account. Please contact the municipal tourism officer.");
      setLoadingProfile(false);
      return;
    }

    const { data: est, error: estError } = await supabase
      .from('establishments')
      .select('name,type,total_rooms')
      .eq('id', profileData.establishment_id)
      .single();

    if (estError || !est) {
      setError("Could not load your establishment information");
      setLoadingProfile(false);
      return;
    }

    setEstablishmentName(est?.name || "Your Establishment");

    if (!canSubmitAccommodationReport(est)) {
      toast.error("This establishment is assigned to resort visitor reports only.");
      navigate("/staff", { replace: true });
      return;
    }

    setLoadingProfile(false);
  };

  const loadRoomConfig = () => {
    const saved = localStorage.getItem("roomConfiguration");
    if (saved) {
      return JSON.parse(saved);
    }
    return {};
  };

  const [roomData, setRoomData] = useState<RoomOccupancy[]>(() => {
    const savedConfig = loadRoomConfig();
    return roomTypes.map((room) => ({
      roomType: room.type,
      roomCode: room.code,
      numberOfRooms: savedConfig[room.code] || 0,
      occupied: 0,
      checkIns: 0,
      guestNights: 0,
    }));
  });

  useEffect(() => {
    const savedConfig = loadRoomConfig();
    setTempRoomCounts(savedConfig);
  }, []);

  const totalRooms = roomData.reduce(
    (sum, r) => sum + Number(r.numberOfRooms || 0),
    0
  );

  const saveRoomConfiguration = () => {
    const config: Record<string, number> = {};
    roomTypes.forEach((room) => {
      config[room.code] = tempRoomCounts[room.code] || 0;
    });
    localStorage.setItem("roomConfiguration", JSON.stringify(config));

    setRoomData(
      roomData.map((room) => ({
        ...room,
        numberOfRooms: config[room.roomCode] || 0,
      }))
    );

    setShowRoomSetup(false);
    toast.success("Room configuration saved successfully");
  };

  const updateRoomData = (index: number, field: string, value: number | string) => {
    setRoomData(
      roomData.map((room, i) => {
        if (i === index) {
          const numericValue = typeof value === "number" ? Math.max(0, value) : value;
          const updatedRoom = { ...room, [field]: numericValue };

          if (field === "occupied" && Number(numericValue) > Number(room.numberOfRooms || 0)) {
            toast.error("Occupied rooms cannot exceed configured rooms for this room type");
            return room;
          }

          return updatedRoom;
        }
        return room;
      })
    );
  };

  const totalOccupiedRooms = roomData.reduce(
    (sum, r) => sum + Number(r.occupied || 0),
    0
  );
  const totalCheckIns = roomData.reduce(
    (sum, r) => sum + Number(r.checkIns || 0),
    0
  );
  const totalGuestNights = roomData.reduce(
    (sum, r) => sum + Number(r.guestNights || 0),
    0
  );

  const avgGuestNight =
    totalCheckIns > 0 ? (totalGuestNights / totalCheckIns).toFixed(2) : "0.00";
  const avgOccupancyRate = calculateAccommodationOccupancy(
    totalOccupiedRooms,
    totalRooms,
    reportDate
  ).toFixed(2);
  const avgGuestPerRoom =
    totalOccupiedRooms > 0
      ? (totalGuestNights / totalOccupiedRooms).toFixed(2)
      : "0.00";

  const handleSaveDraft = () => {
    toast.success("Draft saved successfully");
  };

  const handleSubmit = async () => {
    if (!profile?.establishment_id) {
      toast.error("No establishment associated with your account");
      return;
    }

    if (totalRooms === 0) {
      toast.error("Please configure rooms first");
      return;
    }

    const invalidOccupiedRoom = roomData.find(
      (room) => Number(room.occupied || 0) > Number(room.numberOfRooms || 0)
    );

    if (invalidOccupiedRoom) {
      toast.error(`${invalidOccupiedRoom.roomType} occupied rooms cannot exceed configured rooms`);
      return;
    }

    if (totalOccupiedRooms > totalRooms) {
      toast.error("Total occupied rooms cannot exceed total configured rooms");
      return;
    }

    setSubmitting(true);

    // Insert into accommodation_reports
    const { data: reportData, error: reportError } = await supabase
      .from("accommodation_reports")
      .insert({
        establishment_id: profile.establishment_id,
        submitted_by: profile.id,
        report_date: reportDate,
        total_rooms: totalRooms,
        total_occupied_rooms: totalOccupiedRooms,
        total_check_ins: totalCheckIns,
        total_guest_nights: totalGuestNights,
        status: "pending",
      })
      .select()
      .single();

    if (reportError) {
      toast.error("Failed to submit report: " + reportError.message);
      setSubmitting(false);
      return;
    }

    // Insert room details
    const roomDetails = roomData.map(room => ({
      accommodation_report_id: reportData.id,
      room_type: room.roomType,
      room_code: room.roomCode,
      number_of_rooms: room.numberOfRooms,
      occupied_rooms: room.occupied,
      check_ins: room.checkIns,
      guest_nights: room.guestNights,
      is_rent_mode: false,
    }));

    const { error: detailsError } = await supabase
      .from("room_occupancy_details")
      .insert(roomDetails);

    if (detailsError) {
      toast.error("Failed to save room details: " + detailsError.message);
    } else {
      toast.success("Hotel report submitted successfully");
      // Reset form
      setRoomData(roomData.map(room => ({
        ...room,
        occupied: 0,
        checkIns: 0,
        guestNights: 0,
      })));
      setReportDate(getTodayDate());
    }
    setSubmitting(false);
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1CA7C9] mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Form</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-[#1CA7C9] text-white rounded-lg hover:bg-[#0F4C75] transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Submit Hotels Report
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            For hotel establishments with accommodation rooms
          </p>
        </div>
        <button
          onClick={() => setShowRoomSetup(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Configure Rooms</span>
          <span className="sm:hidden">Configure</span>
        </button>
      </div>

      {/* Room Setup Modal */}
      {showRoomSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Room Configuration</h2>
              <p className="text-gray-600 mt-1">
                Set the number of rooms for each room type. This will be saved for future reports.
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {roomTypes.map((room) => (
                  <div key={room.code} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-gray-100 rounded font-mono text-sm font-semibold">
                        {room.code}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{room.type}</p>
                        <p className="text-sm text-gray-500">Room Type</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Number of Rooms:</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={numericInputValue(tempRoomCounts[room.code] || 0)}
                        onChange={(e) =>
                          setTempRoomCounts({
                            ...tempRoomCounts,
                            [room.code]: parseNonNegativeInteger(e.target.value),
                          })
                        }
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total Rooms:</strong>{" "}
                  {Object.values(tempRoomCounts).reduce((sum, count) => sum + Number(count || 0), 0)}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowRoomSetup(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveRoomConfiguration}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Establishment Name</label>
            <input type="text" value={establishmentName} disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Date</label>
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Rooms</label>
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold">
              {totalRooms}
            </div>
          </div>
        </div>
      </div>

      {/* Room Occupancy Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily Room Occupancy</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Room Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Room Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Number of Rooms</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Occupied Rooms</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Guest Check-ins</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Guest Nights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roomData.map((room, index) => {
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{room.roomType}</td>
                    <td className="px-6 py-4"><span className="px-3 py-1 bg-gray-100 rounded font-mono text-sm">{room.roomCode}</span></td>
                    <td className="px-6 py-4"><div className="w-24 px-3 py-2 bg-gray-50 border rounded-lg text-sm font-semibold">{room.numberOfRooms}</div></td>
                    <td className="px-6 py-4">
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={numericInputValue(room.occupied)} onChange={(e) => updateRoomData(index, "occupied", parseNonNegativeInteger(e.target.value))} className="w-24 px-3 py-2 border rounded-lg" placeholder="0" />
                    </td>
                    <td className="px-6 py-4">
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={numericInputValue(room.checkIns)} onChange={(e) => updateRoomData(index, "checkIns", parseNonNegativeInteger(e.target.value))} className="w-24 px-3 py-2 border border-gray-300 rounded-lg" placeholder="0" />
                    </td>
                    <td className="px-6 py-4">
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={numericInputValue(room.guestNights)} onChange={(e) => updateRoomData(index, "guestNights", parseNonNegativeInteger(e.target.value))} className="w-24 px-3 py-2 border border-gray-300 rounded-lg" placeholder="0" />
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4" colSpan={2}>Total</td>
                <td className="px-6 py-4 text-blue-600">{totalRooms}</td>
                <td className="px-6 py-4 text-blue-600">{totalOccupiedRooms}</td>
                <td className="px-6 py-4 text-blue-600">{totalCheckIns}</td>
                <td className="px-6 py-4 text-blue-600">{totalGuestNights}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Computed Analytics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Computed Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-700 font-medium mb-1">Average Guest Night</p>
            <p className="text-3xl font-bold text-blue-900">{avgGuestNight}</p>
            <p className="text-xs text-blue-600 mt-1">nights per guest</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm text-purple-700 font-medium mb-1">Average Room Occupancy Rate</p>
            <p className="text-3xl font-bold text-purple-900">{avgOccupancyRate}%</p>
            <p className="text-xs text-purple-600 mt-1">monthly average</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-green-700 font-medium mb-1">Average Guest Per Room</p>
            <p className="text-3xl font-bold text-green-900">{avgGuestPerRoom}</p>
            <p className="text-xs text-green-600 mt-1">guests per room</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button onClick={handleSaveDraft} className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
          <Save className="w-5 h-5" /> Save Draft
        </button>
        <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Send className="w-5 h-5" /> {submitting ? "Submitting..." : "Submit Hotel Report"}
        </button>
      </div>
    </div>
  );
}