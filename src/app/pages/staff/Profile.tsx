import { useState, useEffect } from "react";
import { Save, User, Mail, Building2, MapPin, Upload, Trash2, ExternalLink, FileImage } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";
import { getBusinessPermitImages, setBusinessPermitImagesInAmenities } from "../../../lib/businessPermitImages";

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  contact_number: string;
  position: string;
  establishment_name: string;
  establishment_address: string;
  establishment_type: string;
  establishment_id: string | null;
  business_permit_images: string[];
  establishment_amenities: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPermit, setUploadingPermit] = useState(false);
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
    let establishmentAmenities = "";
    let businessPermitImages: string[] = [];
    
    if (profileData.establishment_id) {
      const { data: estData } = await supabase
        .from("establishments")
        .select("*")
        .eq("id", profileData.establishment_id)
        .single();
      
      if (estData) {
        establishmentName = estData.name;
        establishmentAddress = estData.address;
        establishmentType = estData.type;
        establishmentAmenities = estData.amenities || "";
        businessPermitImages = getBusinessPermitImages(estData);
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
      establishment_id: profileData.establishment_id || null,
      business_permit_images: businessPermitImages,
      establishment_amenities: establishmentAmenities,
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


  const persistBusinessPermitImages = async (nextImages: string[]) => {
    if (!profile?.establishment_id) {
      toast.error("No establishment linked to this account");
      return false;
    }

    const nextAmenities = setBusinessPermitImagesInAmenities(profile.establishment_amenities, nextImages);

    const { error } = await supabase
      .from("establishments")
      .update({
        amenities: nextAmenities,
        updated_at: new Date(),
      })
      .eq("id", profile.establishment_id);

    if (error) {
      toast.error("Failed to save business permit images: " + error.message);
      return false;
    }

    setProfile(prev => prev ? { ...prev, business_permit_images: nextImages, establishment_amenities: nextAmenities } : prev);
    return true;
  };

  const handleBusinessPermitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !profile?.establishment_id) return;

    setUploadingPermit(true);
    const nextImages = [...(profile.business_permit_images || [])];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `business-permits/${profile.establishment_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("establishment-images")
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("establishment-images")
        .getPublicUrl(filePath);

      nextImages.push(publicUrl);
    }

    if (nextImages.length !== (profile.business_permit_images || []).length) {
      const saved = await persistBusinessPermitImages(nextImages);
      if (saved) toast.success("Business permit image uploaded");
    }

    e.target.value = "";
    setUploadingPermit(false);
  };

  const removeBusinessPermitImage = async (index: number) => {
    const nextImages = (profile?.business_permit_images || []).filter((_, i) => i !== index);
    const saved = await persistBusinessPermitImages(nextImages);
    if (saved) toast.success("Business permit image removed");
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

          <div className="mt-6 border-t border-gray-100 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-emerald-600" />
                  Business Permit Pictures
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Upload clear pictures of your business permit for municipal officer review. These are not shown on the public tourism page.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">
                <Upload className="w-4 h-4" />
                {uploadingPermit ? "Uploading..." : "Upload Permit"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBusinessPermitUpload}
                  disabled={uploadingPermit}
                  className="hidden"
                />
              </label>
            </div>

            {(profile?.business_permit_images || []).length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(profile?.business_permit_images || []).map((imageUrl, index) => (
                  <div key={imageUrl} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <a href={imageUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-white">
                      <img src={imageUrl} alt={`Business permit ${index + 1}`} className="h-40 w-full object-cover" />
                    </a>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <a href={imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                        <ExternalLink className="w-4 h-4" />
                        View full image
                      </a>
                      <button
                        type="button"
                        onClick={() => removeBusinessPermitImage(index)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                No business permit pictures uploaded yet.
              </div>
            )}
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