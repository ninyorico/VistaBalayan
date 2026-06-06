import { useState, useEffect } from "react";
import { Save, User, Mail, Phone, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  contact_number: string;
  position: string;
  establishment_name: string;
  establishment_address: string;
  establishment_type: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    contact_number: "",
    position: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("No user found");
      setLoading(false);
      return;
    }
    
    // Get profile data
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (profileError) {
      console.error("Error loading profile:", profileError);
      setLoading(false);
      return;
    }
    
    // Get establishment data if user is staff
    let establishmentName = "N/A";
    let establishmentAddress = "N/A";
    let establishmentType = "N/A";
    
    if (profileData.establishment_id) {
      const { data: estData } = await supabase
        .from("establishments")
        .select("name, address, type")
        .eq("id", profileData.establishment_id)
        .single();
      
      if (estData) {
        establishmentName = estData.name;
        establishmentAddress = estData.address;
        establishmentType = estData.type;
      }
    }
    
    setProfile({
      id: user.id,
      email: user.email || "",
      full_name: profileData.full_name || "",
      contact_number: profileData.contact_number || "",
      position: profileData.position || "Establishment Staff",
      establishment_name: establishmentName,
      establishment_address: establishmentAddress,
      establishment_type: establishmentType,
    });
    
    setFormData({
      full_name: profileData.full_name || "",
      contact_number: profileData.contact_number || "",
      position: profileData.position || "Establishment Staff",
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("User not found");
      setSaving(false);
      return;
    }
    
    // Update profile in database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        contact_number: formData.contact_number,
        position: formData.position,
        updated_at: new Date(),
      })
      .eq("id", user.id);
    
    if (updateError) {
      toast.error("Failed to update profile: " + updateError.message);
      setSaving(false);
      return;
    }
    
    // Update local state
    setProfile(prev => prev ? {
      ...prev,
      full_name: formData.full_name,
      contact_number: formData.contact_number,
      position: formData.position,
    } : null);
    
    toast.success("Profile updated successfully");
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!formData.new_password) {
      toast.error("Please enter a new password");
      return;
    }
    
    if (formData.new_password !== formData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }
    
    if (formData.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setSaving(true);
    
    const { error } = await supabase.auth.updateUser({
      password: formData.new_password
    });
    
    if (error) {
      toast.error("Failed to update password: " + error.message);
    } else {
      toast.success("Password updated successfully");
      setFormData({
        ...formData,
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1CA7C9] mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">
          Manage your account and profile information
        </p>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Profile Information
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number
              </label>
              <input
                type="tel"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="+63 912 345 6789"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Establishment Information (for staff users) */}
      {profile?.establishment_name !== "N/A" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-600" />
            Establishment Information
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Establishment Name
                </label>
                <input
                  type="text"
                  value={profile?.establishment_name || ""}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Establishment Type
                </label>
                <input
                  type="text"
                  value={profile?.establishment_type || ""}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
              </label>
              <input
                type="text"
                value={profile?.establishment_address || ""}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-orange-600" />
          Change Password
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                placeholder="Enter new password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                placeholder="Confirm new password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          {formData.new_password && formData.confirm_password && formData.new_password !== formData.confirm_password && (
            <p className="text-sm text-red-600">Passwords do not match</p>
          )}
          {formData.new_password && formData.new_password.length < 6 && (
            <p className="text-sm text-red-600">Password must be at least 6 characters</p>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleChangePassword}
              disabled={saving || !formData.new_password || formData.new_password !== formData.confirm_password || formData.new_password.length < 6}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Update Password
            </button>
          </div>
        </div>
      </div>

      {/* Save Profile Button */}
      <div className="flex justify-end">
        <button
          onClick={handleUpdateProfile}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? "Saving..." : "Save Profile Changes"}
        </button>
      </div>
    </div>
  );
}