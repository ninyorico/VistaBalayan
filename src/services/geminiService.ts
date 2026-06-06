import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../lib/supabase'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '')
const MODEL_NAME = 'models/gemini-2.5-flash'

export const geminiService = {
  // Check if we have cached insights
  async getCachedInsights() {
    const { data, error } = await supabase
      .from('ai_insights_cache')
      .select('data')
      .eq('insight_type', 'recommendations')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }
    return data.data
  },

  // Check if we have cached anomalies
  async getCachedAnomalies() {
    const { data, error } = await supabase
      .from('ai_anomalies_cache')
      .select('*')
      .eq('status', 'active')
      .order('detected_at', { ascending: false })

    if (error) {
      return []
    }
    return data || []
  },

  // Generate and save insights (for officer - all establishments)
  async generateAndSaveInsights(analyticsData: any) {
    try {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME })
      
      const prompt = `
        You are a tourism data analyst for Balayan, Batangas.
        
        Based on this tourism data, provide INSIGHTS AND RECOMMENDATIONS:
        
        Total Visitors: ${analyticsData.totalVisitors || 0}
        Average Occupancy: ${analyticsData.avgOccupancy || 0}%
        Monthly Trends: ${JSON.stringify(analyticsData.monthlyTrends || {})}
        
        Return ONLY valid JSON in this exact format:
        {
          "insights": [
            {
              "title": "Insight title",
              "description": "detailed insight",
              "impact": "high",
              "category": "Seasonal"
            }
          ]
        }
        
        Provide 4 actionable insights for tourism management.
      `

      const result = await model.generateContent(prompt)
      const responseText = await result.response.text()
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const insights = parsed.insights || []

        // Save to ai_recommendations table
        for (const insight of insights) {
          await supabase.from('ai_recommendations').insert({
            title: insight.title,
            description: insight.description,
            impact: insight.impact,
            category: insight.category,
            status: 'active',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          })
        }

        // Save to cache
        await supabase.from('ai_insights_cache').insert({
          insight_type: 'recommendations',
          data: { insights },
          generated_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        })

        return insights
      }
      return []
    } catch (error) {
      console.error('Gemini API error:', error)
      return []
    }
  },

  // Generate insights for a specific establishment (for staff)
  async generateAndSaveInsightsForEstablishment(establishmentData: any) {
    try {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME })
      
      const prompt = `
        You are a tourism data analyst for ${establishmentData.establishmentName}.
        
        Based on this tourism data for this specific establishment, provide INSIGHTS AND RECOMMENDATIONS:
        
        Total Visitors: ${establishmentData.totalVisitors || 0}
        Average Occupancy: ${establishmentData.avgOccupancy || 0}%
        Monthly Trends: ${JSON.stringify(establishmentData.monthlyTrends || {})}
        
        Return ONLY valid JSON in this exact format:
        {
          "insights": [
            {
              "title": "Insight title",
              "description": "detailed insight specific to this establishment",
              "impact": "high",
              "category": "Operations/Marketing/Revenue"
            }
          ]
        }
        
        Provide 3-4 actionable insights for this establishment's management.
      `

      const result = await model.generateContent(prompt)
      const responseText = await result.response.text()
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const insights = parsed.insights || []

        // Save to ai_recommendations table
        for (const insight of insights) {
          await supabase.from('ai_recommendations').insert({
            title: insight.title,
            description: insight.description,
            impact: insight.impact,
            category: insight.category,
            status: 'active',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          })
        }

        return insights
      }
      return []
    } catch (error) {
      console.error('Gemini API error:', error)
      return []
    }
  },

  // Generate and save anomalies (for officer - all establishments)
  async generateAndSaveAnomalies(visitorData: any[]) {
    if (!visitorData || visitorData.length === 0) {
      return []
    }

    try {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME })
      
      const prompt = `
        You are a tourism data analyst for Balayan, Batangas.
        
        Analyze this visitor data and identify ANOMALIES:
        
        Visitor Data (last ${visitorData.length} records):
        ${JSON.stringify(visitorData.slice(0, 50), null, 2)}
        
        Return ONLY valid JSON in this exact format:
        {
          "anomalies": [
            {
              "type": "Unusual Drop",
              "severity": "medium", 
              "description": "describe the anomaly",
              "recommendation": "what to do about it",
              "establishment": "name of affected establishment"
            }
          ]
        }
      `

      const result = await model.generateContent(prompt)
      const responseText = await result.response.text()
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const anomalies = parsed.anomalies || []

        // Save to ai_anomalies_cache table
        for (const anomaly of anomalies) {
          let establishmentId = null
          if (anomaly.establishment) {
            const { data: est } = await supabase
              .from('establishments')
              .select('id')
              .eq('name', anomaly.establishment)
              .maybeSingle()
            establishmentId = est?.id || null
          }

          await supabase.from('ai_anomalies_cache').insert({
            anomaly_type: anomaly.type,
            severity: anomaly.severity,
            description: anomaly.description,
            recommendation: anomaly.recommendation,
            establishment_id: establishmentId,
            detected_at: new Date(),
            status: 'active',
            is_resolved: false
          })
        }

        return anomalies
      }
      return []
    } catch (error) {
      console.error('Gemini API error:', error)
      return []
    }
  },

  // Generate anomalies for a specific establishment (for staff)
  async generateAndSaveAnomaliesForEstablishment(visitorData: any[], establishmentId: string, establishmentName: string) {
    if (!visitorData || visitorData.length === 0) {
      return []
    }

    try {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME })
      
      const prompt = `
        You are a tourism data analyst for ${establishmentName}.
        
        Analyze this visitor data for this specific establishment and identify ANOMALIES:
        
        Visitor Data (last ${visitorData.length} records):
        ${JSON.stringify(visitorData.slice(0, 30), null, 2)}
        
        Return ONLY valid JSON in this exact format:
        {
          "anomalies": [
            {
              "type": "Unusual Drop",
              "severity": "medium", 
              "description": "describe the anomaly specific to this establishment",
              "recommendation": "what to do about it"
            }
          ]
        }
      `

      const result = await model.generateContent(prompt)
      const responseText = await result.response.text()
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const anomalies = parsed.anomalies || []

        // Save to ai_anomalies_cache table with establishment_id
        for (const anomaly of anomalies) {
          await supabase.from('ai_anomalies_cache').insert({
            anomaly_type: anomaly.type,
            severity: anomaly.severity,
            description: anomaly.description,
            recommendation: anomaly.recommendation,
            establishment_id: establishmentId,
            detected_at: new Date(),
            status: 'active',
            is_resolved: false
          })
        }

        return anomalies
      }
      return []
    } catch (error) {
      console.error('Gemini API error:', error)
      return []
    }
  },

  // Force refresh all AI data (for officer)
  async refreshAllData() {
    console.log('🔄 Refreshing AI data...')
    
    // Fetch latest data from database
    const { data: visitorData } = await supabase
      .from('visitor_reports')
      .select('report_date, total_guests, residence_type, establishments(name)')
      .eq('status', 'approved')
      .order('report_date', { ascending: false })
      .limit(500)

    const { data: accommodationData } = await supabase
      .from('accommodation_reports')
      .select('report_date, total_rooms, total_occupied_rooms')
      .eq('status', 'approved')

    // Calculate analytics
    const totalVisitors = visitorData?.reduce((sum, v) => sum + (v.total_guests || 0), 0) || 0
    let avgOccupancy = 0
    if (accommodationData && accommodationData.length > 0) {
      const totalRooms = accommodationData.reduce((sum, a) => sum + (a.total_rooms || 0), 0)
      const totalOccupied = accommodationData.reduce((sum, a) => sum + (a.total_occupied_rooms || 0), 0)
      avgOccupancy = totalRooms > 0 ? (totalOccupied / totalRooms) * 100 : 0
    }

    const monthlyTrends: Record<string, number> = {}
    visitorData?.forEach(v => {
      if (v.report_date) {
        const month = v.report_date.slice(0, 7)
        monthlyTrends[month] = (monthlyTrends[month] || 0) + (v.total_guests || 0)
      }
    })

    // Generate new insights and anomalies
    const [insights, anomalies] = await Promise.all([
      this.generateAndSaveInsights({ totalVisitors, avgOccupancy, monthlyTrends }),
      this.generateAndSaveAnomalies(visitorData || [])
    ])

    console.log('✅ AI data refreshed:', { insights: insights.length, anomalies: anomalies.length })
    
    return { insights, anomalies }
  }
}