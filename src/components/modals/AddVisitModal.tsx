import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, Users, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface AddVisitModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CareCircle {
  id: string
  patient_first_name: string
  patient_last_name: string
}

interface FamilyMember {
  id: string
  full_name: string
  email: string
}

export const AddVisitModal: React.FC<AddVisitModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [careCircles, setCareCircles] = useState<CareCircle[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  
  // Form state
  const [selectedCircle, setSelectedCircle] = useState('')
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [visitorId, setVisitorId] = useState(user?.id || '')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, user])

  const loadData = async () => {
    if (!user) return

    try {
      // Load care circles user belongs to
      const { data: circleData, error: circleError } = await supabase
        .from('circle_members')
        .select(`
          circle_id,
          care_circles!inner(
            id,
            patient_first_name,
            patient_last_name
          )
        `)
        .eq('user_id', user.id)

      if (circleError) throw circleError

      const circles = circleData.map(item => item.care_circles)
      setCareCircles(circles)
      
      if (circles.length > 0) {
        setSelectedCircle(circles[0].id)
        await loadFamilyMembers(circles[0].id)
      }

    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const loadFamilyMembers = async (circleId: string) => {
    try {
      const { data, error } = await supabase
        .from('circle_members')
        .select(`
          user_id,
          users!inner(
            id,
            full_name,
            email
          )
        `)
        .eq('circle_id', circleId)

      if (error) throw error

      const members = data.map(item => item.users)
      setFamilyMembers(members)
    } catch (error) {
      console.error('Error loading family members:', error)
    }
  }

  const handleCircleChange = (circleId: string) => {
    setSelectedCircle(circleId)
    loadFamilyMembers(circleId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('visits')
        .insert({
          circle_id: selectedCircle,
          visitor_id: visitorId,
          visit_date: visitDate,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
          status: 'scheduled'
        })

      if (error) throw error

      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error creating visit:', error)
      alert('Failed to create visit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setVisitDate(new Date().toISOString().split('T')[0])
    setStartTime('09:00')
    setEndTime('10:00')
    setVisitorId(user?.id || '')
    setNotes('')
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Schedule Visit</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Care Circle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who are you visiting?
            </label>
            <select
              value={selectedCircle}
              onChange={(e) => handleCircleChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select patient</option>
              {careCircles.map((circle) => (
                <option key={circle.id} value={circle.id}>
                  {circle.patient_first_name} {circle.patient_last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Visitor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who's visiting?
            </label>
            <select
              value={visitorId}
              onChange={(e) => setVisitorId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select visitor</option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date
            </label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Start Time
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {generateTimeSlots().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {generateTimeSlots().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special notes for this visit..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Schedule Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}