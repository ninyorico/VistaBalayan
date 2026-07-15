import { useState, useEffect } from 'react'
import { Search, MapPin, Star, Filter, Navigation, Hotel, Utensils, Building2, TreePine, Coffee, Sparkles, Loader2, Phone, Mail, Globe, Clock, ChevronRight } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import React from 'react'

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
}

export default function TourismHome() {
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [filtered, setFiltered] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null)

  const categories = [
    { id: 'all', name: 'All', icon: Search },
    { id: 'Resort', name: 'Resorts', icon: Hotel },
    { id: 'Hotel', name: 'Hotels', icon: Building2 },
    { id: 'Inn', name: 'Inns', icon: Coffee },
    { id: 'Food & Beverage Establishment', name: 'Restaurants', icon: Utensils },
    { id: 'Tourist Attraction', name: 'Attractions', icon: TreePine },
  ]

  useEffect(() => {
    fetchEstablishments()
  }, [])

  const fetchEstablishments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('establishments')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (!error && data) {
      setEstablishments(data)
      setFiltered(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    let results = establishments
    if (searchTerm) {
      results = results.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    if (selectedType !== 'all') {
      results = results.filter(e => e.type === selectedType)
    }
    setFiltered(results)
  }, [searchTerm, selectedType, establishments])

  const getCategoryIcon = (type: string) => {
    const cat = categories.find(c => c.id === type)
    return cat?.icon || Building2
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-[#0F4C75] via-[#1293B8] to-[#1CA7C9] text-white py-20">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover Balayan, Batangas</h1>
          <p className="text-xl md:text-2xl mb-8">Explore the best tourist establishments in our municipality</p>
          
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, location, or description..."
                className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedType(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${
                  selectedType === cat.id
                    ? 'bg-[#1CA7C9] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Found {filtered.length} establishment(s)</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#1CA7C9]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">No establishments found. Try a different search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((est) => {
              const Icon = getCategoryIcon(est.type)
              const displayImage = est.images && est.images.length > 0 ? est.images[0] : null
              return (
                <div
                  key={est.id}
                  onClick={() => setSelectedEstablishment(est)}
                  className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition transform hover:-translate-y-1"
                >
                  {displayImage ? (
                    <img src={displayImage} alt={est.name} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="h-48 bg-gradient-to-r from-[#0F4C75] to-[#1CA7C9] flex items-center justify-center">
                      <Icon className="w-16 h-16 text-white opacity-50" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-gray-900">{est.name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{est.type}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{est.address}</span>
                    </div>
                    {est.description && (
                      <p className="text-gray-600 mt-3 text-sm line-clamp-2">{est.description}</p>
                    )}
                    <button className="mt-4 text-[#1CA7C9] font-medium flex items-center gap-1 hover:gap-2 transition-all">
                      View Details <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedEstablishment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEstablishment(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {selectedEstablishment.images && selectedEstablishment.images.length > 0 ? (
              <img src={selectedEstablishment.images[0]} alt="" className="w-full h-64 object-cover" />
            ) : (
              <div className="h-48 bg-gradient-to-r from-[#0F4C75] to-[#1CA7C9] flex items-center justify-center">
                {React.createElement(getCategoryIcon(selectedEstablishment.type), { className: "w-16 h-16 text-white opacity-50" })}
              </div>
            )}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedEstablishment.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{selectedEstablishment.type}</span>
              </div>
              
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                  <span className="text-gray-700">{selectedEstablishment.address}</span>
                </div>
                {selectedEstablishment.contact_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">{selectedEstablishment.contact_number}</span>
                  </div>
                )}
                {selectedEstablishment.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">{selectedEstablishment.email}</span>
                  </div>
                )}
                {selectedEstablishment.website_url && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-500" />
                    <a href={selectedEstablishment.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Visit Website
                    </a>
                  </div>
                )}
                {selectedEstablishment.opening_hours && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                    <span className="text-gray-700">{selectedEstablishment.opening_hours}</span>
                  </div>
                )}
              </div>
              
              {selectedEstablishment.description && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                  <p className="text-gray-600">{selectedEstablishment.description}</p>
                </div>
              )}
              
              <button
                onClick={() => setSelectedEstablishment(null)}
                className="mt-6 w-full bg-[#1CA7C9] text-white py-3 rounded-lg hover:bg-[#0F4C75] transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}