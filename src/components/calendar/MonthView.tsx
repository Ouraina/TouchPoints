import React from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns'
import type { Visit, CircleMember } from '../../types'
import { formatDate } from '../../utils/dateHelpers'

interface MonthViewProps {
  visits: Visit[]
  members?: CircleMember[]
  currentDate: Date
  onDateClick: (date: Date) => void
  onVisitClick?: (visit: Visit) => void
}

export const MonthView: React.FC<MonthViewProps> = ({
  visits,
  members = [],
  currentDate,
  onDateClick,
  onVisitClick
}) => {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  // Get all days to display (including padding days from previous/next month)
  const startDate = new Date(monthStart)
  startDate.setDate(startDate.getDate() - getDay(monthStart))
  
  const endDate = new Date(monthEnd)
  endDate.setDate(endDate.getDate() + (6 - getDay(monthEnd)))
  
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  
  // Group visits by date
  const visitsByDate = visits.reduce((acc, visit) => {
    const date = visit.visit_date
    if (!acc[date]) acc[date] = []
    acc[date].push(visit)
    return acc
  }, {} as Record<string, Visit[]>)

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

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="bg-white rounded-lg">
      {/* Month Header */}
      <div className="mb-4 text-center">
        <h2 className="text-xl font-semibold text-gray-800">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = formatDate(day)
          const dayVisits = visitsByDate[dateStr] || []
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)
          
          return (
            <div
              key={day.toISOString()}
              className={`
                relative min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border rounded-lg cursor-pointer transition-all duration-200
                ${isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}
                ${isCurrentDay ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                hover:bg-gray-50 hover:border-gray-300
              `}
              onClick={() => onDateClick(day)}
            >
              {/* Date Number */}
              <div className={`
                text-sm font-medium mb-1
                ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${isCurrentDay ? 'text-blue-600 font-bold' : ''}
              `}>
                {format(day, 'd')}
              </div>

              {/* Visit Indicators */}
              {dayVisits.length > 0 && (
                <div className="space-y-1">
                  {dayVisits.slice(0, 3).map((visit) => {
                    const colorClass = getColorForMember(visit.visitor_id)
                    
                    return (
                      <div
                        key={visit.id}
                        className={`
                          text-xs p-1 rounded text-white truncate cursor-pointer
                          ${colorClass} hover:opacity-80
                        `}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onVisitClick) onVisitClick(visit)
                        }}
                        title={`${visit.visitor?.full_name || 'Scheduled'} at ${visit.start_time}`}
                      >
                        {visit.visitor?.full_name?.split(' ')[0] || 'Visit'}
                      </div>
                    )
                  })}
                  
                  {/* Show more indicator */}
                  {dayVisits.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayVisits.length - 3} more
                    </div>
                  )}
                </div>
              )}

              {/* Empty state for current month days */}
              {dayVisits.length === 0 && isCurrentMonth && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-gray-200 opacity-50"></div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      {members.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
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
    </div>
  )
}