import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './components/auth/LoginScreen'
import { SignUpScreen } from './components/auth/SignUpScreen'
import { CreateCircleScreen } from './components/onboarding/CreateCircleScreen'
import { ScheduleFirstVisitScreen } from './components/onboarding/ScheduleFirstVisitScreen'
import { InviteFamilyScreen } from './components/onboarding/InviteFamilyScreen'
import { Dashboard } from './components/Dashboard'
import { CalendarScreen } from './components/calendar/CalendarScreen'
import { InviteJoinScreen } from './components/InviteJoinScreen'
import { UpdateNotification } from './components/pwa/UpdateNotification'
import './utils/serviceWorker' // Auto-register service worker

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
          
          {/* Invite route (accessible to non-users) */}
          <Route path="/invite/:circleId" element={<InviteJoinScreen />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
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