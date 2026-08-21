import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  full_name: string
  role: 'municipal_officer' | 'establishment_staff'
  establishment_id: string | null
  status?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!mounted) return
      if (error) {
        console.error('Profile fetch error:', error)
        setProfile(null)
        return
      }

      if (data?.status === 'inactive' || data?.status === 'deleted') {
        setProfile(null)
        setUser(null)
        await supabase.auth.signOut()
        return
      }

      setProfile(data as Profile || null)
    }

    // Check current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      if (mounted) setLoading(false)
    }
    
    checkSession()

    // Listen for auth changes. Defer Supabase queries outside the auth callback
    // to avoid leaving the app stuck on the loading screen after sign-in.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(true)
      
      if (session?.user) {
        setTimeout(async () => {
          await fetchProfile(session.user.id)
          if (mounted) setLoading(false)
        }, 0)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError) throw profileError

    if (profileData?.status === 'inactive' || profileData?.status === 'deleted') {
      await supabase.auth.signOut()
      throw new Error('This account is no longer active')
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}