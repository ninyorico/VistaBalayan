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
} from 'lucide-react'
import React from 'react'
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
const emptyBreakdown: RatingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

const createEmptyRatingSummary = (): RatingSummary => ({ average: 0, count: 0, breakdown: { ...emptyBreakdown }, commentCount: 0 })
const emptyRatingSummary = createEmptyRatingSummary()

const categories = [
  { id: 'all', name: 'All stays', icon: Search },
  { id: 'Resort', name: 'Resorts', icon: Hotel },
  { id: 'Hotel', name: 'Hotels', icon: Building2 },
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

const getEstimatedCoordinates = (establishment: Establishment): UserLocation => {
  if (typeof establishment.latitude === 'number' && typeof establishment.longitude === 'number') {
    return { latitude: establishment.latitude, longitude: establishment.longitude }
  }

  let hash = 0
  for (const char of establishment.id || establishment.name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  const northSouth = ((hash % 900) - 450) / 100000
  const eastWest = (((hash >> 8) % 900) - 450) / 100000
  return {
    latitude: BALAYAN_CENTER.latitude + northSouth,
    longitude: BALAYAN_CENTER.longitude + eastWest,
  }
}

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
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null)
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
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'blocked'>('idle')

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
    const { data, error } = await supabase
      .from('establishment_rating_reviews')
      .select('establishment_id, rating, comment, reviewer_name, created_at')
      .eq('establishment_id', establishmentId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setRatingReviews((current) => ({ ...current, [establishmentId]: data }))
    } else {
      const localReview = readLocalRatings()[establishmentId]
      if (localReview) {
        setRatingReviews((current) => ({
          ...current,
          [establishmentId]: [{ establishment_id: establishmentId, rating: localReview.rating, comment: localReview.comment || null, reviewer_name: localReview.reviewerName || null, created_at: localReview.createdAt || new Date().toISOString() }],
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
    const { error } = await supabase.rpc('submit_establishment_rating', {
      p_establishment_id: selectedEstablishment.id,
      p_visitor_token: visitorToken,
      p_rating: selectedReviewRating,
      p_comment: comment || null,
      p_reviewer_name: name,
    })

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
      setRatingMessage('Thanks — your review was saved with your name.')
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
    setFiltered(results)
  }, [searchTerm, selectedType, establishments])

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

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('blocked')
      return
    }
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        setLocationStatus('ready')
      },
      () => setLocationStatus('blocked'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const recommendations = useMemo(() => {
    return establishments
      .map((est) => {
        const publicCategory = getPublicCategory(est.type) || 'Resort'
        const coords = getEstimatedCoordinates(est)
        const distance = userLocation ? distanceInKm(userLocation, coords) : distanceInKm(BALAYAN_CENTER, coords)
        const categoryBoost = behavior.categoryClicks[publicCategory] || 0
        const viewedBoost = behavior.viewedIds.includes(est.id) ? 12 : 0
        const searchBoost = behavior.searches.some((term) =>
          `${est.name} ${est.description || ''} ${est.type}`.toLowerCase().includes(term.toLowerCase())
        )
          ? 10
          : 0
        const featuredBoost = est.featured ? 8 : 0
        const roomBoost = est.total_rooms ? Math.min(est.total_rooms / 8, 8) : 0
        const score = 100 - distance * 18 + categoryBoost * 7 + viewedBoost + searchBoost + featuredBoost + roomBoost
        const reason = userLocation
          ? `${distance.toFixed(1)} km from your location, with a match to your browsing pattern.`
          : `Recommended from your recent views, searches, and Balayan stay preferences.`
        return { ...est, publicCategory, distance, score, reason }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [establishments, behavior, userLocation])

  const nearestStays = useMemo(() => {
    const base = userLocation || BALAYAN_CENTER
    return establishments
      .map((est) => ({ ...est, distance: distanceInKm(base, getEstimatedCoordinates(est)) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4)
  }, [establishments, userLocation])

  const featuredImage = establishments.find((est) => est.images?.length)?.images?.[0]
  const selectedRating = selectedEstablishment ? ratingSummaries[selectedEstablishment.id] || emptyRatingSummary : emptyRatingSummary
  const selectedReviews = selectedEstablishment ? ratingReviews[selectedEstablishment.id] || [] : []

  return (
    <main className="min-h-[100dvh] bg-[#f5f8f9] text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        {featuredImage && (
          <img
            src={featuredImage}
            alt="Balayan resort and hotel destination"
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/78 to-cyan-950/70" />
        <div className="relative mx-auto grid min-h-[78dvh] max-w-7xl grid-cols-1 items-center gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm text-white/82 backdrop-blur-xl">
              <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              AI stay guide for Balayan
            </div>
            <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Find the right resort or hotel in Balayan.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/78 sm:text-lg">
              Search active stays, compare details, and get recommendations based on location and browsing behavior.
            </p>
            <div className="mt-8 max-w-xl rounded-[1.5rem] border border-white/16 bg-white/12 p-2 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search resort, hotel, address, or amenity"
                  className="w-full rounded-[1.1rem] border border-white/16 bg-white px-12 py-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-cyan-300/30"
                />
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/16 bg-white/12 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/66">AI recommendations</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">Best next stays</h2>
              </div>
              <button
                onClick={requestLocation}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 active:translate-y-[1px]"
              >
                {locationStatus === 'loading' ? 'Locating' : locationStatus === 'ready' ? 'Location on' : 'Use location'}
              </button>
            </div>
            <div className="space-y-3">
              {recommendations.map((est) => (
                <button
                  key={est.id}
                  onClick={() => openDetails(est)}
                  className="w-full rounded-2xl border border-white/12 bg-white/10 p-4 text-left transition hover:bg-white/16 active:translate-y-[1px]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0F4C75]">
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
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 rounded-[2rem] border border-slate-200 bg-white/86 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition active:translate-y-[1px] ${
                    selectedType === cat.id
                      ? 'bg-[#0F4C75] text-white shadow-lg shadow-cyan-950/15'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                  {cat.name}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" strokeWidth={1.8} />
            Showing {filtered.length} resorts and hotels
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 pb-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div>
          {loading ? (
            <div className="flex justify-center rounded-[2rem] bg-white py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#0F4C75]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center">
              <p className="text-slate-500">No resorts or hotels found. Try a different search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((est) => {
                const Icon = getCategoryIcon(est.type)
                const displayImage = est.images && est.images.length > 0 ? est.images[0] : null
                const publicCategory = getPublicCategory(est.type)
                return (
                  <button
                    key={est.id}
                    onClick={() => openDetails(est)}
                    className="group overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white text-left shadow-[0_16px_45px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(15,23,42,0.13)] active:translate-y-[1px]"
                  >
                    {displayImage ? (
                      <img src={displayImage} alt={est.name} className="h-56 w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-gradient-to-br from-[#0F4C75] to-[#1CA7C9]">
                        <Icon className="h-14 w-14 text-white/70" strokeWidth={1.8} />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold leading-6 tracking-[-0.02em] text-slate-950">{est.name}</h3>
                        <span className="shrink-0 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-[#0F4C75]">
                          {publicCategory}
                        </span>
                      </div>
                      <RatingDisplay summary={ratingSummaries[est.id]} className="mb-3" />
                      <div className="flex items-start gap-2 text-sm leading-5 text-slate-600">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
                        <span>{est.address}</span>
                      </div>
                      {est.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{est.description}</p>}
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0F4C75]">
                        View details <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={1.8} />
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] lg:sticky lg:top-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Nearest picks</p>
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-slate-950">Close to you</h2>
            </div>
            <Navigation className="h-5 w-5 text-[#0F4C75]" strokeWidth={1.8} />
          </div>
          <div className="space-y-3">
            {nearestStays.map((est) => (
              <button key={est.id} onClick={() => openDetails(est)} className="w-full rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-cyan-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold leading-5 text-slate-950">{est.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{getPublicCategory(est.type)}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {est.distance.toFixed(1)} km
                  </span>
                </div>
              </button>
            ))}
          </div>
          {locationStatus !== 'ready' && (
            <button onClick={requestLocation} className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Improve with my location
            </button>
          )}
        </aside>
      </section>

      {selectedEstablishment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setSelectedEstablishment(null)}>
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {selectedEstablishment.images && selectedEstablishment.images.length > 0 ? (
              <img src={selectedEstablishment.images[0]} alt={selectedEstablishment.name} className="h-72 w-full object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-[#0F4C75] to-[#1CA7C9]">
                {React.createElement(getCategoryIcon(selectedEstablishment.type), { className: 'h-14 w-14 text-white/70', strokeWidth: 1.8 })}
              </div>
            )}
            <div className="p-6 sm:p-8">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="mb-3 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-[#0F4C75]">
                    {getPublicCategory(selectedEstablishment.type)}
                  </span>
                  <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">{selectedEstablishment.name}</h2>
                </div>
                <div className="rounded-full bg-slate-50 px-3 py-2">
                  <RatingDisplay summary={selectedRating} />
                </div>
              </div>

              <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <InfoRow icon={MapPin} text={selectedEstablishment.address} />
                {selectedEstablishment.contact_number && <InfoRow icon={Phone} text={selectedEstablishment.contact_number} />}
                {selectedEstablishment.email && <InfoRow icon={Mail} text={selectedEstablishment.email} />}
                {selectedEstablishment.opening_hours && <InfoRow icon={Clock} text={selectedEstablishment.opening_hours} />}
                {selectedEstablishment.website_url && (
                  <a href={selectedEstablishment.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 font-medium text-[#0F4C75] hover:bg-cyan-50">
                    <Globe className="h-4 w-4" strokeWidth={1.8} />
                    Visit website
                  </a>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-5">
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
                        className="rounded-full p-1.5 text-[#0F4C75] transition hover:scale-110 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Rate ${rating} star${rating === 1 ? '' : 's'}`}
                      >
                        <Star
                          className={`h-7 w-7 ${rating <= (selectedReviewRating || selectedRating.visitorRating || 0) ? 'fill-[#0F4C75]' : 'fill-white'}`}
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
                    className="w-full rounded-2xl border border-cyan-100 bg-white p-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-cyan-300/30"
                  />
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value.slice(0, 500))}
                    placeholder="Optional: tell others why you chose this rating"
                    className="min-h-24 w-full rounded-2xl border border-cyan-100 bg-white p-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-cyan-300/30"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">Name required · {reviewComment.length}/500 comment characters</p>
                    <button
                      type="button"
                      onClick={submitRating}
                      disabled={submittingRating || selectedReviewRating < 1 || !reviewerName.trim()}
                      className="rounded-2xl bg-[#0F4C75] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0B3C5D] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {submittingRating ? 'Saving...' : 'Submit rating'}
                    </button>
                  </div>
                </div>
                {ratingMessage && <p className="mt-3 text-sm font-medium text-[#0F4C75]">{ratingMessage}</p>}
              </div>

              <ReviewSummary summary={selectedRating} reviews={selectedReviews} />

              {selectedEstablishment.description && (
                <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-950">Establishment overview</h3>
                  <p className="mt-2 leading-7 text-slate-600">{selectedEstablishment.description}</p>
                </div>
              )}

              <button
                onClick={() => setSelectedEstablishment(null)}
                className="mt-6 w-full rounded-2xl bg-[#0F4C75] py-3.5 font-semibold text-white transition hover:bg-[#0B3C5D] active:translate-y-[1px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function ReviewSummary({ summary, reviews }: { summary: RatingSummary; reviews: RatingReview[] }) {
  const maxCount = Math.max(1, ...[1, 2, 3, 4, 5].map((star) => summary.breakdown[star as keyof RatingBreakdown] || 0))

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-950">Reviews and rating count</h3>
          <p className="mt-1 text-sm text-slate-600">{summary.count} total review{summary.count === 1 ? '' : 's'} · {summary.commentCount} with comment{summary.commentCount === 1 ? '' : 's'}</p>
          {summary.localOnly && <p className="mt-1 text-xs font-medium text-amber-700">Saved on this device only until database setup is completed.</p>}
        </div>
        <MessageSquare className="h-5 w-5 text-[#0F4C75]" strokeWidth={1.8} />
      </div>

      <div className="mt-4 space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.breakdown[star as keyof RatingBreakdown] || 0
          return (
            <div key={star} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-sm text-slate-600">
              <span>{star} star{star === 1 ? '' : 's'}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#0F4C75]" style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className="text-right font-semibold text-slate-800">{count}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-5 space-y-3">
        {reviews.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No public review comments yet.</p>
        ) : (
          reviews.map((review, index) => (
            <div key={`${review.establishment_id}-${review.created_at}-${index}`} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <RatingDisplay summary={{ average: review.rating, count: 1, breakdown: { ...emptyBreakdown, [review.rating]: 1 }, commentCount: review.comment?.trim() ? 1 : 0 }} />
                <span className="text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">{review.reviewer_name?.trim() || 'Anonymous visitor'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment?.trim() || 'No comment provided.'}</p>
            </div>
          ))
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
      <div className="flex items-center gap-0.5 text-[#0F4C75]">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className={`h-4 w-4 ${star <= rounded ? 'fill-[#0F4C75]' : 'fill-slate-100'}`} strokeWidth={1.8} />
        ))}
      </div>
      <span>{rating.localOnly ? 'Saved on this device only' : rating.count > 0 ? `${rating.average.toFixed(1)} (${rating.count})` : 'No ratings yet'}</span>
    </div>
  )
}

function InfoRow({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.8} />
      <span>{text}</span>
    </div>
  )
}
