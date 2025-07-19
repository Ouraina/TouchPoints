import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'

export const CreateCircleScreen: React.FC = () => {
  const [patientFirstName, setPatientFirstName] = useState('')
  const [patientLastName, setPatientLastName] = useState('')
  const [facilityName, setFacilityName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [visitingHoursStart, setVisitingHoursStart] = useState('09:00')
  const [visitingHoursEnd, setVisitingHoursEnd] = useState('21:00')
  const [specialNotes, setSpecialNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create care circle
      const { data: circle, error: circleError } = await supabase
        .from('care_circles')
        .insert([
          {
            patient_first_name: patientFirstName,
            patient_last_name: patientLastName,
            facility_name: facilityName || null,
            room_number: roomNumber || null,
            visiting_hours_start: visitingHoursStart,
            visiting_hours_end: visitingHoursEnd,
            special_notes: specialNotes || null,
            created_by: user?.id,
          }
        ])
        .select()
        .single()

      if (circleError) throw circleError

      // Add creator as coordinator
      const { error: memberError } = await supabase
        .from('circle_members')
        .insert([
          {
            circle_id: circle.id,
            user_id: user?.id!,
            role: 'coordinator'
          }
        ])

      if (memberError) throw memberError

      navigate(`/circle/${circle.id}/schedule-first-visit`)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text mb-2">Create Care Circle</h1>
          <p className="text-textSecondary">Let's set up coordination for your loved one</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Patient's First Name"
              type="text"
              value={patientFirstName}
              onChange={(e) => setPatientFirstName(e.target.value)}
              required
              placeholder="Required"
            />

            <Input
              label="Patient's Last Name"
              type="text"
              value={patientLastName}
              onChange={(e) => setPatientLastName(e.target.value)}
              required
              placeholder="Required"
            />

            <Input
              label="Hospital/Facility Name"
              type="text"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              placeholder="Optional"
            />

            <Input
              label="Room Number"
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="Optional"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Visiting Hours Start"
                type="time"
                value={visitingHoursStart}
                onChange={(e) => setVisitingHoursStart(e.target.value)}
              />
              <Input
                label="Visiting Hours End"
                type="time"
                value={visitingHoursEnd}
                onChange={(e) => setVisitingHoursEnd(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Special Notes (Optional)
              </label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="input-field resize-none h-20"
                placeholder="Allergies, preferences, or other important information..."
              />
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Create Care Circle
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}