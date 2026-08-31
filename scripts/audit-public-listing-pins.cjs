#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function loadEnv(file) {
  const envPath = path.resolve(file)
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const value = match[2].replace(/^['"]|['"]$/g, '')
    process.env[match[1]] ||= value
  }
}

loadEnv('.env.local')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const pinRegex = /\[LOCATION_PIN:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/
const publicCategory = (type = '') => {
  const normalized = type.toLowerCase()
  if (normalized.includes('hotel') || normalized.includes('inn') || normalized.includes('lodge')) return 'Hotel'
  if (normalized.includes('resort') || normalized.includes('pool') || normalized.includes('farm')) return 'Resort'
  return null
}
const extractPin = (row) => {
  const lat = Number(row.latitude)
  const lng = Number(row.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) return { source: 'columns', lat, lng }
  const match = String(row.amenities || '').match(pinRegex)
  if (!match) return null
  const markerLat = Number(match[1])
  const markerLng = Number(match[2])
  if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng) || (markerLat === 0 && markerLng === 0)) return null
  return { source: 'amenities', lat: markerLat, lng: markerLng }
}

async function main() {
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
  let url = `${supabaseUrl}/rest/v1/establishments?select=id,name,type,address,amenities,latitude,longitude,status&status=eq.active&order=name.asc`
  let response = await fetch(url, { headers })
  let text = await response.text()
  if (!response.ok && text.includes('latitude')) {
    url = `${supabaseUrl}/rest/v1/establishments?select=id,name,type,address,amenities,status&status=eq.active&order=name.asc`
    response = await fetch(url, { headers })
    text = await response.text()
  }
  if (!response.ok) throw new Error(`${response.status} ${text}`)
  const rows = JSON.parse(text).filter(row => publicCategory(row.type))
  const audited = rows.map(row => ({ ...row, pin: extractPin(row) }))
  console.log(JSON.stringify({
    count: audited.length,
    withPins: audited.filter(r => r.pin).length,
    missingPins: audited.filter(r => !r.pin).map(r => ({ id: r.id, name: r.name, type: r.type, address: r.address, amenities: r.amenities })),
    pins: audited.filter(r => r.pin).map(r => ({ id: r.id, name: r.name, pin: r.pin }))
  }, null, 2))
}
main().catch(error => { console.error(error); process.exit(1) })
