import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { CareCircle } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { formatDate, getWeekDays, formatTime } from '../../utils/dateHelpers'

export const ScheduleFirstVisitScreen: React.FC = () => {
  const { circleId } = useParams()
  const [circle, setCircle] = useState<CareCircle | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  const weekDays = getWeekDays(new Date())
  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']

  useEffect(() => {
    const fetchCircle = async () => {
      if (!circleId) return
      
      const { data, error } = await supabase
        .from('care_circles')
        .select('*')
        .eq('id', circleId)
        .single()

      if (error) {
        console.error('Error fetching circle:', error)
        return
      }

      setCircle(data)
    }

    fetchCircle()
  }, [circleId])

  const handleScheduleVisit = async () => {
    if (!selectedDate || !selectedTime || !circleId) return

    setLoading(true)
    setError('')

    try {
      const endTime = `${parseInt(selectedTime.split(':')[0]) + 1}:00`
      
      const { error } = await supabase
        .from('visits')
        .insert([
          {
            circle_id: circleId,
            visitor_id: user?.id,
            visit_date: selectedDate,
            start_time: selectedTime,
            end_time: endTime,
            status: 'scheduled'
          }
        ])

      if (error) throw error

      navigate(`/circle/${circleId}/invite-family`)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    navigate(`/circle/${circleId}/invite-family`)
  }

  if (!circle) return <div>Loading...</div>

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text mb-2">Schedule Your First Visit</h1>
          <p className="text-textSecondary">When would you like to visit {circle.patient_first_name}?</p>
        </div>

        <Card>
          <div className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-text mb-3">Select Date</h3>
              <div className="grid grid-cols-4 gap-2">
                {weekDays.slice(0, 7).map((date) => (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(formatDate(date))}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      selectedDate === formatDate(date)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-text hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-xs">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div>
                      {date.getDate()}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text mb-3">Select Time</h3>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      selectedTime === time
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-text hover:bg-gray-200'
                    }`}
                  >
                    {formatTime(time)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleScheduleVisit}
                disabled={!selectedDate || !selectedTime}
                loading={loading}
                className="flex-1"
              >
                Schedule Visit
              </Button>
              <Button
                variant="secondary"
                onClick={handleSkip}
                className="flex-1"
              >
                Skip for Now
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}