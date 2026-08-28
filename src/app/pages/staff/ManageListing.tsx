import { useState, useEffect } from 'react'
import { Save, Upload, Trash2, Globe, Clock, Phone, Mail, MapPin, Info, ImagePlus, Building2, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { toast } from 'sonner'

export default function ManageListing() {
  const [establishment, setEstablishment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    address: '',
    contact_number: '',
    description: '',
    opening_hours: '',
    website_url: '',
    email: '',
    amenities: '',
  })

  useEffect(() => {
    loadEstablishment()
  }, [])

  const loadEstablishment = async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Get profile with establishment
    const { data: profile } = await supabase
      .from('profiles')
      .select('establishment_id')
      .eq('id', user.id)
      .single()
    
    if (profile?.establishment_id) {
      const { data: est } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', profile.establishment_id)
        .single()
      
      if (est) {
        setEstablishment(est)
        setFormData({
          name: est.name || '',
          type: est.type || '',
          address: est.address || '',
          contact_number: est.contact_number || '',
          description: est.description || '',
          opening_hours: est.opening_hours || '',
          website_url: est.website_url || '',
          email: est.email || '',
          amenities: est.amenities || '',
        })
        setImages(est.images || [])
      }
    }
    
    setLoading(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !establishment) return
    
    setUploading(true)
    const newImages = [...images]
    
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `public/${establishment.id}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('establishment-images')
        .upload(filePath, file)
      
      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('establishment-images')
        .getPublicUrl(filePath)
      
      newImages.push(publicUrl)
    }
    
    setImages(newImages)
    setUploading(false)
    toast.success('Photos uploaded')
  }

  const removeImage = async (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!establishment) return
    
    setSaving(true)
    
    const { error } = await supabase
      .from('establishments')
      .update({
        name: formData.name,
        type: formData.type,
        address: formData.address,
        contact_number: formData.contact_number,
        description: formData.description,
        opening_hours: formData.opening_hours,
        website_url: formData.website_url,
        email: formData.email,
        amenities: formData.amenities,
        images: images,
        updated_at: new Date(),
      })
      .eq('id', establishment.id)
    
    if (error) {
      toast.error('Failed to update: ' + error.message)
    } else {
      toast.success('Your public listing has been updated! Visitors will see the changes immediately.')
    }
    
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1CA7C9] mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!establishment) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">No Establishment Found</h2>
        <p className="text-gray-600 mt-2">Your account is not associated with any establishment.</p>
        <p className="text-gray-500 text-sm mt-1">Please contact the Municipal Tourism Office.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="vista-card p-5">
        <h2 className="font-semibold text-[#0B2530]">Manage Your Public Listing</h2>
        <p className="text-sm text-[#0E5A72] mt-1">
          Information you enter here will be displayed on the public tourism website where visitors can discover your establishment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="vista-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Establishment Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#168AAD]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#168AAD]"
                >
                  <option value="Resort">Resort</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Inn">Inn</option>
                  <option value="Food & Beverage Establishment">Restaurant / Cafe</option>
                  <option value="Tourist Attraction">Tourist Attraction</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Brgy. Sampaga, Balayan, Batangas"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Phone className="w-4 h-4" /> Contact Number
                  </label>
                  <input
                    type="text"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="+63 912 345 6789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Mail className="w-4 h-4" /> Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="contact@yourbusiness.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Globe className="w-4 h-4" /> Website (Optional)
                </label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Opening Hours
                </label>
                <input
                  type="text"
                  value={formData.opening_hours}
                  onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Mon-Sun: 8:00 AM - 8:00 PM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Info className="w-4 h-4" /> Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Describe your establishment, amenities, nearby attractions, unique features..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Images Section */}
        <div className="space-y-6">
          <div className="vista-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img src={img} alt={`Photo ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center h-24 cursor-pointer hover:border-blue-500 transition">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
                <ImagePlus className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">{uploading ? 'Uploading...' : 'Add Photos'}</span>
              </label>
            </div>
            <p className="text-xs text-gray-500">Showcase your establishment with photos</p>
          </div>

          {/* Preview Card */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3">📱 Public Preview</h3>
            <p className="text-sm text-gray-600">Visitors will see:</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>✓ {formData.name || 'Your business name'}</li>
              <li>✓ {formData.type || 'Category'}</li>
              {formData.description && <li>✓ Your description</li>}
              {images.length > 0 && <li>✓ {images.length} photo(s)</li>}
              {formData.contact_number && <li>✓ Contact information</li>}
            </ul>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 vista-button-primary"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Publishing...' : 'Publish to Public Website'}
          </button>
        </div>
      </div>
    </div>
  )
}