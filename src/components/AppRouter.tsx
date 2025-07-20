import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LandingPage } from './landing/LandingPage'
import { QuickStartWizard } from './onboarding/QuickStartWizard'
import { SubscriptionManager } from './billing/SubscriptionManager'
import { LoginScreen } from './auth/LoginScreen'
import { SignUpScreen } from './auth/SignUpScreen'
import { CalendarScreen } from './calendar/CalendarScreen'
import { FamilyInsightsDashboard } from './insights/FamilyInsightsDashboard'
import { MemoryTimeline } from './memories/MemoryTimeline'
import { SimpleDashboard } from './SimpleDashboard'
import PricingPage from '../pages/PricingPage'

export const AppRouter: React.FC = () => {
  const { user, loading } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPricing, setShowPricing] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // If no user, show landing page or auth
  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignUpScreen />} />
          <Route path="/pricing" element={
            <SubscriptionManager 
              onSubscribe={(tierId) => {
                console.log('Selected plan:', tierId)
                // In production, this would redirect to Stripe
                setShowOnboarding(true)
              }}
            />
          } />
          <Route path="/*" element={
            <>
              {showOnboarding ? (
                <QuickStartWizard />
              ) : showPricing ? (
                <SubscriptionManager 
                  onSubscribe={(tierId) => {
                    console.log('Selected plan:', tierId)
                    setShowOnboarding(true)
                  }}
                />
              ) : (
                <LandingPage 
                  onGetStarted={() => setShowPricing(true)}
                  onSignUp={(email) => {
                    console.log('Email signup:', email)
                    setShowPricing(true)
                  }}
                />
              )}
            </>
          } />
        </Routes>
      </Router>
    )
  }

  // If user is logged in, show main app
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<SimpleDashboard />} />
        <Route path="/calendar/:circleId" element={<CalendarScreen />} />
        <Route path="/insights/:circleId" element={<FamilyInsightsDashboard visits={[]} members={[]} circle={{} as any} />} />
        <Route path="/memories/:circleId" element={<MemoryTimeline visits={[]} patientName="Patient" />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/subscription" element={<SubscriptionManager />} />
        <Route path="/onboarding" element={<QuickStartWizard />} />
        <Route path="/*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}