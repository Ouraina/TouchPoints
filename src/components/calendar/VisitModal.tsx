import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCalendarSync } from '../../hooks/useCalendarSync'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { formatDate } from '../../utils/dateHelpers'
import { Calendar } from 'lucide-react'
import type { CareCircle } from '../../types'

interface VisitModalProps {
  isOpen: boolean
  onClose: () => void
  circleId: string
  circle?: CareCircle
  selectedDate?: string
  selectedTime?: string
  onVisitScheduled: () => void
}

export const VisitModal: React.FC<VisitModalProps> = ({
  isOpen,
  onClose,
  circleId,
  circle,
  selectedDate = '',
  selectedTime = '',
  onVisitScheduled
}) => {
  const [date, setDate] = useState(selectedDate || formatDate(new Date()))
  const [startTime, setStartTime] = useState(selectedTime || '10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<string | null>(null)
  const { user } = useAuth()
  const { isConnected, syncVisitCreate } = useCalendarSync()

  React.useEffect(() => {
    if (selectedDate) setDate(selectedDate)
    if (selectedTime) {
      setStartTime(selectedTime)
      const hour = parseInt(selectedTime.split(':')[0])
      setEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`)
    }
  }, [selectedDate, selectedTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCalendarSyncStatus(null)
    setLoading(true)

    try {
      // Create the visit first
      const { data: visitData, error: visitError } = await supabase
        .from('visits')
        .insert([
          {
            circle_id: circleId,
            visitor_id: user?.id,
            visit_date: date,
            start_time: startTime,
            end_time: endTime,
            notes: notes || null,
            status: 'scheduled'
          }
        ])
        .select()
        .single()

      if (visitError) throw visitError

      // Sync to calendar if connected and circle data is available
      if (isConnected && circle && visitData) {
        setCalendarSyncStatus('Syncing to calendar...')
        
        const syncResult = await syncVisitCreate(visitData, circle)
        
        if (syncResult.success) {
          setCalendarSyncStatus('✓ Synced to Google Calendar')
        } else {
          setCalendarSyncStatus('⚠️ Calendar sync failed (visit still scheduled)')
          console.warn('Calendar sync failed:', syncResult.error)
        }
      }

      onVisitScheduled()
      onClose()
      
      // Reset form
      setNotes('')
      setError('')
      setCalendarSyncStatus(null)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Visit">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {calendarSyncStatus && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {calendarSyncStatus}
            </p>
          </div>
        )}

        {isConnected && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              This visit will be synced to your Google Calendar
            </p>
          </div>
        )}

        <Input
          label="Visit Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          min={formatDate(new Date())}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Basic Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-field resize-none h-20"
            placeholder="Any special notes for this visit..."
          />
          <p className="text-xs text-gray-500 mt-1">
            You can add detailed notes and mood tracking after the visit
          </p>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            className="flex-1"
          >
            Schedule Visit
          </Button>
        </div>
      </form>
    </Modal>
  )
}