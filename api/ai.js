import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const MODEL_NAME = 'models/gemini-2.5-flash'

const cleanText = (value, fallback = '') => String(value || fallback).replace(/\s+/g, ' ').trim()
const clampConfidence = (value, fallback = 0.65) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback
}
const extractJson = (text) => {
  const match = String(text || '').match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : {}
}
const normalizeInsights = (items = []) => items.map((item) => ({
  title: cleanText(item.title, 'Tourism insight'),
  description: cleanText(item.description),
  impact: String(item.impact || 'medium').toLowerCase(),
  category: cleanText(item.category, 'Operations'),
  recommended_action: cleanText(item.recommended_action || item.action, 'Review this trend and take one focused action.'),
  confidence_score: clampConfidence(item.confidence_score),
}))
const normalizeAnomalies = (items = []) => items.map((item) => ({
  type: cleanText(item.type || item.anomaly_type, 'Operational anomaly'),
  severity: String(item.severity || 'medium').toLowerCase(),
  description: cleanText(item.description),
  recommendation: cleanText(item.recommendation || item.recommended_action, 'Review this record manually.'),
  establishment: item.establishment ? cleanText(item.establishment) : undefined,
  confidence_score: clampConfidence(item.confidence_score),
}))

const prompts = {
  insights: (data) => `You are a tourism data analyst for Balayan, Batangas.
Based on this tourism data, provide INSIGHTS AND RECOMMENDATIONS:
Total Visitors: ${data.totalVisitors || 0}
Average Occupancy: ${data.avgOccupancy || 0}%
Monthly Trends: ${JSON.stringify(data.monthlyTrends || {})}
Return ONLY valid JSON in this exact format:
{"insights":[{"title":"max 6 words","description":"one sentence, max 18 words, include the key evidence","impact":"high|medium|low","category":"Seasonal|Operations|Marketing|Infrastructure","recommended_action":"one action sentence, max 14 words","confidence_score":0.0}]}
Provide exactly 4 recommendations. Keep every field brief but meaningful. No paragraphs. Avoid generic advice.`,
  establishmentInsights: (data) => `You are a tourism data analyst for ${data.establishmentName}.
Based on this establishment tourism data, provide INSIGHTS AND RECOMMENDATIONS:
Total Visitors: ${data.totalVisitors || 0}
Average Occupancy: ${data.avgOccupancy || 0}%
Monthly Trends: ${JSON.stringify(data.monthlyTrends || {})}
Return ONLY valid JSON in this exact format:
{"insights":[{"title":"max 6 words","description":"one sentence, max 18 words, include the key evidence","impact":"high|medium|low","category":"Operations|Marketing|Revenue","recommended_action":"one action sentence, max 14 words","confidence_score":0.0}]}
Provide exactly 3 recommendations. Keep every field brief but meaningful. No paragraphs. Avoid generic advice.`,
  anomalies: (data) => `You are a tourism data analyst for Balayan, Batangas.
Analyze this visitor data and identify ANOMALIES:
${JSON.stringify((data || []).slice(0, 50), null, 2)}
Return ONLY valid JSON in this exact format:
{"anomalies":[{"type":"Unusual Drop","severity":"high|medium|low","description":"describe the anomaly","recommendation":"what to do about it","establishment":"name of affected establishment","confidence_score":0.0}]}`,
  establishmentAnomalies: (data) => `You are a tourism data analyst for ${data.establishmentName}.
Analyze this visitor data for this specific establishment and identify ANOMALIES:
${JSON.stringify((data.visitorData || []).slice(0, 30), null, 2)}
Return ONLY valid JSON in this exact format:
{"anomalies":[{"type":"Unusual Drop","severity":"high|medium|low","description":"describe the anomaly specific to this establishment","recommendation":"what to do about it","confidence_score":0.0}]}`,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) return res.status(401).json({ error: 'Authentication required' })

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role, establishment_id')
      .eq('id', userData.user.id)
      .single()
    if (profileError || !profile) return res.status(403).json({ error: 'Profile authorization required' })

    const { operation, payload } = req.body || {}
    const officerOperation = operation === 'insights' || operation === 'anomalies'
    const staffOperation = operation === 'establishmentInsights' || operation === 'establishmentAnomalies'
    if ((!officerOperation && !staffOperation) || (officerOperation && profile.role !== 'municipal_officer')) {
      return res.status(403).json({ error: 'Not authorized' })
    }
    if (staffOperation && (profile.role !== 'establishment_staff' || !payload?.establishmentId || payload.establishmentId !== profile.establishment_id)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return res.status(503).json({ error: 'AI service is temporarily unavailable' })
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: MODEL_NAME })
    const prompt = prompts[operation](payload)
    const result = await model.generateContent(prompt)
    const parsed = extractJson(await result.response.text())
    return res.status(200).json({
      modelName: MODEL_NAME,
      ...(operation.toLowerCase().includes('anomal')
        ? { anomalies: normalizeAnomalies(parsed.anomalies || []) }
        : { insights: normalizeInsights(parsed.insights || []) }),
    })
  } catch (error) {
    console.error('AI endpoint error:', error instanceof Error ? error.message : 'unknown error')
    return res.status(502).json({ error: 'AI service is temporarily unavailable' })
  }
}
