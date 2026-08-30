import { useEffect, useMemo, useState } from 'react'
import {
  Bed,
  Building2,
  ChevronRight,
  Clock,
  Compass,
  Filter,
  Globe,
  Hotel,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import React from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Separator } from '../../components/ui/separator'
import { supabase } from '../../../lib/supabase'

interface Establishment {
  id: string
  name: string
  type: string
  address: string
  contact_number: string
  description: string
  images: string[]
  opening_hours: string
  website_url: string
  email: string
  amenities?: string
  featured?: boolean
  total_rooms?: number
  latitude?: number
  longitude?: number
}

interface RatingBreakdown {
  1: number
  2: number
  3: number
  4: number
  5: number
}

interface RatingSummary {
  average: number
  count: number
  breakdown: RatingBreakdown
  commentCount: number
  visitorRating?: number
  localOnly?: boolean
}

interface RatingReview {
  establishment_id: string
  rating: number
  comment: string | null
  reviewer_name: string | null
  created_at: string
}

interface LocalRating {
  rating: number
  comment?: string
  reviewerName?: string
  createdAt?: string
}

interface UserLocation {
  latitude: number
  longitude: number
}

interface BehaviorProfile {
  viewedIds: string[]
  categoryClicks: Record<string, number>
  searches: string[]
}

const BALAYAN_CENTER: UserLocation = { latitude: 13.9385, longitude: 120.7332 }
const BEHAVIOR_KEY = 'vistabalayan_public_behavior_v1'
const RATING_VISITOR_KEY = 'vistabalayan_public_rating_visitor_v1'
const LOCAL_RATINGS_KEY = 'vistabalayan_public_local_ratings_v1'
const LEGACY_REVIEW_PREFIX = 'Reviewed by '
const emptyBreakdown: RatingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

const createEmptyRatingSummary = (): RatingSummary => ({ average: 0, count: 0, breakdown: { ...emptyBreakdown }, commentCount: 0 })
const emptyRatingSummary = createEmptyRatingSummary()

const categories = [
  { id: 'all', name: 'All stays', icon: Search },
  { id: 'Resort', name: 'Resorts', icon: Hotel },
  { id: 'Hotel', name: 'Hotels', icon: Building2 },
]

const ratingFilters = [
  { value: 0, label: 'All ratings' },
  { value: 5, label: '5 stars' },
  { value: 4, label: '4+ stars' },
  { value: 3, label: '3+ stars' },
]

const emptyBehavior: BehaviorProfile = {
  viewedIds: [],
  categoryClicks: {},
  searches: [],
}

const getPublicCategory = (type = '') => {
  const normalized = type.toLowerCase()
  if (normalized.includes('hotel') || normalized.includes('inn') || normalized.includes('lodge')) return 'Hotel'
  if (normalized.includes('resort') || normalized.includes('pool') || normalized.includes('farm')) return 'Resort'
  return null
}

const getCategoryIcon = (type: string) => {
  return getPublicCategory(type) === 'Hotel' ? Building2 : Hotel
}

const readLocationPinFromAmenities = (amenities = '') => {
  const match = amenities.match(/\[LOCATION_PIN:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/)
  if (!match) return null
  const latitude = Number(match[1])
  const longitude = Number(match[2])
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
}

const getStoredLocation = (establishment: Establishment) => {
  const latitude = Number(establishment.latitude)
  const longitude = Number(establishment.longitude)
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude }
  }
  return readLocationPinFromAmenities(establishment.amenities || '')
}

const hasExactLocation = (establishment: Establishment) => Boolean(getStoredLocation(establishment))

const getLocationQuery = (establishment: Establishment) => {
  const storedLocation = getStoredLocation(establishment)
  if (storedLocation) return `${storedLocation.latitude},${storedLocation.longitude}`
  return establishment.address || establishment.name
}

const getOpenStreetMapEmbedUrl = (establishment: Establishment) => {
  const storedLocation = getStoredLocation(establishment)
  if (!storedLocation) return `https://www.openstreetmap.org/export/embed.html?bbox=120.7132%2C13.9185%2C120.7532%2C13.9585&layer=mapnik`
  const { latitude, longitude } = storedLocation
  const delta = 0.006
  return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`
}
const getGoogleMapsDirectionsUrl = (establishment: Establishment, origin?: UserLocation | null) => {
  const storedLocation = getStoredLocation(establishment)
  const destination = storedLocation
    ? `${storedLocation.latitude},${storedLocation.longitude}`
    : getLocationQuery(establishment)
  const originParam = origin ? `&origin=${origin.latitude},${origin.longitude}` : ''
  return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(destination)}&travelmode=driving`
}
const readBehavior = (): BehaviorProfile => {
  if (typeof window === 'undefined') return emptyBehavior
  try {
    const stored = window.localStorage.getItem(BEHAVIOR_KEY)
    return stored ? { ...emptyBehavior, ...JSON.parse(stored) } : emptyBehavior
  } catch {
    return emptyBehavior
  }
}

const saveBehavior = (behavior: BehaviorProfile) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(behavior))
}

const getRatingVisitorToken = () => {
  if (typeof window === 'undefined') return 'server-rendered-visitor'

  const existing = window.localStorage.getItem(RATING_VISITOR_KEY)
  if (existing) return existing

  const token = typeof window.crypto?.randomUUID === 'function'
    ? window.crypto.randomUUID()
    : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.localStorage.setItem(RATING_VISITOR_KEY, token)
  return token
}

const normalizeLocalRating = (value: unknown): LocalRating | null => {
  if (typeof value === 'number' && value >= 1 && value <= 5) {
    return { rating: value }
  }
  if (value && typeof value === 'object') {
    const review = value as Partial<LocalRating>
    if (typeof review.rating === 'number' && review.rating >= 1 && review.rating <= 5) {
      return {
        rating: review.rating,
        comment: typeof review.comment === 'string' ? review.comment : '',
        reviewerName: typeof review.reviewerName === 'string' ? review.reviewerName : '',
        createdAt: typeof review.createdAt === 'string' ? review.createdAt : undefined,
      }
    }
  }
  return null
}

const readLocalRatings = (): Record<string, LocalRating> => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = window.localStorage.getItem(LOCAL_RATINGS_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    return Object.entries(parsed).reduce<Record<string, LocalRating>>((acc, [id, value]) => {
      const rating = normalizeLocalRating(value)
      if (rating) acc[id] = rating
      return acc
    }, {})
  } catch {
    return {}
  }
}

const saveLocalRating = (establishmentId: string, rating: number, comment: string, reviewerName: string) => {
  if (typeof window === 'undefined') return
  const ratings = readLocalRatings()
  ratings[establishmentId] = { rating, comment: comment.trim(), reviewerName: reviewerName.trim(), createdAt: new Date().toISOString() }
  window.localStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(ratings))
}

const buildLegacyReviewComment = (reviewerName: string, comment: string) => {
  const prefix = `${LEGACY_REVIEW_PREFIX}${reviewerName.trim()}`.slice(0, 120)
  const trimmedComment = comment.trim()
  if (!trimmedComment) return prefix.slice(0, 500)
  return `${prefix}\n${trimmedComment}`.slice(0, 500)
}

const getReviewDisplay = (review: RatingReview) => {
  const reviewerName = review.reviewer_name?.trim()
  const comment = review.comment?.trim() || ''

  if (reviewerName) {
    return { reviewerName, comment }
  }

  if (comment.startsWith(LEGACY_REVIEW_PREFIX)) {
    const withoutPrefix = comment.slice(LEGACY_REVIEW_PREFIX.length)
    const [nameLine, ...commentLines] = withoutPrefix.split('\n')
    const legacyReviewerName = nameLine.trim()
    if (legacyReviewerName) {
      return {
        reviewerName: legacyReviewerName,
        comment: commentLines.join('\n').trim(),
      }
    }
  }

  return { reviewerName: 'Anonymous visitor', comment }
}

const sortReviewsForDisplay = (reviews: RatingReview[]) => {
  return [...reviews].sort((a, b) => {
    const aHasComment = getReviewDisplay(a).comment.length > 0
    const bHasComment = getReviewDisplay(b).comment.length > 0
    if (aHasComment !== bHasComment) return aHasComment ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

const getLocalRatingSummaries = (establishmentIds: string[]) => {
  const localRatings = readLocalRatings()
  return establishmentIds.reduce<Record<string, RatingSummary>>((acc, id) => {
    const localReview = localRatings[id]
    if (localReview) {
      acc[id] = {
        average: localReview.rating,
        count: 1,
        breakdown: { ...emptyBreakdown, [localReview.rating]: 1 },
        commentCount: localReview.comment?.trim() ? 1 : 0,
        visitorRating: localReview.rating,
        localOnly: true,
      }
    }
    return acc
  }, {})
}

const summarizeRatings = (ratings: Array<{ establishment_id: string; average_rating: number; rating_count: number; one_star_count?: number; two_star_count?: number; three_star_count?: number; four_star_count?: number; five_star_count?: number; comment_count?: number }>) => {
  return ratings.reduce<Record<string, RatingSummary>>((acc, item) => {
    if (!item.establishment_id || typeof item.average_rating !== 'number') return acc

    acc[item.establishment_id] = {
      average: item.average_rating,
      count: item.rating_count || 0,
      breakdown: {
        1: item.one_star_count || 0,
        2: item.two_star_count || 0,
        3: item.three_star_count || 0,
        4: item.four_star_count || 0,
        5: item.five_star_count || 0,
      },
      commentCount: item.comment_count || 0,
    }
    return acc
  }, {})
}

const applyLocalVisitorRatings = (summaries: Record<string, RatingSummary>, establishmentIds: string[]) => {
  const localRatings = readLocalRatings()
  return establishmentIds.reduce<Record<string, RatingSummary>>((acc, id) => {
    const localReview = localRatings[id]
    if (localReview) {
      acc[id] = {
        ...(acc[id] || {
          average: localReview.rating,
          count: 1,
          breakdown: { ...emptyBreakdown, [localReview.rating]: 1 },
          commentCount: localReview.comment?.trim() ? 1 : 0,
          localOnly: true,
        }),
        visitorRating: localReview.rating,
      }
    }
    return acc
  }, { ...summaries })
}

const getEstimatedCoordinates = (establishment: Establishment): UserLocation | null => getStoredLocation(establishment)

const distanceInKm = (a: UserLocation, b: UserLocation) => {
  const radius = 6371
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180
  const lat1 = (a.latitude * Math.PI) / 180
  const lat2 = (b.latitude * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export default function TourismHome() {
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [filtered, setFiltered] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedRatingFilter, setSelectedRatingFilter] = useState(0)
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [behavior, setBehavior] = useState<BehaviorProfile>(emptyBehavior)
  const [ratingSummaries, setRatingSummaries] = useState<Record<string, RatingSummary>>({})
  const [ratingVisitorToken, setRatingVisitorToken] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratingMessage, setRatingMessage] = useState('')
  const [selectedReviewRating, setSelectedReviewRating] = useState(0)
  const [reviewerName, setReviewerName] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [ratingReviews, setRatingReviews] = useState<Record<string, RatingReview[]>>({})
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [routeDistances, setRouteDistances] = useState<Record<string, number>>({})
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'blocked'>('idle')
  const [showSelectedMap, setShowSelectedMap] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!userLocation) {
      setRouteDistances({})
      return () => { cancelled = true }
    }

    const destinations = establishments
      .map((est) => ({ establishment: est, coords: getStoredLocation(est) }))
      .filter((item): item is { establishment: Establishment; coords: UserLocation } => Boolean(item.coords))

    if (destinations.length === 0) {
      setRouteDistances({})
      return () => { cancelled = true }
    }

    const coordinates = [
      `${userLocation.longitude},${userLocation.latitude}`,
      ...destinations.map(({ coords }) => `${coords.longitude},${coords.latitude}`),
    ].join(';')

    fetch(`https://router.project-osrm.org/table/v1/driving/${coordinates}?sources=0&annotations=distance`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Routing unavailable')))
      .then((result: { distances?: Array<Array<number | null>> }) => {
        if (cancelled) return
        const distances = result.distances?.[0] || []
        setRouteDistances(Object.fromEntries(
          destinations
            .map(({ establishment }, index) => {
              const meters = distances[index + 1]
              return typeof meters === 'number' && Number.isFinite(meters) ? [establishment.id, meters / 1000] : null
            })
            .filter((entry): entry is [string, number] => Boolean(entry))
        ))
      })
      .catch(() => { if (!cancelled) setRouteDistances({}) })

    return () => { cancelled = true }
  }, [establishments, userLocation])

  useEffect(() => {
    setBehavior(readBehavior())
    const visitorToken = getRatingVisitorToken()
    setRatingVisitorToken(visitorToken)
    fetchEstablishments(visitorToken)
  }, [])

  const fetchEstablishments = async (visitorToken = ratingVisitorToken) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('establishments')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (!error && data) {
      const publicStays = data.filter((est) => getPublicCategory(est.type))
      setEstablishments(publicStays)
      setFiltered(publicStays)
      await fetchRatingSummaries(publicStays.map((est) => est.id), visitorToken)
    }
    setLoading(false)
  }

  const fetchRatingSummaries = async (establishmentIds: string[], visitorToken = ratingVisitorToken) => {
    if (establishmentIds.length === 0) return

    const { data, error } = await supabase
      .from('establishment_rating_summaries')
      .select('establishment_id, average_rating, rating_count, one_star_count, two_star_count, three_star_count, four_star_count, five_star_count, comment_count')
      .in('establishment_id', establishmentIds)

    if (!error && data) {
      setRatingSummaries(applyLocalVisitorRatings(summarizeRatings(data), establishmentIds))
    } else {
      setRatingSummaries(getLocalRatingSummaries(establishmentIds))
    }
  }

  const fetchRatingReviews = async (establishmentId: string) => {
    let { data, error } = await supabase
      .from('establishment_rating_reviews')
      .select('establishment_id, rating, comment, reviewer_name, created_at')
      .eq('establishment_id', establishmentId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      const legacyResult = await supabase
        .from('establishment_rating_reviews')
        .select('establishment_id, rating, comment, created_at')
        .eq('establishment_id', establishmentId)
        .order('created_at', { ascending: false })
        .limit(50)
      data = legacyResult.data as RatingReview[] | null
      error = legacyResult.error
    }

    if (!error && data) {
      setRatingReviews((current) => ({ ...current, [establishmentId]: sortReviewsForDisplay(data) }))
    } else {
      const localReview = readLocalRatings()[establishmentId]
      if (localReview) {
        setRatingReviews((current) => ({
          ...current,
          [establishmentId]: sortReviewsForDisplay([{ establishment_id: establishmentId, rating: localReview.rating, comment: localReview.comment || null, reviewer_name: localReview.reviewerName || null, created_at: localReview.createdAt || new Date().toISOString() }]),
        }))
      }
    }
  }

  const submitRating = async () => {
    if (!selectedEstablishment || submittingRating || selectedReviewRating < 1) return

    const visitorToken = ratingVisitorToken || getRatingVisitorToken()
    if (!ratingVisitorToken) setRatingVisitorToken(visitorToken)

    setSubmittingRating(true)
    setRatingMessage('')

    const name = reviewerName.trim()
    if (!name) {
      setRatingMessage('Please enter your name before submitting your review.')
      setSubmittingRating(false)
      return
    }

    const comment = reviewComment.trim()
    let { error } = await supabase.rpc('submit_establishment_rating', {
      p_establishment_id: selectedEstablishment.id,
      p_visitor_token: visitorToken,
      p_rating: selectedReviewRating,
      p_comment: comment || null,
      p_reviewer_name: name,
    })

    if (error) {
      const legacyResult = await supabase.rpc('submit_establishment_rating', {
        p_establishment_id: selectedEstablishment.id,
        p_visitor_token: visitorToken,
        p_rating: selectedReviewRating,
        p_comment: buildLegacyReviewComment(name, comment),
      })
      error = legacyResult.error
    }

    saveLocalRating(selectedEstablishment.id, selectedReviewRating, comment, name)

    if (error) {
      setRatingSummaries((current) => ({
        ...current,
        [selectedEstablishment.id]: {
          average: current[selectedEstablishment.id]?.average || selectedReviewRating,
          count: current[selectedEstablishment.id]?.count || 1,
          breakdown: current[selectedEstablishment.id]?.breakdown || { ...emptyBreakdown, [selectedReviewRating]: 1 },
          commentCount: current[selectedEstablishment.id]?.commentCount || (comment ? 1 : 0),
          visitorRating: selectedReviewRating,
          localOnly: true,
        },
      }))
      setRatingMessage('Database setup is still pending, so this rating was saved on this device only and will not appear on other browsers yet.')
      await fetchRatingReviews(selectedEstablishment.id)
    } else {
      setRatingMessage('Thanks, your review was saved with your name.')
      setReviewerName('')
      setReviewComment('')
      await fetchRatingSummaries(establishments.map((est) => est.id), visitorToken)
      await fetchRatingReviews(selectedEstablishment.id)
    }

    setSubmittingRating(false)
  }

  useEffect(() => {
    let results = establishments
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      results = results.filter((e) =>
        e.name.toLowerCase().includes(term) ||
        e.address.toLowerCase().includes(term) ||
        getPublicCategory(e.type)?.toLowerCase().includes(term) ||
        (e.description && e.description.toLowerCase().includes(term))
      )
    }
    if (selectedType !== 'all') {
      results = results.filter((e) => getPublicCategory(e.type) === selectedType)
    }
    if (selectedRatingFilter > 0) {
      results = results.filter((e) => {
        const summary = ratingSummaries[e.id]
        return summary && summary.count > 0 && summary.average >= selectedRatingFilter
      })
    }
    setFiltered(results)
  }, [searchTerm, selectedType, selectedRatingFilter, establishments, ratingSummaries])

  useEffect(() => {
    if (!searchTerm.trim()) return
    const handle = window.setTimeout(() => {
      const next = {
        ...behavior,
        searches: [searchTerm.trim(), ...behavior.searches.filter((s) => s !== searchTerm.trim())].slice(0, 8),
      }
      setBehavior(next)
      saveBehavior(next)
    }, 650)
    return () => window.clearTimeout(handle)
  }, [searchTerm])

  const handleCategoryChange = (category: string) => {
    setSelectedType(category)
    const next = {
      ...behavior,
      categoryClicks: {
        ...behavior.categoryClicks,
        [category]: (behavior.categoryClicks[category] || 0) + 1,
      },
    }
    setBehavior(next)
    saveBehavior(next)
  }

  const openDetails = (establishment: Establishment) => {
    setSelectedEstablishment(establishment)
    setSelectedPhotoIndex(0)
    setShowSelectedMap(false)
    setRatingMessage('')
    const localReview = readLocalRatings()[establishment.id]
    setSelectedReviewRating(localReview?.rating || ratingSummaries[establishment.id]?.visitorRating || 0)
    setReviewerName(localReview?.reviewerName || '')
    setReviewComment(localReview?.comment || '')
    fetchRatingReviews(establishment.id)
    const next = {
      ...behavior,
      viewedIds: [establishment.id, ...behavior.viewedIds.filter((id) => id !== establishment.id)].slice(0, 12),
    }
    setBehavior(next)
    saveBehavior(next)
  }

  const getMobileFriendlyLocation = (
    onSuccess: (location: UserLocation) => void,
    onError: () => void,
  ) => {
    if (!navigator.geolocation) {
      onError()
      return
    }

    const handleSuccess = (position: GeolocationPosition) => {
      onSuccess({ latitude: position.coords.latitude, longitude: position.coords.longitude })
    }

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      () => {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          onError,
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    )
  }

  const requestLocation = () => {
    setLocationStatus('loading')
    getMobileFriendlyLocation(
      (location) => {
        setUserLocation(location)
        setLocationStatus('ready')
      },
      () => setLocationStatus('blocked')
    )
  }

  const recommendations = useMemo(() => {
    return establishments
      .map((est) => {
        const publicCategory = getPublicCategory(est.type) || 'Resort'
        const distance = userLocation ? routeDistances[est.id] ?? null : null
        const categoryBoost = behavior.categoryClicks[publicCategory] || 0
        const viewedBoost = behavior.viewedIds.includes(est.id) ? 12 : 0
        const searchBoost = behavior.searches.some((term) =>
          `${est.name} ${est.description || ''} ${est.type}`.toLowerCase().includes(term.toLowerCase())
        )
          ? 10
          : 0
        const featuredBoost = est.featured ? 8 : 0
        const roomBoost = est.total_rooms ? Math.min(est.total_rooms / 8, 8) : 0
        const distanceScore = distance === null ? 0 : 100 - distance * 18
        const score = distanceScore + categoryBoost * 7 + viewedBoost + searchBoost + featuredBoost + roomBoost
        const reason = userLocation && distance !== null
          ? `${distance.toFixed(1)} km from your location, with a match to your browsing pattern.`
          : 'Recommended from your browsing pattern and Balayan travel interests.'
        return { ...est, publicCategory, distance, score, reason }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [establishments, behavior, userLocation, routeDistances])

  const nearestStays = useMemo(() => {
    const base: UserLocation = userLocation || BALAYAN_CENTER
    return establishments
      .map((est) => {
        const coords = getEstimatedCoordinates(est)
        return coords ? { ...est, distance: distanceInKm(base, coords) } : null
      })
      .filter((est): est is Establishment & { distance: number } => Boolean(est))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4)
  }, [establishments, userLocation])

  const featuredImage = establishments.find((est) => est.images?.length)?.images?.[0]
  const selectedRating = selectedEstablishment ? ratingSummaries[selectedEstablishment.id] || emptyRatingSummary : emptyRatingSummary
  const selectedReviews = selectedEstablishment ? ratingReviews[selectedEstablishment.id] || [] : []
  const selectedPhotos = selectedEstablishment?.images?.filter((image) => typeof image === 'string' && image.trim().length > 0) || []
  const selectedPhoto = selectedPhotos[selectedPhotoIndex] || selectedPhotos[0]

  const openDirectionsToEstablishment = (establishment: Establishment) => {
    if (userLocation) {
      window.open(getGoogleMapsDirectionsUrl(establishment, userLocation), '_blank')
      return
    }

    // Open the exact saved pin immediately. If location permission succeeds,
    // replace the route with the visitor's actual starting point afterward.
    const directionsWindow = window.open(getGoogleMapsDirectionsUrl(establishment, null), '_blank')

    const navigateToDirections = (origin?: UserLocation | null) => {
      const directionsUrl = getGoogleMapsDirectionsUrl(establishment, origin)

      if (directionsWindow) {
        directionsWindow.location.href = directionsUrl
      } else {
        window.location.href = directionsUrl
      }
    }

    getMobileFriendlyLocation(
      (location) => {
        setUserLocation(location)
        setLocationStatus('ready')
        navigateToDirections(location)
      },
      () => {
        setLocationStatus('blocked')
        navigateToDirections(null)
      }
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5faf8] text-[#0B2530]">
      <section className="relative overflow-hidden border-b border-[#d7e5e2] bg-[#0B2530] text-white">
        {featuredImage && (
          <img
            src={featuredImage}
            alt="Balayan resort and hotel destination"
            className="absolute inset-0 h-full w-full object-cover opacity-42"
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(52,160,164,0.34),transparent_34%),linear-gradient(135deg,rgba(7,59,76,0.94),rgba(11,37,48,0.74)_46%,rgba(14,90,114,0.76))]" />
        <div className="relative mx-auto grid min-h-[76dvh] max-w-7xl grid-cols-1 items-center gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
          <div className="max-w-2xl">
            <Badge className="mb-5 rounded-full border-white/15 bg-white/12 px-4 py-2 text-sm font-medium text-white shadow-none backdrop-blur-xl hover:bg-white/12">
              <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              VistaBalayan travel guide
            </Badge>
            <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Find stays that fit your Balayan trip.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/78 sm:text-lg">
              Browse verified resorts and hotels, compare ratings, and view every uploaded listing photo.
            </p>
            <Card className="mt-8 overflow-hidden rounded-[1.5rem] border-white/15 bg-white/12 p-2 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search resort, hotel, address, pool, beach, or amenity"
                  className="h-14 rounded-[1.1rem] border-white/20 bg-white pl-12 pr-4 text-base text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:ring-[#34A0A4]/30"
                />
              </div>
            </Card>
          </div>

          <Card className="rounded-[2rem] border-white/16 bg-white/14 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-2xl">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white/66">Personalized picks</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">Where to stay next</h2>
                </div>
                <Button
                  type="button"
                  onClick={requestLocation}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-none hover:bg-cyan-50 active:translate-y-[1px]"
                >
                  {locationStatus === 'loading' ? 'Locating' : locationStatus === 'ready' ? 'Location on' : 'Use location'}
                </Button>
              </div>
              <div className="space-y-3">
                {recommendations.map((est) => (
                  <button
                    key={est.id}
                    onClick={() => openDetails(est)}
                    className="w-full rounded-2xl border border-white/12 bg-white/10 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/16 active:translate-y-[1px]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0E5A72]">
                        {React.createElement(getCategoryIcon(est.type), { className: 'h-5 w-5', strokeWidth: 1.8 })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{est.name}</p>
                        <p className="mt-1 text-sm leading-5 text-white/68">{est.reason}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <Card className="rounded-[1.75rem] border-[#d7e5e2] bg-white/92 shadow-[0_24px_80px_rgba(14,90,114,0.10)] backdrop-blur-xl">
          <CardContent className="flex flex-col gap-5 p-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <Button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(cat.id)}
                      variant={selectedType === cat.id ? 'default' : 'secondary'}
                      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-none active:translate-y-[1px] ${
                        selectedType === cat.id
                          ? 'bg-[#0E5A72] text-white hover:bg-[#073B4C]'
                          : 'bg-[#e5f1f2] text-[#0B2530] hover:bg-[#d7e5e2]'
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                      {cat.name}
                    </Button>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8fbf8] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Star className="h-3.5 w-3.5 fill-[#0E5A72] text-[#0E5A72]" strokeWidth={1.8} />
                  Rating filter
                </span>
                {ratingFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedRatingFilter(filter.value)}
                    variant={selectedRatingFilter === filter.value ? 'default' : 'secondary'}
                    className={`rounded-2xl px-3.5 py-2 text-sm font-semibold shadow-none active:translate-y-[1px] ${
                      selectedRatingFilter === filter.value
                        ? 'bg-[#0E5A72] text-white hover:bg-[#073B4C]'
                        : 'bg-white text-[#0B2530] ring-1 ring-[#d7e5e2] hover:bg-[#edf7f6]'
                    }`}
                  >
                    {filter.value > 0 && <Star className={`h-4 w-4 ${selectedRatingFilter === filter.value ? 'fill-white' : 'fill-[#0E5A72] text-[#0E5A72]'}`} strokeWidth={1.8} />}
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Filter className="h-4 w-4" strokeWidth={1.8} />
              Showing {filtered.length} resorts and hotels
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 pb-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div>
          {loading ? (
            <Card className="rounded-[2rem] border-[#d7e5e2] bg-white/90 py-14 shadow-[0_24px_80px_rgba(14,90,114,0.08)]">
              <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
                <div className="h-12 w-44 animate-pulse rounded-full bg-[#e5f1f2]" />
                <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                  {[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-3xl bg-[#f0f7f5]" />)}
                </div>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="rounded-[2rem] border-[#d7e5e2] bg-white/90 p-12 text-center shadow-[0_24px_80px_rgba(14,90,114,0.08)]">
              <p className="text-slate-500">No resorts or hotels found. Try a different search.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((est) => {
                const Icon = getCategoryIcon(est.type)
                const displayImage = est.images && est.images.length > 0 ? est.images[0] : null
                const publicCategory = getPublicCategory(est.type)
                return (
                  <Card
                    key={est.id}
                    className="group overflow-hidden rounded-[1.7rem] border-[#d7e5e2] bg-white/95 py-0 shadow-[0_22px_70px_rgba(14,90,114,0.10)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(14,90,114,0.16)]"
                  >
                    <button onClick={() => openDetails(est)} className="w-full text-left active:translate-y-[1px]">
                      {displayImage ? (
                        <div className="relative h-56 overflow-hidden">
                          <img src={displayImage} alt={est.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                          {est.images.length > 1 && (
                            <Badge className="absolute bottom-3 right-3 rounded-full border-white/10 bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white shadow-lg hover:bg-slate-950/75">
                              {est.images.length} photos
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-56 items-center justify-center bg-gradient-to-br from-[#0E5A72] via-[#168AAD] to-[#83c5be]">
                          <Icon className="h-14 w-14 text-white/70" strokeWidth={1.8} />
                        </div>
                      )}
                      <CardContent className="p-5">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <h3 className="text-lg font-semibold leading-6 tracking-[-0.02em] text-slate-950">{est.name}</h3>
                          <Badge className="shrink-0 rounded-full bg-[#e5f1f2] px-3 py-1 text-xs font-semibold text-[#0E5A72] shadow-none hover:bg-[#e5f1f2]">
                            {publicCategory}
                          </Badge>
                        </div>
                        <RatingDisplay summary={ratingSummaries[est.id]} className="mb-3" />
                        <div className="flex items-start gap-2 text-sm leading-5 text-slate-600">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
                          <span>{est.address}</span>
                        </div>
                        {est.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{est.description}</p>}
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0E5A72]">
                          View details <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={1.8} />
                        </span>
                      </CardContent>
                    </button>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <Card className="h-fit rounded-[2rem] border-[#d7e5e2] bg-white/92 shadow-[0_24px_80px_rgba(14,90,114,0.10)] backdrop-blur-xl lg:sticky lg:top-6">
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Nearest picks</p>
                <h2 className="text-xl font-semibold tracking-[-0.025em] text-slate-950">Close to you</h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e5f1f2] text-[#0E5A72]">
                <Navigation className="h-5 w-5" strokeWidth={1.8} />
              </div>
            </div>
            <div className="space-y-3">
              {nearestStays.map((est) => (
                <button key={est.id} onClick={() => openDetails(est)} className="w-full rounded-2xl border border-[#d7e5e2]/70 bg-[#f8fbf8] p-4 text-left transition hover:bg-[#e5f1f2] active:translate-y-[1px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold leading-5 text-slate-950">{est.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{getPublicCategory(est.type)}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full border-[#d7e5e2] bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                      {est.distance.toFixed(1)} km
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
            {locationStatus !== 'ready' && (
              <>
                <Button onClick={requestLocation} variant="outline" className="mt-5 w-full rounded-2xl border-slate-200 py-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-[#f8fbf8]">
                  Improve with my location
                </Button>
                {locationStatus === 'blocked' && (
                  <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    Phone location is blocked or unavailable. Turn on GPS/location services, allow Location for this browser, then tap again. Directions still work using the establishment pin.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {selectedEstablishment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setSelectedEstablishment(null)}>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedEstablishment(null)}
              className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg ring-1 ring-slate-900/10 transition hover:bg-white hover:text-slate-950"
              aria-label="Close establishment details"
            >
              <X className="h-5 w-5" strokeWidth={1.9} />
            </button>
            <div className="max-h-[90dvh] overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
              {selectedPhotos.length > 0 ? (
              <div className="bg-slate-950">
                <div className="relative">
                  <img src={selectedPhoto} alt={`${selectedEstablishment.name} photo ${selectedPhotoIndex + 1}`} className="h-72 w-full object-cover sm:h-96" />
                  {selectedPhotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoIndex((current) => (current === 0 ? selectedPhotos.length - 1 : current - 1))}
                        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-semibold text-slate-900 shadow-lg transition hover:bg-white"
                        aria-label="Previous photo"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoIndex((current) => (current + 1) % selectedPhotos.length)}
                        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-semibold text-slate-900 shadow-lg transition hover:bg-white"
                        aria-label="Next photo"
                      >
                        ›
                      </button>
                      <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                        {selectedPhotoIndex + 1} / {selectedPhotos.length}
                      </span>
                    </>
                  )}
                </div>
                {selectedPhotos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-3">
                    {selectedPhotos.map((photo, index) => (
                      <button
                        key={`${photo}-${index}`}
                        type="button"
                        onClick={() => setSelectedPhotoIndex(index)}
                        className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${index === selectedPhotoIndex ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        aria-label={`View photo ${index + 1}`}
                      >
                        <img src={photo} alt={`${selectedEstablishment.name} thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-[#0E5A72] via-[#168AAD] to-[#D96C4E]">
                {React.createElement(getCategoryIcon(selectedEstablishment.type), { className: 'h-14 w-14 text-white/70', strokeWidth: 1.8 })}
              </div>
            )}
            <div className="p-6 sm:p-8">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge className="mb-3 rounded-full bg-[#e5f1f2] px-3 py-1 text-xs font-semibold text-[#0E5A72] shadow-none hover:bg-[#e5f1f2]">
                    {getPublicCategory(selectedEstablishment.type)}
                  </Badge>
                  <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">{selectedEstablishment.name}</h2>
                </div>
                <div className="rounded-full bg-[#f8fbf8] px-3 py-2">
                  <RatingDisplay summary={selectedRating} />
                </div>
              </div>

              {selectedEstablishment.description && (
                <div className="mb-5 rounded-2xl bg-[#f8fbf8] p-5">
                  <h3 className="font-semibold text-slate-950">Establishment overview</h3>
                  <p className="mt-2 leading-7 text-slate-600">{selectedEstablishment.description}</p>
                </div>
              )}

              <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <InfoRow icon={MapPin} text={selectedEstablishment.address} />
                {selectedEstablishment.contact_number && <InfoRow icon={Phone} text={selectedEstablishment.contact_number} />}
                {selectedEstablishment.email && <InfoRow icon={Mail} text={selectedEstablishment.email} />}
                {selectedEstablishment.opening_hours && <InfoRow icon={Clock} text={selectedEstablishment.opening_hours} />}
                {selectedEstablishment.website_url && (
                  <a href={selectedEstablishment.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-2xl bg-[#f8fbf8] p-3 font-medium text-[#0E5A72] hover:bg-cyan-50">
                    <Globe className="h-4 w-4" strokeWidth={1.8} />
                    Visit website
                  </a>
                )}
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-[#d7e5e2] bg-[#f8fbf8]">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">Location & Directions</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Find the establishment or get directions.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => openDirectionsToEstablishment(selectedEstablishment)}
                      className="rounded-2xl bg-[#0E5A72] px-4 py-2.5 text-sm font-semibold text-white shadow-none hover:bg-[#073B4C]"
                    >
                      <Navigation className="h-4 w-4" strokeWidth={1.8} />
                      Get Directions
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowSelectedMap(true)}
                      variant="outline"
                      className="rounded-2xl border-[#d7e5e2] bg-white px-4 py-2.5 text-sm font-semibold text-[#0E5A72] shadow-none hover:bg-[#edf7f6]"
                    >
                      <MapPin className="h-4 w-4" strokeWidth={1.8} />
                      View map
                    </Button>
                  </div>
                </div>
                {showSelectedMap && (
                  <iframe
                    title={`${selectedEstablishment.name} OpenStreetMap location`}
                    src={getOpenStreetMapEmbedUrl(selectedEstablishment)}
                    className="h-64 w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                )}
              </div>

              <Separator className="my-6 bg-[#d7e5e2]" />

              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">Rate this establishment</h3>
                    <p className="mt-1 text-sm text-slate-600">No account needed. Enter your name so visitors can see who shared the review.</p>
                  </div>
                  <div className="flex items-center gap-1" aria-label="Choose a rating from 1 to 5 stars">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setSelectedReviewRating(rating)}
                        disabled={submittingRating}
                        className="rounded-full p-1.5 text-[#0E5A72] transition hover:scale-110 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Rate ${rating} star${rating === 1 ? '' : 's'}`}
                      >
                        <Star
                          className={`h-7 w-7 ${rating <= (selectedReviewRating || selectedRating.visitorRating || 0) ? 'fill-[#0E5A72]' : 'fill-white'}`}
                          strokeWidth={1.8}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value.slice(0, 80))}
                    placeholder="Your name"
                    aria-label="Your name"
                    required
                    className="w-full rounded-2xl border border-cyan-100 bg-white p-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-[#34A0A4]/25"
                  />
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value.slice(0, 500))}
                    placeholder="Optional: tell others why you chose this rating"
                    className="min-h-24 w-full rounded-2xl border border-cyan-100 bg-white p-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-[#34A0A4]/25"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">Name required · {reviewComment.length}/500 comment characters</p>
                    <Button
                      type="button"
                      onClick={submitRating}
                      disabled={submittingRating || selectedReviewRating < 1 || !reviewerName.trim()}
                      className="rounded-2xl bg-[#0E5A72] px-5 py-2.5 text-sm font-semibold text-white shadow-none transition hover:bg-[#073B4C] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {submittingRating ? 'Saving...' : 'Submit rating'}
                    </Button>
                  </div>
                </div>
                {ratingMessage && <p className="mt-3 text-sm font-medium text-[#0E5A72]">{ratingMessage}</p>}
              </div>

              <ReviewSummary summary={selectedRating} reviews={selectedReviews} />


              <Button
                onClick={() => setSelectedEstablishment(null)}
                className="mt-6 w-full rounded-2xl bg-[#0E5A72] py-3.5 font-semibold text-white shadow-none transition hover:bg-[#073B4C] active:translate-y-[1px]"
              >
                Close
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function ReviewSummary({ summary, reviews }: { summary: RatingSummary; reviews: RatingReview[] }) {
  const maxCount = Math.max(1, ...[1, 2, 3, 4, 5].map((star) => summary.breakdown[star as keyof RatingBreakdown] || 0))
  const sortedReviews = sortReviewsForDisplay(reviews)

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-950">Reviews and rating count</h3>
          <p className="mt-1 text-sm text-slate-600">{summary.count} total review{summary.count === 1 ? '' : 's'} · {summary.commentCount} with comment{summary.commentCount === 1 ? '' : 's'}</p>
          {summary.localOnly && <p className="mt-1 text-xs font-medium text-amber-700">Saved on this device only until database setup is completed.</p>}
        </div>
        <MessageSquare className="h-5 w-5 text-[#0E5A72]" strokeWidth={1.8} />
      </div>

      <div className="mt-4 space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.breakdown[star as keyof RatingBreakdown] || 0
          return (
            <div key={star} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-sm text-slate-600">
              <span>{star} star{star === 1 ? '' : 's'}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#0E5A72]" style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className="text-right font-semibold text-slate-800">{count}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-5 space-y-3">
        {sortedReviews.length === 0 ? (
          <p className="rounded-2xl bg-[#f8fbf8] p-4 text-sm text-slate-500">No public review comments yet.</p>
        ) : (
          sortedReviews.map((review, index) => {
            const display = getReviewDisplay(review)
            return (
              <div key={`${review.establishment_id}-${review.created_at}-${index}`} className="rounded-2xl bg-[#f8fbf8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <RatingDisplay summary={{ average: review.rating, count: 1, breakdown: { ...emptyBreakdown, [review.rating]: 1 }, commentCount: display.comment ? 1 : 0 }} />
                  <span className="text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-800">{display.reviewerName}</p>
                {display.comment && <p className="mt-2 text-sm leading-6 text-slate-600">{display.comment}</p>}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function RatingDisplay({ summary, className = '' }: { summary?: RatingSummary; className?: string }) {
  const rating = summary || emptyRatingSummary
  const rounded = Math.round(rating.average)

  return (
    <div className={`flex items-center gap-2 text-sm font-semibold text-slate-600 ${className}`}>
      <div className="flex items-center gap-0.5 text-[#0E5A72]">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className={`h-4 w-4 ${star <= rounded ? 'fill-[#0E5A72]' : 'fill-slate-100'}`} strokeWidth={1.8} />
        ))}
      </div>
      <span>{rating.localOnly ? 'Saved on this device only' : rating.count > 0 ? `${rating.average.toFixed(1)} (${rating.count})` : 'No ratings yet'}</span>
    </div>
  )
}

function InfoRow({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-[#f8fbf8] p-3">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.8} />
      <span>{text}</span>
    </div>
  )
}
