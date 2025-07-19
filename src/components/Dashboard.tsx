import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { CareCircle } from '../types'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { CalendarConnectButton } from './calendar/CalendarConnectButton'
import { InstallPrompt } from './pwa/InstallPrompt'
import { NotificationBell, NotificationCenter } from './notifications/NotificationCenter'
import { Logo } from './brand/Logo'
import { WelcomeMessage } from './WelcomeMessage'
import { BottomNavigation, BottomNavPadding } from './navigation/BottomNavigation'
import { Plus, Users, Calendar, LogOut } from 'lucide-react'

export const Dashboard: React.FC = () => {
  const [circles, setCircles] = useState<(CareCircle & { member_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchCircles()
  }, [user])

  const fetchCircles = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('circle_members')
        .select(`
          circle_id,
          care_circles!inner(
            id,
            patient_first_name,
            patient_last_name,
            facility_name,
            room_number,
            created_at,
            is_active
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error

      // Get member counts for each circle
      const circleData = data.map(item => item.care_circles)
      const circlesWithCounts = await Promise.all(
        circleData.map(async (circle) => {
          const { count } = await supabase
            .from('circle_members')
            .select('*', { count: 'exact', head: true })
            .eq('circle_id', circle.id)

          return {
            ...circle,
            member_count: count || 0
          }
        })
      )

      setCircles(circlesWithCounts)
    } catch (error) {
      console.error('Error fetching circles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-textSecondary">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <BottomNavPadding>
        {/* Simplified Header */}
        <div style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Logo size="md" showText={true} />
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <NotificationBell onClick={() => setShowNotifications(true)} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
        {/* PWA Install Prompt */}
        <div className="mb-6">
          <InstallPrompt />
        </div>

        {/* Calendar Integration Section */}
        <div className="mb-8">
          <CalendarConnectButton />
        </div>

        {circles.length === 0 ? (
          /* Empty State with Welcome Message */
          <div>
            <WelcomeMessage userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]} />
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-text mb-2">Ready to Get Started?</h2>
              <p className="text-textSecondary mb-6 max-w-md mx-auto">
                Create your first care circle to start coordinating visits with family and friends.
              </p>
              <Button
                onClick={() => navigate('/onboarding/create-circle')}
                className="flex items-center mx-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Care Circle
              </Button>
            </div>
          </div>
        ) : (
          /* Care Circles List */
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-text">Your Care Circles</h2>
              <Button
                onClick={() => navigate('/onboarding/create-circle')}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Circle
              </Button>
            </div>

            <div className="grid gap-4">
              {circles.map((circle) => (
                <Card
                  key={circle.id}
                  onClick={() => navigate(`/circle/${circle.id}`)}
                  className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text">
                        {circle.patient_first_name} {circle.patient_last_name}
                      </h3>
                      <div className="text-sm text-textSecondary space-y-1">
                        {circle.facility_name && (
                          <div>{circle.facility_name}</div>
                        )}
                        {circle.room_number && (
                          <div>Room {circle.room_number}</div>
                        )}
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {circle.member_count} members
                          </span>
                          <span className="text-xs">
                            Created {new Date(circle.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        </div>
      </BottomNavPadding>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  )
}