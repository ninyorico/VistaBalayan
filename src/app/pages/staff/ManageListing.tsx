import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Save, Globe, Clock, Phone, Mail, MapPin, Info, ImagePlus, Building2, X, Navigation, Crosshair, Search } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { compressListingImage } from '../../../lib/listingImages'
import { toast } from 'sonner'

const BALAYAN_CENTER = { latitude: 13.9385, longitude: 120.7332 }
const LEAFLET_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const listingPinIcon = L.divIcon({
  className: '',
  html: '<div style="width:30px;height:30px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:#0E5A72;border:3px solid white;box-shadow:0 8px 20px rgba(15,23,42,.28);"><div style="width:10px;height:10px;border-radius:9999px;background:white;margin:7px auto;"></div></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
})

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

const getOpenStreetMapUrl = (query: string) => `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`
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

const cleanSearchPart = (value = '') => value.replace(/\s+/g, ' ').trim()
const buildMapSearchCandidates = (searchText: string, establishmentName: string, address: string) => {
  const typedQuery = cleanSearchPart(searchText)
  const name = cleanSearchPart(establishmentName)
  const listingAddress = cleanSearchPart(address)
  const primaryQuery = typedQuery || name || listingAddress
  const rawCandidates = [
    primaryQuery && listingAddress && primaryQuery !== listingAddress ? `${primaryQuery}, ${listingAddress}` : '',
    primaryQuery,
    typedQuery && name && listingAddress && typedQuery !== name ? `${name}, ${listingAddress}` : '',
    name && listingAddress ? `${name}, ${listingAddress}` : '',
    listingAddress,
    name,
  ]

  return Array.from(new Set(rawCandidates
    .map(cleanSearchPart)
    .filter(Boolean)))
    .map((candidate) => `${candidate}, Balayan, Batangas, Philippines`)
}

type MapSearchResult = {
  latitude: number
  longitude: number
  displayName?: string
  provider: 'Geoapify' | 'OpenStreetMap'
}

const searchGeoapify = async (searchQuery: string): Promise<MapSearchResult | null> => {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Missing session. Please sign in again.')

  const response = await fetch(`/api/geoapify-search?q=${encodeURIComponent(searchQuery)}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || `Geoapify search failed (${response.status}).`)

  const result = data?.result
  const latitude = result ? parseCoordinate(String(result.latitude), -90, 90) : null
  const longitude = result ? parseCoordinate(String(result.longitude), -180, 180) : null
  if (latitude === null || longitude === null) return null

  return {
    latitude,
    longitude,
    displayName: result.displayName,
    provider: 'Geoapify',
  }
}

const searchOpenStreetMap = async (searchQuery: string): Promise<MapSearchResult | null> => {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(searchQuery)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('OpenStreetMap search failed.')

  const results = await response.json()
  const firstResult = Array.isArray(results) ? results[0] : null
  const latitude = firstResult ? parseCoordinate(String(firstResult.lat), -90, 90) : null
  const longitude = firstResult ? parseCoordinate(String(firstResult.lon), -180, 180) : null
  if (latitude === null || longitude === null) return null

  return {
    latitude,
    longitude,
    displayName: firstResult.display_name,
    provider: 'OpenStreetMap',
  }
}

export default function ManageListing() {
  const [establishment, setEstablishment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'searching' | 'error'>('idle')
  const [mapSearch, setMapSearch] = useState('')
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<L.Map | null>(null)
  const leafletMarkerRef = useRef<L.Marker | null>(null)
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

  const setExactPin = (latitude: number, longitude: number) => {
    setFormData((current) => ({
      ...current,
      latitude: latitude.toFixed(7),
      longitude: longitude.toFixed(7),
    }))
  }

  const getCurrentPinPosition = () => {
    const latitude = parseCoordinate(formData.latitude, -90, 90)
    const longitude = parseCoordinate(formData.longitude, -180, 180)
    return latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : null
  }

  useEffect(() => {
    if (!mapContainerRef.current || !establishment) return

    const exactPosition = getCurrentPinPosition()
    const initialCenter: L.LatLngExpression = exactPosition
      ? [exactPosition.lat, exactPosition.lng]
      : [BALAYAN_CENTER.latitude, BALAYAN_CENTER.longitude]

    const map = leafletMapRef.current || L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    })
    leafletMapRef.current = map

    if (!mapContainerRef.current.dataset.vistabalayanLeafletReady) {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: LEAFLET_ATTRIBUTION,
      }).addTo(map)
      mapContainerRef.current.dataset.vistabalayanLeafletReady = 'true'
    }

    map.setView(initialCenter, exactPosition ? 17 : 14)

    const marker = leafletMarkerRef.current || L.marker(initialCenter, {
      draggable: true,
      icon: listingPinIcon,
      title: 'Exact establishment location',
    }).addTo(map)
    leafletMarkerRef.current = marker
    marker.setLatLng(initialCenter)

    marker.off('dragend')
    marker.on('dragend', () => {
      const position = marker.getLatLng()
      setExactPin(position.lat, position.lng)
    })

    map.off('click')
    map.on('click', (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng)
      map.panTo(event.latlng)
      setExactPin(event.latlng.lat, event.latlng.lng)
    })

    setMapStatus('ready')

    setTimeout(() => map.invalidateSize(), 0)

    return () => {
      map.off('click')
      marker.off('dragend')
    }
  }, [establishment?.id])

  useEffect(() => {
    const map = leafletMapRef.current
    const marker = leafletMarkerRef.current
    const exactPosition = getCurrentPinPosition()
    if (!map || !marker || !exactPosition) return
    const latLng: L.LatLngExpression = [exactPosition.lat, exactPosition.lng]
    marker.setLatLng(latLng)
    map.panTo(latLng)
  }, [formData.latitude, formData.longitude])

  const handleMapSearch = async () => {
    const candidates = buildMapSearchCandidates(mapSearch, formData.name, formData.address)
    if (candidates.length === 0) {
      toast.error('Enter an establishment name, address, or nearby landmark to search.')
      return
    }

    setMapStatus('searching')
    try {
      let foundResult: MapSearchResult | null = null
      let matchedQuery = ''
      let geoapifyConfigMissing = false

      for (const searchQuery of candidates) {
        try {
          foundResult = await searchGeoapify(searchQuery)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (!/not configured/i.test(message)) throw error
          geoapifyConfigMissing = true
        }

        if (!foundResult && geoapifyConfigMissing) {
          foundResult = await searchOpenStreetMap(searchQuery)
        }
        if (foundResult) {
          matchedQuery = searchQuery
          break
        }
      }

      if (!foundResult) {
        toast.error(geoapifyConfigMissing
          ? 'Private Geoapify API key is not configured yet. OpenStreetMap could not find it, so try a nearby landmark or paste coordinates manually.'
          : 'No Geoapify location found. Try the barangay, nearby landmark, or paste coordinates manually.')
        setMapStatus('ready')
        return
      }

      setExactPin(foundResult.latitude, foundResult.longitude)
      if (foundResult.displayName) {
        setFormData((current) => ({ ...current, address: foundResult?.displayName || current.address }))
      }
      const usedFallback = candidates.length > 1 && matchedQuery !== candidates[0]
      toast.success(usedFallback
        ? `${foundResult.provider} found a nearby address/location for this listing. Review the pin before publishing.`
        : `${foundResult.provider} found a location. Review the pin before publishing.`)
      setMapStatus('ready')
    } catch (error) {
      console.error('Map search failed:', error)
      toast.error('Geoapify search is unavailable. You can still click the map or paste coordinates.')
      setMapStatus('error')
    }
  }

  const useCurrentLocationAsPin = () => {
    if (!navigator.geolocation) {
      toast.error('Location access is not available in this browser. Open the site in Chrome/Safari and allow Location permission, or paste coordinates manually.')
      return
    }

    const setPinFromPosition = (position: GeolocationPosition) => {
      setFormData((current) => ({
        ...current,
        latitude: position.coords.latitude.toFixed(7),
        longitude: position.coords.longitude.toFixed(7),
      }))
      toast.success('Map pin set from your current location. Review the preview before publishing.')
    }

    navigator.geolocation.getCurrentPosition(
      setPinFromPosition,
      () => {
        navigator.geolocation.getCurrentPosition(
          setPinFromPosition,
          () => toast.error('Unable to get your phone location. Please turn on GPS/location services, allow location permission for this browser, or paste coordinates manually.'),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
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
                      <MapPin className="w-4 h-4 text-[#0E5A72]" /> Exact OpenStreetMap Pin
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
                      href={getOpenStreetMapUrl(currentMapQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-[#0E5A72] hover:bg-teal-50"
                    >
                      <Navigation className="w-4 h-4" /> Open OpenStreetMap
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
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Search Geoapify</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={mapSearch}
                        onChange={(e) => setMapSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleMapSearch() } }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Search your establishment or nearby landmark"
                      />
                      <button
                        type="button"
                        onClick={handleMapSearch}
                        disabled={mapStatus === 'searching'}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0E5A72] px-3 py-2 text-xs font-semibold text-white hover:bg-[#073B4C] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Search className="w-4 h-4" /> {mapStatus === 'searching' ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-teal-100 bg-white">
                    <div ref={mapContainerRef} className="h-72 w-full" />
                    {mapStatus === 'searching' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-medium text-[#0E5A72]">
                        Searching Geoapify...
                      </div>
                    )}
                    {mapStatus === 'error' && (
                      <div className="pointer-events-none absolute inset-x-4 top-4 rounded-lg bg-white/95 p-3 text-center text-xs text-red-600 shadow-sm">
                        Search is unavailable. The map still works: click to pin, drag the marker, or paste coordinates manually.
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {hasExactCoordinates
                    ? 'Exact coordinates are ready to publish. You can still drag the marker or click the map to adjust the pin.'
                    : 'Search OpenStreetMap, click the map, drag the marker, use your location, or paste coordinates manually.'}
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
              {hasExactCoordinates && <li>✓ Exact OpenStreetMap location pin</li>}
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