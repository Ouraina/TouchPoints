import React, { useState, useEffect } from 'react'
import { Home, Calendar, Users, Bell, Plus, MapPin, Clock, Edit, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { AddVisitModal } from './modals/AddVisitModal'
import { EditVisitModal } from './modals/EditVisitModal'
import { ToastContainer, useToast } from './ui/Toast'

interface Visit {
  id: string
  visit_date: string
  start_time: string
  end_time: string
  notes?: string
  status: string
  visitor: {
    full_name: string
  }
  care_circles: {
    patient_first_name: string
    patient_last_name: string
  }
}

interface CareCircle {
  id: string
  patient_first_name: string
  patient_last_name: string
  member_count: number
}

export const SimpleDashboard: React.FC = () => {
  const { user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [todaysVisits, setTodaysVisits] = useState<Visit[]>([])
  const [careCircles, setCareCircles] = useState<CareCircle[]>([])
  const [totalVisitsToday, setTotalVisitsToday] = useState(0)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)
      await Promise.all([
        loadTodaysVisits(),
        loadCareCircles()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      addToast({ type: 'error', title: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const loadTodaysVisits = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('visits')
      .select(`
        id,
        visit_date,
        start_time,
        end_time,
        notes,
        status,
        visitor:users!visits_visitor_id_fkey(
          full_name
        ),
        care_circles!visits_circle_id_fkey(
          patient_first_name,
          patient_last_name
        )
      `)
      .eq('visit_date', today)
      .in('circle_id', await getUserCircleIds())
      .order('start_time')

    if (error) throw error

    setTodaysVisits(data || [])
    setTotalVisitsToday(data?.length || 0)
  }

  const loadCareCircles = async () => {
    const { data: circleData, error } = await supabase
      .from('circle_members')
      .select(`
        circle_id,
        care_circles!inner(
          id,
          patient_first_name,
          patient_last_name
        )
      `)
      .eq('user_id', user!.id)

    if (error) throw error

    const circles = circleData.map(item => item.care_circles)
    
    // Get member counts
    const circlesWithCounts = await Promise.all(
      circles.map(async (circle) => {
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

    setCareCircles(circlesWithCounts)
  }

  const getUserCircleIds = async () => {
    const { data, error } = await supabase
      .from('circle_members')
      .select('circle_id')
      .eq('user_id', user!.id)

    if (error) throw error
    return data.map(item => item.circle_id)
  }

  const handleAddVisitSuccess = () => {
    addToast({ type: 'success', title: 'Visit scheduled successfully!' })
    loadDashboardData()
  }

  const handleEditVisitSuccess = () => {
    addToast({ type: 'success', title: 'Visit updated successfully!' })
    loadDashboardData()
  }

  const handleEditVisit = (visitId: string) => {
    setSelectedVisitId(visitId)
    setShowEditModal(true)
  }

  const handleDeleteVisit = async (visitId: string) => {
    if (!confirm('Are you sure you want to delete this visit?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId)

      if (error) throw error

      addToast({ type: 'success', title: 'Visit deleted successfully!' })
      loadDashboardData()
    } catch (error) {
      console.error('Error deleting visit:', error)
      addToast({ type: 'error', title: 'Failed to delete visit' })
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header - NO LOGO */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Good morning</p>
            <h1 className="text-xl font-semibold text-gray-900">Welcome, Test! 👋</h1>
          </div>
          <div className="flex gap-3">
            <button className="p-2">
              <Bell className="w-6 h-6 text-gray-400" />
            </button>
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              T
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-3xl font-bold text-blue-600">{totalVisitsToday}</p>
          <p className="text-sm text-gray-500">Visits Today</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-3xl font-bold text-green-600">{careCircles.length}</p>
          <p className="text-sm text-gray-500">Care Circles</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <Calendar className="w-8 h-8 text-blue-600 mb-2" />
            <p className="text-sm font-medium text-gray-900">Schedule Visit</p>
          </button>
          <button className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <Users className="w-8 h-8 text-green-600 mb-2" />
            <p className="text-sm font-medium text-gray-900">Add Family</p>
          </button>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Today's Schedule</h2>
        <div className="space-y-3">
          {todaysVisits.length > 0 ? (
            todaysVisits.map((visit) => (
              <div key={visit.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Visit with {visit.care_circles.patient_first_name} {visit.care_circles.patient_last_name}
                    </p>
                    <p className="text-sm text-gray-500">Visitor: {visit.visitor.full_name}</p>
                    {visit.notes && (
                      <p className="text-sm text-gray-400 mt-1">{visit.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatTime(visit.start_time)}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditVisit(visit.id)
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteVisit(visit.id)
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No visits scheduled today</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="text-blue-600 text-sm font-medium mt-2 hover:text-blue-700"
              >
                Schedule a visit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Family Members */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Family Members</h2>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">S</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Sarah Johnson</p>
              <p className="text-sm text-gray-500">Daughter • Last visit: 2 days ago</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-semibold">M</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Mike Johnson</p>
              <p className="text-sm text-gray-500">Son • Last visit: 1 week ago</p>
            </div>
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 py-2">
          <button className="flex flex-col items-center py-2">
            <Home className="w-6 h-6 text-blue-600" />
            <span className="text-xs text-blue-600 mt-1 font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <Calendar className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Calendar</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center py-2"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-1 hover:bg-blue-700 transition-colors">
              <Plus className="w-6 h-6 text-white" />
            </div>
          </button>
          <button className="flex flex-col items-center py-2">
            <Users className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Family</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
            <span className="text-xs text-gray-400 mt-1">Profile</span>
          </button>
        </div>
      </div>

      {/* Add Visit Modal */}
      <AddVisitModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddVisitSuccess}
      />

      {/* Edit Visit Modal */}
      {selectedVisitId && (
        <EditVisitModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedVisitId(null)
          }}
          onSuccess={handleEditVisitSuccess}
          visitId={selectedVisitId}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}