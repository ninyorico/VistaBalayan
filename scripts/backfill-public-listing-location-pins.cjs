#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function loadEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) process.env[match[1]] ||= match[2].replace(/^['"]|['"]$/g, '')
  }
}
loadEnv(path.resolve('.env.local'))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const WRITE_KEY = SERVICE_ROLE_KEY || ANON_KEY
if (!SUPABASE_URL || !ANON_KEY) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')

const pins = {
  'Altina Beach House Resort': [13.9345996, 120.7362971],
  'Aurora Resort': [13.9455882, 120.711106],
  'Espineli Inn and Pavilion': [13.9407521, 120.7280871],
  Henaida: [13.9282729, 120.716604],
  'Hotel Casa Ilustre': [13.9504005, 120.7299843],
  'Kalika Balayan': [13.9511297, 120.6834398],
  'King & Queen Resorts': [13.9475094, 120.7091793],
  'La Georgina Resorts': [13.9444017, 120.7599171],
  'La Jamayca Resort': [13.9231998, 120.7076709],
  'La Piscina Resort': [13.9421314, 120.7397857],
  'Magsino Chokdee Farm': [13.9648288, 120.7624942],
  'Malabanan Swimming Pool': [13.9425817, 120.7362508],
  'My Place Resort': [13.9465681, 120.7501423],
  'Palayan Inn': [13.94481, 120.7105529],
  'Soggiorno Lorenzana': [13.9517933, 120.6822078],
  'Soler Sea Resort': [13.9299726, 120.7625559],
  'Souq Salamanca': [13.9454597, 120.6665522],
  'Summer8 Resort': [13.9447157, 120.7397152],
  "Valentino's Hotel": [13.9607313, 120.726657],
  'Viktoria Garden Resort': [13.9330076, 120.7221941],
  'Villa Beadoy Resorts and Pavilion': [13.9441293, 120.7403224],
  'Villa Casa Mia': [13.974437, 120.7632905],
  'Villa Scarlet Garden Resort': [13.94959, 120.6992248],
}
const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${WRITE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}
const markerRegex = /\[LOCATION_PIN:-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?\]/
function withPin(amenities, lat, lng) {
  const marker = `[LOCATION_PIN:${lat},${lng}]`
  const text = String(amenities || '').trim()
  if (!text) return marker
  return markerRegex.test(text) ? text.replace(markerRegex, marker) : `${text}\n${marker}`
}
async function request(url, options = {}) {
  const res = await fetch(url, options)
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}
async function main() {
  if (!SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set; trying anon-key update. RLS may block this. SQL helper is the preferred DB path if blocked.')
  }
  const rows = await request(`${SUPABASE_URL}/rest/v1/establishments?select=id,name,amenities,status&status=eq.active&order=name.asc`, { headers })
  const wanted = rows.filter(row => pins[row.name])
  const updated = []
  for (const row of wanted) {
    const [lat, lng] = pins[row.name]
    const body = JSON.stringify({ amenities: withPin(row.amenities, lat, lng) })
    const result = await request(`${SUPABASE_URL}/rest/v1/establishments?id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers, body })
    updated.push(...result.map(({ id, name, amenities }) => ({ id, name, amenities })))
  }
  console.log(JSON.stringify({ attempted: wanted.length, updated }, null, 2))
}
main().catch(error => { console.error(error.message || error); process.exit(1) })
