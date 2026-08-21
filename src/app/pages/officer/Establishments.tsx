import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Building2, MapPin, Phone, UserCog, Mail, Shield, X, Loader2, FileImage, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import { createEphemeralSupabaseClient, supabase } from "../../../lib/supabase";
import { datestampedFilename, downloadCsv } from "../../../lib/exportCsv";
import { getBusinessPermitImages } from "../../../lib/businessPermitImages";
import { DEFAULT_ROOM_CONFIG, EstablishmentRoomConfig, getRoomConfigFromAmenities, setRoomConfigInAmenities } from "../../../lib/establishmentRoomConfig";

interface Establishment {
  id: string;
  name: string;
  type: string;
  address: string;
  contact_number: string;
  total_rooms: number;
  status: string;
  staff_count?: number;
  business_permit_images?: string[];
  amenities?: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  establishment_id: string | null;
  status: string;
  created_at: string;
}

export default function Establishments() {
  const [activeTab, setActiveTab] = useState<"establishments" | "users">("establishments");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEstablishmentModal, setShowEstablishmentModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [pendingOnboarding, setPendingOnboarding] = useState<{ establishmentId: string; userId: string | null; email: string; fullName: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingEstablishment, setEditingEstablishment] = useState<Establishment | null>(null);
  const [viewingPermitEstablishment, setViewingPermitEstablishment] = useState<Establishment | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "establishment" | "user"; id: string } | null>(null);

  const [establishmentForm, setEstablishmentForm] = useState({
    name: "",
    type: "Hotel",
    address: "",
    contact_number: "",
    total_rooms: 0,
    room_config: DEFAULT_ROOM_CONFIG,
    status: "active",
  });

  const [userForm, setUserForm] = useState({
    full_name: "",
    email: "",
    role: "establishment_staff",
    establishment_id: "",
    status: "active",
  });

  const [newAccountForm, setNewAccountForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  useEffect(() => {
    fetchEstablishments();
    fetchUsers();
  }, []);

  async function fetchEstablishments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('establishments')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Error fetching establishments:", error);
      toast.error("Failed to load establishments");
    } else {
      setEstablishments(data || []);
    }
    setLoading(false);
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
  }

  const staffCountByEstablishment = users.reduce<Record<string, number>>((counts, user) => {
    if (user.role === "establishment_staff" && user.status !== "inactive" && user.establishment_id) {
      counts[user.establishment_id] = (counts[user.establishment_id] || 0) + 1;
    }
    return counts;
  }, {});

  const filteredEstablishments = establishments.filter((est) => {
    const matchesSearch = est.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || est.type === filterType;
    const matchesStatus = filterStatus === "all" || est.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddEstablishment = () => {
    setEditingEstablishment(null);
    setEstablishmentForm({
      name: "",
      type: "Hotel",
      address: "",
      contact_number: "",
      total_rooms: 0,
      room_config: DEFAULT_ROOM_CONFIG,
      status: "active",
    });
    setShowEstablishmentModal(true);
  };

  const handleAddStaffEstablishment = () => {
    setEditingEstablishment(null);
    setEditingUser(null);
    setEstablishmentForm({
      name: "",
      type: "Hotel",
      address: "",
      contact_number: "",
      total_rooms: 0,
      room_config: DEFAULT_ROOM_CONFIG,
      status: "active",
    });
    setNewAccountForm({
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
    });
    setOnboardingStep("form");
    setOtpCode("");
    setPendingOnboarding(null);
    setShowOnboardingModal(true);
  };

  const handleEditEstablishment = (id: string) => {
    const establishment = establishments.find((e) => e.id === id);
    if (establishment) {
      setEditingEstablishment(establishment);
      setEstablishmentForm({
        name: establishment.name,
        type: establishment.type,
        address: establishment.address,
        contact_number: establishment.contact_number,
        total_rooms: establishment.total_rooms,
        room_config: getRoomConfigFromAmenities(establishment.amenities),
        status: establishment.status,
      });
      setShowEstablishmentModal(true);
    }
  };

  const updateRoomConfig = (index: number, field: keyof EstablishmentRoomConfig, value: string | number) => {
    setEstablishmentForm((current) => ({
      ...current,
      room_config: current.room_config.map((room, roomIndex) =>
        roomIndex === index
          ? {
              ...room,
              [field]: field === "count" ? Math.max(0, Number.parseInt(String(value), 10) || 0) : String(value),
            }
          : room
      ),
    }));
  };

  const addRoomConfigRow = () => {
    setEstablishmentForm((current) => ({
      ...current,
      room_config: [...current.room_config, { type: "", code: "", count: 0 }],
    }));
  };

  const removeRoomConfigRow = (index: number) => {
    setEstablishmentForm((current) => ({
      ...current,
      room_config: current.room_config.filter((_, roomIndex) => roomIndex !== index),
    }));
  };

  const getNormalizedRoomConfig = () => {
    const normalizedRoomConfig = establishmentForm.room_config
      .map((room) => ({
        type: room.type.trim(),
        code: room.code.trim().toUpperCase(),
        count: Math.max(0, Number(room.count || 0)),
      }))
      .filter((room) => room.type && room.code);
    const roomTotal = normalizedRoomConfig.reduce((sum, room) => sum + room.count, 0);
    const totalRooms = roomTotal || establishmentForm.total_rooms;
    return { normalizedRoomConfig, totalRooms };
  };

  const handleSaveEstablishment = async () => {
    if (!establishmentForm.name || !establishmentForm.address || !establishmentForm.contact_number) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { normalizedRoomConfig, totalRooms } = getNormalizedRoomConfig();

    if (editingEstablishment) {
      const { error } = await supabase
        .from('establishments')
        .update({
          name: establishmentForm.name,
          type: establishmentForm.type,
          address: establishmentForm.address,
          contact_number: establishmentForm.contact_number,
          total_rooms: totalRooms,
          amenities: setRoomConfigInAmenities(editingEstablishment.amenities, normalizedRoomConfig),
          status: establishmentForm.status,
        })
        .eq('id', editingEstablishment.id);
      
      if (error) {
        toast.error("Failed to update: " + error.message);
      } else {
        toast.success("Establishment updated successfully");
        fetchEstablishments();
        setShowEstablishmentModal(false);
      }
    } else {
      const { error } = await supabase
        .from('establishments')
        .insert([{
          name: establishmentForm.name,
          type: establishmentForm.type,
          address: establishmentForm.address,
          contact_number: establishmentForm.contact_number,
          total_rooms: totalRooms,
          amenities: setRoomConfigInAmenities("", normalizedRoomConfig),
          status: establishmentForm.status,
        }]);
      
      if (error) {
        toast.error("Failed to add: " + error.message);
      } else {
        toast.success("Establishment added successfully");
        fetchEstablishments();
        setShowEstablishmentModal(false);
      }
    }
  };

  const createOnboardingEstablishment = async (normalizedRoomConfig: EstablishmentRoomConfig[], totalRooms: number) => {
    const payload = {
      p_name: establishmentForm.name.trim(),
      p_type: establishmentForm.type,
      p_address: establishmentForm.address.trim(),
      p_contact_number: establishmentForm.contact_number.trim(),
      p_total_rooms: totalRooms,
      p_amenities: setRoomConfigInAmenities("", normalizedRoomConfig),
      p_status: establishmentForm.status,
    };

    const { data: rpcId, error: rpcError } = await supabase.rpc('create_officer_onboarding_establishment', payload);

    if (!rpcError && rpcId) {
      return rpcId as string;
    }

    const { data: establishment, error: establishmentError } = await supabase
      .from('establishments')
      .insert([{
        name: payload.p_name,
        type: payload.p_type,
        address: payload.p_address,
        contact_number: payload.p_contact_number,
        total_rooms: payload.p_total_rooms,
        amenities: payload.p_amenities,
        status: payload.p_status,
      }])
      .select('id')
      .single();

    if (establishmentError || !establishment?.id) {
      const detail = rpcError && rpcError.code !== 'PGRST202' ? ` RPC failed: ${rpcError.message}.` : "";
      throw new Error(`${establishmentError?.message || "Failed to create establishment"}.${detail}`);
    }

    return establishment.id as string;
  };

  const handleCreateStaffWithEstablishment = async () => {
    const gmail = newAccountForm.email.trim().toLowerCase();

    if (!establishmentForm.name || !establishmentForm.address || !establishmentForm.contact_number || !newAccountForm.full_name || !gmail || !newAccountForm.password) {
      toast.error("Please fill in all required establishment and account fields");
      return;
    }

    if (!/^[^\s@]+@gmail\.com$/i.test(gmail)) {
      toast.error("Please use a valid Gmail address ending in @gmail.com");
      return;
    }

    if (newAccountForm.password.length < 8) {
      toast.error("Temporary password must be at least 8 characters");
      return;
    }

    if (newAccountForm.password !== newAccountForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    const { normalizedRoomConfig, totalRooms } = getNormalizedRoomConfig();
    setOnboardingSaving(true);

    let createdEstablishmentId: string | null = null;
    try {
      createdEstablishmentId = await createOnboardingEstablishment(normalizedRoomConfig, totalRooms);
      const authClient = createEphemeralSupabaseClient();
      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: gmail,
        password: newAccountForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: newAccountForm.full_name.trim(),
            role: "establishment_staff",
            establishment_id: createdEstablishmentId,
            status: "active",
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error("Supabase sent the confirmation email but did not return a user ID to link the profile");
      }

      const { error: profileRpcError } = await supabase.rpc('complete_officer_onboarding_staff_profile', {
        p_user_id: userId,
        p_email: gmail,
        p_full_name: newAccountForm.full_name.trim(),
        p_establishment_id: createdEstablishmentId,
        p_status: 'active',
      });

      if (profileRpcError) {
        throw new Error(profileRpcError.message);
      }

      toast.success("Staff profile created. Ask the staff to open the confirmation link sent to Gmail before logging in.");
      setShowOnboardingModal(false);
      setOnboardingStep("form");
      setOtpCode("");
      setPendingOnboarding(null);
      fetchEstablishments();
      fetchUsers();
    } catch (error) {
      if (createdEstablishmentId) {
        await supabase.from('establishments').delete().eq('id', createdEstablishmentId);
      }
      toast.error(`Failed to create account: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setOnboardingSaving(false);
    }
  };

  const handleVerifyOnboardingOtp = async () => {
    if (!pendingOnboarding) {
      toast.error("Please send the Gmail OTP first");
      return;
    }

    if (!/^\d{6}$/.test(otpCode.trim())) {
      toast.error("Enter the 6-digit OTP sent to Gmail");
      return;
    }

    setOnboardingSaving(true);
    try {
      const authClient = createEphemeralSupabaseClient();
      const { data, error } = await authClient.auth.verifyOtp({
        email: pendingOnboarding.email,
        token: otpCode.trim(),
        type: 'signup',
      });

      if (error) {
        throw new Error(error.message);
      }

      const userId = data.user?.id || pendingOnboarding.userId;
      if (!userId) {
        throw new Error("OTP verified but Supabase did not return a user ID");
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: pendingOnboarding.email,
          full_name: pendingOnboarding.fullName,
          role: "establishment_staff",
          establishment_id: pendingOnboarding.establishmentId,
          status: "active",
        });

      if (profileError) {
        throw new Error(profileError.message);
      }

      toast.success("Staff account verified and linked to the establishment.");
      setShowOnboardingModal(false);
      setOnboardingStep("form");
      setOtpCode("");
      setPendingOnboarding(null);
      fetchEstablishments();
      fetchUsers();
    } catch (error) {
      toast.error(`Failed to verify OTP: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setOnboardingSaving(false);
    }
  };

  const handleDeleteEstablishment = (id: string) => {
    setDeleteTarget({ type: "establishment", id });
    setShowDeleteConfirm(true);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setUserForm({
      full_name: "",
      email: "",
      role: "establishment_staff",
      establishment_id: "",
      status: "active",
    });
    setShowUserModal(true);
  };

  const handleEditUser = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      setEditingUser(user);
      setUserForm({
        full_name: user.full_name || "",
        email: user.email,
        role: user.role,
        establishment_id: user.establishment_id || "",
        status: user.status || "active",
      });
      setShowUserModal(true);
    }
  };

  const handleSaveUser = async () => {
    if (!userForm.full_name || !userForm.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingUser) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: userForm.full_name,
          role: userForm.role,
          establishment_id: userForm.establishment_id || null,
          status: userForm.status,
        })
        .eq('id', editingUser.id);
      
      if (error) {
        toast.error("Failed to update: " + error.message);
      } else {
        toast.success("User updated successfully");
        fetchUsers();
        setShowUserModal(false);
      }
    } else {
      toast.info("To add new users, please use Supabase Authentication dashboard first, then assign them here.");
    }
  };

  const handleDeleteUser = (id: string) => {
    setDeleteTarget({ type: "user", id });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "establishment") {
      const { error } = await supabase
        .from('establishments')
        .delete()
        .eq('id', deleteTarget.id);
      
      if (error) {
        toast.error("Failed to delete: " + error.message);
      } else {
        toast.success("Establishment deleted successfully");
        fetchEstablishments();
      }
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', deleteTarget.id);
      
      if (error) {
        toast.error("Failed to deactivate user: " + error.message);
      } else {
        toast.success("User deactivated successfully");
        fetchUsers();
      }
    }
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const handleExportEstablishments = () => {
    downloadCsv(
      datestampedFilename("establishments"),
      ["Name", "Type", "Address", "Contact", "Rooms", "Staff", "Status"],
      filteredEstablishments.map((establishment) => [
        establishment.name,
        establishment.type,
        establishment.address,
        establishment.contact_number,
        establishment.total_rooms || 0,
        staffCountByEstablishment[establishment.id] || 0,
        establishment.status,
      ])
    );
    toast.success(`Exported ${filteredEstablishments.length} establishment(s)`);
  };

  const handleExportUsers = () => {
    downloadCsv(
      datestampedFilename("users"),
      ["Full Name", "Email", "Role", "Establishment", "Status", "Created At"],
      filteredUsers.map((user) => {
        const establishment = establishments.find((e) => e.id === user.establishment_id);
        return [
          user.full_name || "Unknown",
          user.email,
          user.role === "municipal_officer" ? "Municipal Tourism Officer" : "Establishment Staff",
          establishment?.name || "N/A",
          user.status,
          user.created_at,
        ];
      })
    );
    toast.success(`Exported ${filteredUsers.length} user(s)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#1CA7C9]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Establishments</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage tourism establishments, staff assignments, and public listing records
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={activeTab === "establishments" ? handleExportEstablishments : handleExportUsers}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm sm:text-base whitespace-nowrap"
          >
            Export {activeTab === "establishments" ? "Establishments" : "Users"}
          </button>
          <button
            onClick={handleAddStaffEstablishment}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm sm:text-base whitespace-nowrap"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("establishments")}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "establishments"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Establishments</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "users"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <UserCog className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Users</span>
          </button>
        </div>
      </div>

      {activeTab === "establishments" ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search establishments..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all"
                >
                  <option value="all">All Types</option>
                  <option value="Resort">Resort</option>
                  <option value="Hotel">Hotel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-gray-600">Total Establishments</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{establishments.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-5 h-5 text-green-600" />
                <p className="text-sm text-gray-600">Active</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{establishments.filter((e) => e.status === "active").length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-gray-600">With Rooms</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{establishments.filter((e) => e.total_rooms > 0).length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-5 h-5 text-orange-600" />
                <p className="text-sm text-gray-600">Total Rooms</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{establishments.reduce((sum, e) => sum + (e.total_rooms || 0), 0)}</p>
            </div>
          </div>

          {/* Establishments Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Establishment</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rooms</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Permit</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Staff</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEstablishments.length > 0 ? (
                    filteredEstablishments.map((establishment) => (
                      <tr key={establishment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="font-medium text-gray-900">{establishment.name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{establishment.type}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{establishment.address}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span className="text-sm">{establishment.contact_number}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900">{establishment.total_rooms || "N/A"}</td>
                        <td className="px-6 py-4">
                          {getBusinessPermitImages(establishment).length > 0 ? (
                            <button
                              onClick={() => setViewingPermitEstablishment(establishment)}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {getBusinessPermitImages(establishment).length} image(s)
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                              <FileImage className="w-3.5 h-3.5" />
                              No permit
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-900">{staffCountByEstablishment[establishment.id] || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            establishment.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}>
                            {establishment.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditEstablishment(establishment.id)} className="p-1 text-gray-600 hover:bg-gray-100 rounded transition">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteEstablishment(establishment.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        No establishments found. Click "Add Record" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Users Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all"
                >
                  <option value="all">All Roles</option>
                  <option value="municipal_officer">Municipal Tourism Officer</option>
                  <option value="establishment_staff">Establishment Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <UserCog className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <UserCog className="w-5 h-5 text-green-600" />
                <p className="text-sm text-gray-600">Active Users</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{users.filter((u) => u.status === "active").length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-gray-600">Officers</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{users.filter((u) => u.role === "municipal_officer").length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <UserCog className="w-5 h-5 text-orange-600" />
                <p className="text-sm text-gray-600">Staff</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{users.filter((u) => u.role === "establishment_staff").length}</p>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Establishment</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const establishment = establishments.find(e => e.id === user.establishment_id);
                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium">{user.full_name?.charAt(0) || "?"}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{user.full_name || "Unknown"}</p>
                                <div className="flex items-center gap-1 text-gray-500 text-sm">
                                  <Mail className="w-3 h-3" />
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-purple-600" />
                              <span className="text-sm text-gray-700">{user.role === "municipal_officer" ? "Municipal Tourism Officer" : "Establishment Staff"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{establishment?.name || "N/A"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                              user.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            }`}>
                              {user.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleEditUser(user.id)} className="p-1 text-gray-600 hover:bg-gray-100 rounded transition">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteUser(user.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}


      {/* Business Permit Viewer */}
      {viewingPermitEstablishment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Business Permit</h2>
                <p className="text-sm text-gray-500 mt-1">{viewingPermitEstablishment.name}</p>
              </div>
              <button onClick={() => setViewingPermitEstablishment(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              {getBusinessPermitImages(viewingPermitEstablishment).length > 0 ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {getBusinessPermitImages(viewingPermitEstablishment).map((imageUrl, index) => (
                    <div key={imageUrl} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <a href={imageUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-white">
                        <img src={imageUrl} alt={`${viewingPermitEstablishment.name} business permit ${index + 1}`} className="max-h-[60vh] w-full object-contain" />
                      </a>
                      <a href={imageUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                        <ExternalLink className="w-4 h-4" />
                        Open full-size permit image {index + 1}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-500">
                  No business permit pictures have been uploaded for this establishment.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Combined Staff + Establishment Modal */}
      {showOnboardingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add User</h2>
                <p className="mt-1 text-sm text-gray-500">Create the establishment and staff profile, then Supabase emails the staff a confirmation link.</p>
              </div>
              <button onClick={() => setShowOnboardingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" disabled={onboardingSaving}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <>
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <h3 className="font-semibold text-gray-900">Staff account</h3>
                <p className="text-sm text-gray-600 mt-1">Only Gmail addresses are accepted. Supabase will email a confirmation link before the staff account can be used.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label><input type="text" value={newAccountForm.full_name} onChange={(e) => setNewAccountForm({ ...newAccountForm, full_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="Staff full name" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Gmail Address *</label><input type="email" value={newAccountForm.email} onChange={(e) => setNewAccountForm({ ...newAccountForm, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="staff@gmail.com" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Temporary Password *</label><input type="password" value={newAccountForm.password} onChange={(e) => setNewAccountForm({ ...newAccountForm, password: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="Minimum 8 characters" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label><input type="password" value={newAccountForm.confirm_password} onChange={(e) => setNewAccountForm({ ...newAccountForm, confirm_password: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="Re-type password" /></div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900">Establishment details</h3>
                <p className="text-sm text-gray-500 mt-1">This establishment will be automatically assigned to the new staff account.</p>
                <div className="mt-4 space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Establishment Name *</label><input type="text" value={establishmentForm.name} onChange={(e) => setEstablishmentForm({ ...establishmentForm, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="Enter establishment name" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Type *</label><select value={establishmentForm.type} onChange={(e) => setEstablishmentForm({ ...establishmentForm, type: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all"><option value="Resort">Resort</option><option value="Hotel">Hotel</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Address *</label><input type="text" value={establishmentForm.address} onChange={(e) => setEstablishmentForm({ ...establishmentForm, address: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="Enter address" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label><input type="text" value={establishmentForm.contact_number} onChange={(e) => setEstablishmentForm({ ...establishmentForm, contact_number: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="+63 917 123 4567" /></div>
                </div>
              </div>
              </>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowOnboardingModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700" disabled={onboardingSaving}>Cancel</button>
              <button onClick={handleCreateStaffWithEstablishment} disabled={onboardingSaving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1293B8] to-[#1CA7C9] text-white rounded-lg hover:shadow-lg hover:shadow-[#1CA7C9]/30 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                {onboardingSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create and Send Confirmation Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Establishment Modal */}
      {showEstablishmentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingEstablishment ? "Edit Establishment" : "Add New Establishment"}
              </h2>
              <button onClick={() => setShowEstablishmentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Establishment Name *</label>
                <input type="text" value={establishmentForm.name} onChange={(e) => setEstablishmentForm({ ...establishmentForm, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="Enter establishment name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                <select value={establishmentForm.type} onChange={(e) => {
                  const newType = e.target.value;
                  setEstablishmentForm({ ...establishmentForm, type: newType });
                }} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all">
                  <option value="Resort">Resort</option>
                  <option value="Hotel">Hotel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <input type="text" value={establishmentForm.address} onChange={(e) => setEstablishmentForm({ ...establishmentForm, address: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="Enter address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                <input type="text" value={establishmentForm.contact_number} onChange={(e) => setEstablishmentForm({ ...establishmentForm, contact_number: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="+63 917 123 4567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Rooms *</label>
                <input type="number" value={establishmentForm.total_rooms} onChange={(e) => setEstablishmentForm({ ...establishmentForm, total_rooms: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" min="0" />
                <p className="mt-1 text-xs text-gray-500">This is updated automatically when room rows below have counts.</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Room Names</label>
                    <p className="text-xs text-gray-500">These room names/codes appear in the establishment staff hotel report form.</p>
                  </div>
                  <button type="button" onClick={addRoomConfigRow} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100">
                    <Plus className="h-4 w-4" /> Add Room
                  </button>
                </div>
                <div className="space-y-3">
                  {establishmentForm.room_config.map((room, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1fr_120px_120px_auto]">
                      <input type="text" value={room.type} onChange={(e) => updateRoomConfig(index, "type", e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Room name e.g. Deluxe" />
                      <input type="text" value={room.code} onChange={(e) => updateRoomConfig(index, "code", e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase" placeholder="Code" />
                      <input type="number" min="0" value={room.count} onChange={(e) => updateRoomConfig(index, "count", e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Rooms" />
                      <button type="button" onClick={() => removeRoomConfigRow(index)} className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-red-600 hover:bg-red-50" aria-label="Remove room">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select value={establishmentForm.status} onChange={(e) => setEstablishmentForm({ ...establishmentForm, status: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowEstablishmentModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700">Cancel</button>
              <button onClick={handleSaveEstablishment} className="px-5 py-2.5 bg-gradient-to-r from-[#1293B8] to-[#1CA7C9] text-white rounded-lg hover:shadow-lg hover:shadow-[#1CA7C9]/30 transition-all font-medium">{editingEstablishment ? "Update" : "Add"} Establishment</button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900">{editingUser ? "Edit User" : "Add New User"}</h2>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label><input type="text" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="Enter full name" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label><input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" placeholder="user@example.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Role *</label><select value={userForm.role} onChange={(e) => { const newRole = e.target.value; setUserForm({ ...userForm, role: newRole, establishment_id: newRole === "municipal_officer" ? "" : userForm.establishment_id }); }} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all"><option value="municipal_officer">Municipal Tourism Officer</option><option value="establishment_staff">Establishment Staff</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Establishment</label><select value={userForm.establishment_id} onChange={(e) => setUserForm({ ...userForm, establishment_id: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all" disabled={userForm.role === "municipal_officer"}><option value="">Select an establishment</option>{establishments.map((est) => (<option key={est.id} value={est.id}>{est.name}</option>))}</select>{userForm.role === "establishment_staff" && <p className="text-xs text-gray-500 mt-1">Select the establishment this staff member belongs to</p>}</div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Status</label><select value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1CA7C9]/50 focus:border-[#1CA7C9] outline-none transition-all"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowUserModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700">Cancel</button>
              <button onClick={handleSaveUser} className="px-5 py-2.5 bg-gradient-to-r from-[#1293B8] to-[#1CA7C9] text-white rounded-lg hover:shadow-lg hover:shadow-[#1CA7C9]/30 transition-all font-medium">{editingUser ? "Update" : "Add"} User</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Delete</h2>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this {deleteTarget.type}? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700">Cancel</button>
                <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 transition-all font-medium">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}