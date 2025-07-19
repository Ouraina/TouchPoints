import React from 'react'
import { Heart, Smile, Meh, Frown, AlertTriangle } from 'lucide-react'
import type { Visit } from '../../types'
import { getWeekDays, formatDate, formatTime, getDayName, getDateDisplay } from '../../utils/dateHelpers'
import { getVisitForTimeSlot } from '../../utils/visitConflicts'

interface WeekViewProps {
  visits: Visit[]
  onTimeSlotClick: (date: string, time: string) => void
  onVisitClick?: (visit: Visit) => void
  visitingHours: {
    start: string
    end: string
  }
}

export const WeekView: React.FC<WeekViewProps> = ({
  visits,
  onTimeSlotClick,
  onVisitClick,
  visitingHours
}) => {
  const weekDays = getWeekDays(new Date())
  const timeSlots = generateTimeSlots(visitingHours.start, visitingHours.end)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-8 gap-1 mb-4">
          <div className="p-2"></div> {/* Empty cell for time column */}
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="text-center p-2">
              <div className="font-medium text-text">{getDayName(day)}</div>
              <div className="text-sm text-textSecondary">{getDateDisplay(day)}</div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="space-y-1">
          {timeSlots.map((time) => (
            <div key={time} className="grid grid-cols-8 gap-1">
              {/* Time label */}
              <div className="p-2 text-sm text-textSecondary text-right font-medium">
                {formatTime(time)}
              </div>
              
              {/* Day slots */}
              {weekDays.map((day) => {
                const dateStr = formatDate(day)
                const visit = getVisitForTimeSlot(visits, dateStr, time)
                
                return (
                  <TimeSlot
                    key={`${dateStr}-${time}`}
                    date={dateStr}
                    time={time}
                    visit={visit}
                    onClick={() => onTimeSlotClick(dateStr, time)}
                    onVisitClick={onVisitClick}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface TimeSlotProps {
  date: string
  time: string
  visit?: Visit
  onClick: () => void
  onVisitClick?: (visit: Visit) => void
}

const TimeSlot: React.FC<TimeSlotProps> = ({ visit, onClick, onVisitClick }) => {
  const getMoodIcon = (mood?: string) => {
    switch (mood) {
      case 'great': return Heart
      case 'good': return Smile  
      case 'okay': return Meh
      case 'difficult': return Frown
      case 'concerning': return AlertTriangle
      default: return null
    }
  }

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'great': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'okay': return 'text-yellow-600'
      case 'difficult': return 'text-orange-600'
      case 'concerning': return 'text-red-600'
      default: return ''
    }
  }

  if (visit) {
    const MoodIcon = getMoodIcon(visit.mood)
    const moodColor = getMoodColor(visit.mood)
    
    const handleVisitClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onVisitClick) {
        onVisitClick(visit)
      }
    }

    return (
      <div 
        className="visit-slot visit-slot-scheduled cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={handleVisitClick}
        title="Click to view visit details"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-medium truncate flex-1">
            {visit.visitor?.full_name || 'Scheduled'}
          </div>
          {MoodIcon && (
            <MoodIcon className={`w-3 h-3 ml-1 ${moodColor}`} />
          )}
        </div>
        
        {visit.notes && (
          <div className="text-xs opacity-75 truncate">
            {visit.notes.length > 30 ? `${visit.notes.substring(0, 30)}...` : visit.notes}
          </div>
        )}
        
        {visit.mood && (
          <div className={`text-xs ${moodColor} opacity-75 mt-1 capitalize`}>
            {visit.mood}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="visit-slot visit-slot-empty hover:bg-gray-100 transition-colors" onClick={onClick}>
      <div className="text-xs text-center text-textSecondary">
        Available
      </div>
    </div>
  )
}

const generateTimeSlots = (startTime: string, endTime: string): string[] => {
  const slots = []
  const [startHour] = startTime.split(':').map(Number)
  const [endHour] = endTime.split(':').map(Number)
  
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
  }
  
  return slots
}