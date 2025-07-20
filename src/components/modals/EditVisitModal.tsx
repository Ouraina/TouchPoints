import React, { useState, useEffect } from 'react'
import { X, User, Calendar, Clock, FileText, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface EditVisitModalProps {
  isOpen: boolean
  onClose: () => void
  visitId: string | null
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

interface Visit {
  id: string
  circle_id: string
  visitor_id: string
  visit_date: string
  start_time: string
  end_time: string
  notes?: string
}

export const EditVisitModal: React.FC<EditVisitModalProps> = ({
  isOpen,
  onClose,
  visitId,
  onSuccess
}) => {
  const [visit, setVisit] = useState<Visit | null>(null)
  const [careCircles, setCareCircles] = useState<CareCircle[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedCircle, setSelectedCircle] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [visitorId, setVisitorId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (isOpen && visitId) {
      loadVisit()
      loadData()
    }
  }, [isOpen, visitId])

  const loadVisit = async () => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('id', visitId)
        .single()

      if (error) throw error

      setVisit(data)
      setSelectedCircle(data.circle_id)
      setVisitDate(data.visit_date)
      setStartTime(data.start_time)
      setEndTime(data.end_time)
      setVisitorId(data.visitor_id)
      setNotes(data.notes || '')
    } catch (error) {
      console.error('Error loading visit:', error)
    }
  }

  const loadData = async () => {
    try {
      const { data: circleData, error: circleError } = await supabase
        .from('care_circles')
        .select('id, patient_first_name, patient_last_name')

      if (circleError) throw circleError
      setCareCircles(circleData || [])

      if (visit?.circle_id) {
        await loadFamilyMembers(visit.circle_id)
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

      const members = data.map(item => item.users).flat() as FamilyMember[]
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
        .update({
          circle_id: selectedCircle,
          visitor_id: visitorId,
          visit_date: visitDate,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null
        })
        .eq('id', visitId)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating visit:', error)
      alert('Failed to update visit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this visit?')) {
      return
    }

    setDeleteLoading(true)

    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error deleting visit:', error)
      alert('Failed to delete visit. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
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

  if (!isOpen || !visit) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Visit</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Visit Date
            </label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

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
                <option value="">Select time</option>
                {generateTimeSlots().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                End Time
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select time</option>
                {generateTimeSlots().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any notes about this visit..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating...' : 'Update Visit'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 