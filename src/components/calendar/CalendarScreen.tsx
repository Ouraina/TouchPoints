import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { CareCircle, Visit, CircleMember } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { useVisitPatterns } from '../../hooks/useVisitPatterns'
import { WeekView } from './WeekView'
import { VisitModal } from './VisitModal'
import { VisitDetailsModal } from '../visit/VisitDetailsModal'
import { VisitSuggestions } from '../suggestions/VisitSuggestions'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Plus, Settings, MessageSquare, Brain, RefreshCw } from 'lucide-react'

export const CalendarScreen: React.FC = () => {
  const { circleId } = useParams()
  const { } = useAuth()
  const [circle, setCircle] = useState<CareCircle | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [members, setMembers] = useState<CircleMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [showVisitDetailsModal, setShowVisitDetailsModal] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  
  // Visit patterns integration
  const {
    suggestions,
    isLoading: patternsLoading,
    isAnalyzing,
    error: patternsError,
    analyzePatternsForCircle,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    refreshSuggestions,
    clearError
  } = useVisitPatterns()

  useEffect(() => {
    fetchData()
  }, [circleId])

  // Initialize patterns when circle data is loaded
  useEffect(() => {
    if (circleId && circle && visits.length > 0) {
      initializePatterns()
    }
  }, [circleId, circle, visits.length])

  const initializePatterns = async () => {
    if (!circleId) return
    
    // Analyze patterns and generate suggestions
    await analyzePatternsForCircle(circleId)
    await generateSuggestions(circleId)
  }

  const fetchData = async () => {
    if (!circleId) return

    try {
      // Fetch circle details
      const { data: circleData, error: circleError } = await supabase
        .from('care_circles')
        .select('*')
        .eq('id', circleId)
        .single()

      if (circleError) throw circleError
      setCircle(circleData)

      // Fetch visits for this week
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select(`
          *,
          visitor:visitor_id(full_name)
        `)
        .eq('circle_id', circleId)
        .gte('visit_date', new Date().toISOString().split('T')[0])
        .order('visit_date', { ascending: true })

      if (visitsError) throw visitsError
      setVisits(visitsData || [])

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('circle_members')
        .select(`
          *,
          user:user_id(full_name, email)
        `)
        .eq('circle_id', circleId)

      if (membersError) throw membersError
      setMembers(membersData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTimeSlotClick = (date: string, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    setShowVisitModal(true)
  }

  const handleVisitClick = (visit: Visit) => {
    setSelectedVisit(visit)
    setShowVisitDetailsModal(true)
  }

  const handleVisitScheduled = async () => {
    setShowVisitModal(false)
    await fetchData() // Refresh data
    
    // Refresh suggestions after new visit is scheduled
    if (circleId) {
      await refreshSuggestions(circleId)
    }
  }

  const handleVisitUpdated = async () => {
    await fetchData() // Refresh data to show updated visit
  }

  const handleVisitDeleted = async () => {
    setShowVisitDetailsModal(false)
    setSelectedVisit(null)
    await fetchData() // Refresh data
    
    // Refresh suggestions after visit is deleted
    if (circleId) {
      await refreshSuggestions(circleId)
    }
  }

  const handleAcceptSuggestion = async (suggestion: any) => {
    if (!circleId) return
    
    const result = await acceptSuggestion(suggestion, circleId)
    if (result.success) {
      await fetchData() // Refresh visits
    }
  }

  const handleRejectSuggestion = async (suggestion: any) => {
    if (!circleId) return
    
    await rejectSuggestion(suggestion, circleId)
  }

  const handleRefreshPatterns = async () => {
    if (!circleId) return
    
    await initializePatterns()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-textSecondary">Loading care circle...</p>
        </div>
      </div>
    )
  }

  if (!circle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-error">Care circle not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-text">
                {circle.patient_first_name} {circle.patient_last_name}
              </h1>
              <p className="text-sm text-textSecondary">
                {circle.facility_name && `${circle.facility_name} • `}
                {circle.room_number && `Room ${circle.room_number}`}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex items-center"
                onClick={handleRefreshPatterns}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-1" />
                )}
                {isAnalyzing ? 'Learning...' : 'Refresh Patterns'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex items-center"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Updates
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex items-center"
              >
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{visits.length}</div>
              <div className="text-sm text-textSecondary">Upcoming Visits</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{members.length}</div>
              <div className="text-sm text-textSecondary">Family Members</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {circle.visiting_hours_start && circle.visiting_hours_end
                  ? `${circle.visiting_hours_start} - ${circle.visiting_hours_end}`
                  : 'All Day'
                }
              </div>
              <div className="text-sm text-textSecondary">Visiting Hours</div>
            </div>
          </Card>
        </div>

        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-6">
            <VisitSuggestions
              suggestions={suggestions}
              onAccept={handleAcceptSuggestion}
              onReject={handleRejectSuggestion}
              loading={patternsLoading}
            />
          </div>
        )}

        {/* Error display */}
        {patternsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{patternsError}</p>
            <button
              onClick={clearError}
              className="text-xs text-red-500 hover:text-red-700 mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Calendar */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text">Visit Schedule</h2>
            <Button
              onClick={() => setShowVisitModal(true)}
              className="flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Visit
            </Button>
          </div>

          <WeekView
            visits={visits}
            onTimeSlotClick={handleTimeSlotClick}
            onVisitClick={handleVisitClick}
            visitingHours={{
              start: circle.visiting_hours_start || '09:00',
              end: circle.visiting_hours_end || '21:00'
            }}
          />
        </Card>

        {/* Family Members */}
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-text mb-4">Family Circle</h2>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-text">{member.user?.full_name}</div>
                  <div className="text-sm text-textSecondary">{member.role}</div>
                </div>
                <div className="text-sm text-textSecondary">
                  {member.user?.email}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Visit Modal */}
      <VisitModal
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
        circleId={circleId!}
        circle={circle}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onVisitScheduled={handleVisitScheduled}
      />

      {/* Visit Details Modal */}
      <VisitDetailsModal
        isOpen={showVisitDetailsModal}
        onClose={() => {
          setShowVisitDetailsModal(false)
          setSelectedVisit(null)
        }}
        visit={selectedVisit}
        circle={circle}
        onVisitUpdated={handleVisitUpdated}
        onVisitDeleted={handleVisitDeleted}
      />
    </div>
  )
}