import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './components/auth/LoginScreen'
import { SignUpScreen } from './components/auth/SignUpScreen'
import { CreateCircleScreen } from './components/onboarding/CreateCircleScreen'
import { ScheduleFirstVisitScreen } from './components/onboarding/ScheduleFirstVisitScreen'
import { InviteFamilyScreen } from './components/onboarding/InviteFamilyScreen'
import { Dashboard } from './components/Dashboard'
import { PremiumDashboard } from './components/PremiumDashboard'
import { CalendarScreen } from './components/calendar/CalendarScreen'
import { InviteJoinScreen } from './components/InviteJoinScreen'
import { UpdateNotification } from './components/pwa/UpdateNotification'
import { supabase } from './lib/supabase'
import './utils/serviceWorker' // Auto-register service worker

// Email confirmation callback component
const EmailConfirmationCallback: React.FC = () => {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const { confirmEmail } = useAuth()
  const navigate = React.useCallback((path: string) => {
    window.location.href = path
  }, [])

  React.useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        console.log('[EmailConfirmation] Starting email confirmation process...')
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')
        const type = urlParams.get('type')
        
        console.log('[EmailConfirmation] URL params:', { token: !!token, type })
        
        if (!token || type !== 'signup') {
          console.error('[EmailConfirmation] Missing token or wrong type')
          setError('Invalid confirmation link. Please try signing up again.')
          setTimeout(() => navigate('/signup'), 5000)
          return
        }

        // Confirm the email
        const { data, error } = await confirmEmail(token)
        
        if (error) {
          console.error('[EmailConfirmation] Confirmation error:', error)
          setError('Failed to confirm email. Please try again.')
          setTimeout(() => navigate('/signup'), 5000)
          return
        }

        if (data?.session) {
          console.log('[EmailConfirmation] Email confirmed successfully!')
          setSuccess(true)
          // Auto-redirect to onboarding after 2 seconds
          setTimeout(() => navigate('/onboarding/create-circle'), 2000)
        } else {
          setError('Email confirmation failed. Please try again.')
          setTimeout(() => navigate('/signup'), 5000)
        }
      } catch (err) {
        console.error('[EmailConfirmation] Unexpected error:', err)
        setError('An unexpected error occurred.')
        setTimeout(() => navigate('/signup'), 5000)
      } finally {
        setLoading(false)
      }
    }

    handleEmailConfirmation()
  }, [confirmEmail, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-textSecondary">Confirming your email...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">Email Confirmed!</h2>
          <p className="text-textSecondary mb-4">Your account has been successfully created.</p>
          <p className="text-sm text-textSecondary">Redirecting to setup...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">Confirmation Failed</h2>
          <p className="text-textSecondary mb-4">{error}</p>
          <p className="text-sm text-textSecondary">Redirecting to signup...</p>
        </div>
      </div>
    )
  }

  return null
}

// Test auth bypass component for testing
const TestAuthBypass: React.FC = () => {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const navigate = React.useCallback((path: string) => {
    window.location.href = path
  }, [])

  React.useEffect(() => {
    const bypassAuth = async () => {
      try {
        console.log('[TestAuthBypass] Starting auth bypass...')
        
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
        
        console.log('[TestAuthBypass] Bypass result:', { success: !error, error })
        
        if (error) {
          console.error('[TestAuthBypass] Bypass error:', error)
          setError('Failed to create test session. Please try again.')
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        if (data?.session) {
          console.log('[TestAuthBypass] Test session created successfully!')
          // Redirect to dashboard
          navigate('/dashboard')
        } else {
          setError('Failed to create test session. Please try again.')
          setTimeout(() => navigate('/login'), 3000)
        }
      } catch (err) {
        console.error('[TestAuthBypass] Unexpected error:', err)
        setError('An unexpected error occurred.')
        setTimeout(() => navigate('/login'), 3000)
      } finally {
        setLoading(false)
      }
    }

    bypassAuth()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-textSecondary">Setting up test session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">Setup Failed</h2>
          <p className="text-textSecondary mb-4">{error}</p>
          <p className="text-sm text-textSecondary">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return null
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" />
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return user ? <Navigate to="/dashboard" /> : <>{children}</>
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginScreen />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <SignUpScreen />
            </PublicRoute>
          } />
          
          {/* Email confirmation callback */}
          <Route path="/auth/callback" element={<EmailConfirmationCallback />} />
          
          {/* Test route for bypassing auth */}
          <Route path="/test" element={<TestAuthBypass />} />
          
          {/* Invite route (accessible to non-users) */}
          <Route path="/invite/:circleId" element={<InviteJoinScreen />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <PremiumDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/onboarding/create-circle" element={
            <ProtectedRoute>
              <CreateCircleScreen />
            </ProtectedRoute>
          } />
          
          <Route path="/circle/:circleId/schedule-first-visit" element={
            <ProtectedRoute>
              <ScheduleFirstVisitScreen />
            </ProtectedRoute>
          } />
          
          <Route path="/circle/:circleId/invite-family" element={
            <ProtectedRoute>
              <InviteFamilyScreen />
            </ProtectedRoute>
          } />
          
          <Route path="/circle/:circleId" element={
            <ProtectedRoute>
              <CalendarScreen />
            </ProtectedRoute>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
        
        {/* Global PWA components */}
        <UpdateNotification />
      </div>
    </Router>
  )
}

export default App