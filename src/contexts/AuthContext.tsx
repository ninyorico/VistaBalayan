import { createContext, useContext, useEffect, useRef, useState } from 'react'
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
  const profileRef = useRef<Profile | null>(null)

  useEffect(() => {
    let mounted = true

    const updateProfile = (nextProfile: Profile | null) => {
      profileRef.current = nextProfile
      setProfile(nextProfile)
    }

    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!mounted) return
      if (error) {
        console.error('Profile fetch error:', error)
        updateProfile(null)
        return
      }

      if (data?.status === 'inactive' || data?.status === 'deleted') {
        updateProfile(null)
        setUser(null)
        await supabase.auth.signOut()
        return
      }

      updateProfile(data as Profile || null)
    }

    // Check current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        updateProfile(null)
      }
      if (mounted) setLoading(false)
    }
    
    checkSession()

    // Listen for auth changes. Avoid putting protected routes back into a global
    // loading screen for token refreshes, because that unmounts the current page
    // and makes the UI look like it restarts when the user changes browser tabs.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)

      if (!nextUser) {
        updateProfile(null)
        setLoading(false)
        return
      }

      const hasCurrentProfile = Boolean(profileRef.current)
      const sameProfileUser = profileRef.current?.id === nextUser.id
      const shouldSilentlyKeepUi =
        hasCurrentProfile && sameProfileUser && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')

      if (shouldSilentlyKeepUi) {
        setLoading(false)
        return
      }

      setLoading(!hasCurrentProfile)

      setTimeout(async () => {
        await fetchProfile(nextUser.id)
        if (mounted) setLoading(false)
      }, 0)
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
    profileRef.current = null
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