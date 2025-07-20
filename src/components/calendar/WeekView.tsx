import React from 'react'
import { Heart, Smile, Meh, Frown, AlertTriangle, Clock } from 'lucide-react'
import type { Visit, CircleMember } from '../../types'
import { getWeekDays, formatDate, formatTime, getDayName, getDateDisplay } from '../../utils/dateHelpers'
import { getVisitForTimeSlot } from '../../utils/visitConflicts'

interface WeekViewProps {
  visits: Visit[]
  members?: CircleMember[]
  onTimeSlotClick: (date: string, time: string) => void
  onVisitClick?: (visit: Visit) => void
  visitingHours: {
    start: string
    end: string
  }
}

export const WeekView: React.FC<WeekViewProps> = ({
  visits,
  members = [],
  onTimeSlotClick,
  onVisitClick,
  visitingHours
}) => {
  const weekDays = getWeekDays(new Date())
  const timeSlots = generateTimeSlots(visitingHours.start, visitingHours.end)
  const currentTime = new Date()
  const currentTimeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`

  // Color coding system for family members
  const getColorForMember = (visitorId?: string): string => {
    if (!visitorId || !members.length) return 'bg-blue-500'
    
    const memberIndex = members.findIndex(m => m.user_id === visitorId)
    const colors = [
      'bg-blue-500',    // Member 1: Blue
      'bg-green-500',   // Member 2: Green  
      'bg-purple-500',  // Member 3: Purple
      'bg-orange-500',  // Member 4: Orange
      'bg-pink-500'     // Member 5: Pink
    ]
    return colors[memberIndex % colors.length] || 'bg-blue-500'
  }

  const getBorderColorForMember = (visitorId?: string): string => {
    if (!visitorId || !members.length) return 'border-blue-600'
    
    const memberIndex = members.findIndex(m => m.user_id === visitorId)
    const colors = [
      'border-blue-600',    // Member 1: Blue
      'border-green-600',   // Member 2: Green  
      'border-purple-600',  // Member 3: Purple
      'border-orange-600',  // Member 4: Orange
      'border-pink-600'     // Member 5: Pink
    ]
    return colors[memberIndex % colors.length] || 'border-blue-600'
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px] lg:min-w-0">
        {/* Color Legend */}
        {members.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium text-gray-700">Family Members:</span>
              {members.map((member, index) => {
                const colorClass = [
                  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'
                ][index % 5]
                return (
                  <div key={member.id} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                    <span className="text-sm text-gray-600">{member.user?.full_name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="grid grid-cols-8 gap-1 mb-4">
          <div className="p-3 flex items-center justify-center">
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
          {weekDays.map((day) => {
            const isCurrentDay = formatDate(day) === formatDate(new Date())
            return (
              <div key={day.toISOString()} className={`text-center p-3 rounded-lg ${
                isCurrentDay ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
              }`}>
                <div className={`font-semibold ${
                  isCurrentDay ? 'text-blue-700' : 'text-gray-700'
                }`}>{getDayName(day)}</div>
                <div className={`text-sm ${
                  isCurrentDay ? 'text-blue-600' : 'text-gray-500'
                }`}>{getDateDisplay(day)}</div>
              </div>
            )
          })}
        </div>

        {/* Calendar Grid */}
        <div className="relative">
          {/* Time slots */}
          <div className="space-y-0">
            {timeSlots.map((time, timeIndex) => {
              const isCurrentTimeSlot = formatDate(new Date()) === formatDate(new Date()) && 
                                      time <= currentTimeString && 
                                      (timeSlots[timeIndex + 1] ? timeSlots[timeIndex + 1] > currentTimeString : true)
              
              return (
                <div key={time} className="relative">
                  <div className="grid grid-cols-8 gap-1">
                    {/* Time label */}
                    <div className={`p-3 text-sm text-right font-medium border-r border-gray-200 ${
                      isCurrentTimeSlot ? 'text-blue-600 font-semibold' : 'text-gray-500'
                    }`}>
                      {formatTime(time)}
                    </div>
                    
                    {/* Day slots */}
                    {weekDays.map((day) => {
                      const dateStr = formatDate(day)
                      const visit = getVisitForTimeSlot(visits, dateStr, time)
                      const isToday = formatDate(day) === formatDate(new Date())
                      
                      return (
                        <div key={`${dateStr}-${time}`} className="relative">
                          <TimeSlot
                            date={dateStr}
                            time={time}
                            visit={visit}
                            isToday={isToday}
                            onClick={() => onTimeSlotClick(dateStr, time)}
                            onVisitClick={onVisitClick}
                            getColorForMember={getColorForMember}
                            getBorderColorForMember={getBorderColorForMember}
                          />
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Current time indicator */}
                  {isCurrentTimeSlot && (
                    <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 z-10">
                      <div className="h-0.5 bg-red-500 shadow-sm">
                        <div className="absolute left-16 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface TimeSlotProps {
  date: string
  time: string
  visit?: Visit
  isToday?: boolean
  onClick: () => void
  onVisitClick?: (visit: Visit) => void
  getColorForMember: (visitorId?: string) => string
  getBorderColorForMember: (visitorId?: string) => string
}

const TimeSlot: React.FC<TimeSlotProps> = ({ 
  visit, 
  isToday, 
  onClick, 
  onVisitClick, 
  getColorForMember, 
  getBorderColorForMember 
}) => {
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

    const colorClass = getColorForMember(visit.visitor_id)
    const borderClass = getBorderColorForMember(visit.visitor_id)
    
    return (
      <div 
        className={`
          relative p-3 m-1 rounded-lg cursor-pointer transition-all duration-200
          ${colorClass} text-white border-l-4 ${borderClass}
          hover:shadow-lg hover:scale-105 transform
          min-h-[60px] flex flex-col justify-center
        `}
        onClick={handleVisitClick}
        title={`${visit.visitor?.full_name || 'Scheduled'} - Click to view details`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold truncate flex-1">
            {visit.visitor?.full_name || 'Scheduled'}
          </div>
          {MoodIcon && (
            <MoodIcon className="w-4 h-4 ml-2 text-white opacity-90" />
          )}
        </div>
        
        <div className="text-xs opacity-90">
          {formatTime(visit.start_time)} - {formatTime(visit.end_time)}
        </div>
        
        {visit.notes && (
          <div className="text-xs opacity-80 truncate mt-1">
            {visit.notes.length > 25 ? `${visit.notes.substring(0, 25)}...` : visit.notes}
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      className={`
        relative p-3 m-1 rounded-lg border-2 border-dashed transition-all duration-200
        cursor-pointer min-h-[60px] flex items-center justify-center
        ${
          isToday 
            ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400' 
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
        }
        hover:shadow-sm
      `}
      onClick={onClick}
      title="Click to schedule a visit"
    >
      <div className={`text-xs text-center font-medium ${
        isToday ? 'text-blue-600' : 'text-gray-500'
      }`}>
        Available
      </div>
    </div>
  )
}

const generateTimeSlots = (startTime: string, endTime: string): string[] => {
  const slots = []
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  let currentHour = startHour
  let currentMin = startMin
  
  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`)
    
    // Add 30 minutes
    currentMin += 30
    if (currentMin >= 60) {
      currentMin = 0
      currentHour += 1
    }
  }
  
  return slots
}