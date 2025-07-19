import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[useAuth] Initializing auth hook...')
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[useAuth] Initial session check:', { session: !!session, error })
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch(error => {
      console.error('[useAuth] Error getting session:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[useAuth] Auth state change:', event, { user: !!session?.user })
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('[useAuth] Attempting sign in for:', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log('[useAuth] Sign in result:', { success: !error, error })
    return { data, error }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    console.log('[useAuth] Attempting sign up for:', email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    console.log('[useAuth] Sign up result:', { success: !error, error })
    return { data, error }
  }

  const signOut = async () => {
    console.log('[useAuth] Signing out...')
    const { error } = await supabase.auth.signOut()
    console.log('[useAuth] Sign out result:', { success: !error, error })
    return { error }
  }

  const confirmEmail = async (token: string) => {
    console.log('[useAuth] Confirming email with token...')
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup'
    })
    console.log('[useAuth] Email confirmation result:', { success: !error, error })
    return { data, error }
  }

  // Bypass function for testing - creates a test session
  const bypassAuth = async () => {
    console.log('[useAuth] Bypassing auth for testing...')
    // Create a test user session
    const { data, error } = await supabase.auth.signUp({
      email: 'test@touchpoints.com',
      password: 'testpassword123',
      options: {
        data: {
          full_name: 'Test User',
        }
      }
    })
    console.log('[useAuth] Bypass result:', { success: !error, error })
    return { data, error }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    confirmEmail,
    bypassAuth,
  }
}