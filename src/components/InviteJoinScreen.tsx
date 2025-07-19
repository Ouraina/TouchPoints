import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { CareCircle } from '../types'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Users, MapPin, Clock } from 'lucide-react'

export const InviteJoinScreen: React.FC = () => {
  const { circleId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [circle, setCircle] = useState<CareCircle | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCircle()
  }, [circleId])

  const fetchCircle = async () => {
    if (!circleId) return

    try {
      const { data, error } = await supabase
        .from('care_circles')
        .select('*')
        .eq('id', circleId)
        .eq('is_active', true)
        .single()

      if (error) throw error
      setCircle(data)
    } catch (error) {
      console.error('Error fetching circle:', error)
      setError('Care circle not found or no longer active')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!circle || !user) return

    setJoining(true)
    setError('')

    try {
      // Check if user is already a member
      const { data: existing } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        navigate(`/circle/${circle.id}`)
        return
      }

      // Add user as a member
      const { error } = await supabase
        .from('circle_members')
        .insert([
          {
            circle_id: circle.id,
            user_id: user.id,
            role: 'visitor'
          }
        ])

      if (error) throw error

      navigate(`/circle/${circle.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to join care circle')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-textSecondary">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !circle) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <div className="text-error mb-4">
            <Users className="w-12 h-12 mx-auto mb-2" />
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">Invitation Not Found</h2>
          <p className="text-textSecondary mb-4">
            {error || 'This care circle invitation is no longer valid or the circle has been deactivated.'}
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <h2 className="text-xl font-semibold text-text mb-4">Join Care Circle</h2>
          <p className="text-textSecondary mb-6">
            You've been invited to join {circle.patient_first_name}'s care circle. 
            Please sign in or create an account to continue.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Sign In
            </Button>
            <Button 
              variant="secondary"
              onClick={() => navigate('/signup')}
              className="w-full"
            >
              Create Account
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">
            You're Invited!
          </h2>
          <p className="text-textSecondary">
            Join the care circle to help coordinate visits
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-text text-lg">
              {circle.patient_first_name} {circle.patient_last_name}
            </h3>
            
            {circle.facility_name && (
              <div className="flex items-center mt-2 text-sm text-textSecondary">
                <MapPin className="w-4 h-4 mr-2" />
                {circle.facility_name}
                {circle.room_number && ` • Room ${circle.room_number}`}
              </div>
            )}
            
            {circle.visiting_hours_start && circle.visiting_hours_end && (
              <div className="flex items-center mt-2 text-sm text-textSecondary">
                <Clock className="w-4 h-4 mr-2" />
                Visiting hours: {circle.visiting_hours_start} - {circle.visiting_hours_end}
              </div>
            )}
          </div>

          {circle.special_notes && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-text">{circle.special_notes}</p>
            </div>
          )}
        </div>

        <Button
          onClick={handleJoin}
          loading={joining}
          className="w-full"
        >
          Join Care Circle
        </Button>
      </Card>
    </div>
  )
}