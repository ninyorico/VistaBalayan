import { useState, useEffect } from 'react'
import { Save, Globe, Clock, Phone, Mail, MapPin, Info, ImagePlus, Building2, X, Navigation, Crosshair } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { compressListingImage } from '../../../lib/listingImages'
import { toast } from 'sonner'

const BALAYAN_CENTER = { latitude: 13.9385, longitude: 120.7332 }

const toCoordinateInput = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? String(value) : '')

const parseCoordinate = (value: string, min: number, max: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null
}

const getMapQuery = (latitude?: string | number | null, longitude?: string | number | null, fallbackAddress = '') => {
  const lat = typeof latitude === 'number' ? latitude : parseCoordinate(String(latitude || ''), -90, 90)
  const lng = typeof longitude === 'number' ? longitude : parseCoordinate(String(longitude || ''), -180, 180)
  if (lat !== null && lng !== null) return `${lat},${lng}`
  return fallbackAddress || `${BALAYAN_CENTER.latitude},${BALAYAN_CENTER.longitude}`
}

const getGoogleMapsEmbedUrl = (query: string) => `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`
const getGoogleMapsUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
const LOCATION_PIN_PATTERN = /\n?\[LOCATION_PIN:-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?\]/

const readLocationPinFromAmenities = (amenities = '') => {
  const match = amenities.match(/\[LOCATION_PIN:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/)
  if (!match) return null
  const latitude = parseCoordinate(match[1], -90, 90)
  const longitude = parseCoordinate(match[2], -180, 180)
  return latitude !== null && longitude !== null ? { latitude, longitude } : null
}

const stripLocationPin = (amenities = '') => amenities.replace(LOCATION_PIN_PATTERN, '').trim()
const writeLocationPin = (amenities: string, latitude: number | null, longitude: number | null) => {
  const cleanAmenities = stripLocationPin(amenities)
  if (latitude === null || longitude === null) return cleanAmenities
  return `${cleanAmenities}${cleanAmenities ? '\n' : ''}[LOCATION_PIN:${latitude},${longitude}]`
}

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
    latitude: '',
    longitude: '',
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
        const storedPin = readLocationPinFromAmenities(est.amenities || '')
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
          amenities: stripLocationPin(est.amenities || ''),
          latitude: toCoordinateInput(est.latitude ?? storedPin?.latitude),
          longitude: toCoordinateInput(est.longitude ?? storedPin?.longitude),
        })
        setImages(est.images || [])
      }
    }
    
    setLoading(false)
  }

  const saveListingImages = async (nextImages: string[]) => {
    if (!establishment) return false

    const { error } = await supabase
      .from('establishments')
      .update({
        images: nextImages,
        updated_at: new Date(),
      })
      .eq('id', establishment.id)

    if (error) {
      toast.error('Photos uploaded, but publishing them failed: ' + error.message)
      return false
    }

    setImages(nextImages)
    setEstablishment((current: any) => current ? { ...current, images: nextImages } : current)
    return true
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !establishment) return

    setUploading(true)
    const uploadedImages: string[] = []
    const fallbackImages: string[] = []
    const failedFiles: string[] = []

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          failedFiles.push(`${file.name} is not an image file`)
          continue
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `public/${establishment.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('establishment-images')
          .upload(filePath, file)

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('establishment-images')
            .getPublicUrl(filePath)

          uploadedImages.push(publicUrl)
          continue
        }

        console.warn('Storage upload failed; saving compressed listing image directly:', uploadError)
        try {
          const compressedImage = await compressListingImage(file)
          if (compressedImage.length > 900_000) {
            failedFiles.push(`${file.name} is too large. Please use a smaller or cropped photo.`)
            continue
          }
          fallbackImages.push(compressedImage)
        } catch (error) {
          failedFiles.push(error instanceof Error ? error.message : `Unable to process ${file.name}`)
        }
      }

      const nextUploads = [...uploadedImages, ...fallbackImages]
      if (nextUploads.length === 0) {
        toast.error(failedFiles[0] || 'No photos were uploaded. Please try again.')
        return
      }

      const nextImages = [...images, ...nextUploads]
      const published = await saveListingImages(nextImages)
      if (published) {
        const fallbackNote = fallbackImages.length > 0 ? ' Storage was unavailable, so compressed photos were saved directly.' : ''
        const failedNote = failedFiles.length > 0 ? ` ${failedFiles.length} file(s) were skipped.` : ''
        toast.success(`Photos uploaded and published to the public website.${fallbackNote}${failedNote}`)
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeImage = async (index: number) => {
    const nextImages = images.filter((_, i) => i !== index)
    const published = await saveListingImages(nextImages)
    if (published) toast.success('Photo removed from the public website.')
  }

  const currentMapQuery = getMapQuery(formData.latitude, formData.longitude, formData.address)
  const hasExactCoordinates = parseCoordinate(formData.latitude, -90, 90) !== null && parseCoordinate(formData.longitude, -180, 180) !== null

  const useCurrentLocationAsPin = () => {
    if (!navigator.geolocation) {
      toast.error('Location access is not available in this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
        }))
        toast.success('Map pin set from your current location. Review the preview before publishing.')
      },
      () => toast.error('Unable to get your location. You can still paste the coordinates from Google Maps.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async () => {
    if (!establishment) return

    const latitude = parseCoordinate(formData.latitude, -90, 90)
    const longitude = parseCoordinate(formData.longitude, -180, 180)
    if ((formData.latitude.trim() || formData.longitude.trim()) && (latitude === null || longitude === null)) {
      toast.error('Please enter valid latitude and longitude coordinates before publishing.')
      return
    }
    
    setSaving(true)

    const listingUpdates = {
      name: formData.name,
      type: formData.type,
      address: formData.address,
      contact_number: formData.contact_number,
      description: formData.description,
      opening_hours: formData.opening_hours,
      website_url: formData.website_url,
      email: formData.email,
      amenities: writeLocationPin(formData.amenities, latitude, longitude),
      images: images,
      updated_at: new Date(),
    }

    let { error } = await supabase
      .from('establishments')
      .update({
        ...listingUpdates,
        latitude,
        longitude,
      })
      .eq('id', establishment.id)

    if (error && /latitude|longitude|schema cache|column/i.test(error.message)) {
      const retry = await supabase
        .from('establishments')
        .update(listingUpdates)
        .eq('id', establishment.id)
      error = retry.error
    }
    
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-800">🏢 Manage Your Public Listing</h2>
        <p className="text-sm text-blue-700 mt-1">
          Information you enter here will be displayed on the public tourism website where visitors can discover your establishment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Establishment Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

              <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-[#0E5A72]" /> Exact Google Maps Pin
                    </label>
                    <p className="text-xs leading-5 text-gray-600">
                      Set the establishment coordinates so visitors can open the exact pinned location from the public website.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={useCurrentLocationAsPin}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0E5A72] px-3 py-2 text-xs font-semibold text-white hover:bg-[#073B4C]"
                    >
                      <Crosshair className="w-4 h-4" /> Use my location
                    </button>
                    <a
                      href={getGoogleMapsUrl(currentMapQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-[#0E5A72] hover:bg-teal-50"
                    >
                      <Navigation className="w-4 h-4" /> Open Google Maps
                    </a>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="13.9385000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="120.7332000"
                    />
                  </div>
                </div>
                <div className="mt-4 overflow-hidden rounded-xl border border-teal-100 bg-white">
                  <iframe
                    title="Google Maps listing pin preview"
                    src={getGoogleMapsEmbedUrl(currentMapQuery)}
                    className="h-56 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {hasExactCoordinates ? 'Exact coordinates are ready to publish.' : 'Tip: open Google Maps, right-click the exact pin, then paste the copied latitude and longitude here.'}
                </p>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
              {hasExactCoordinates && <li>✓ Exact Google Maps location pin</li>}
            </ul>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Publishing...' : 'Publish to Public Website'}
          </button>
        </div>
      </div>
    </div>
  )
}