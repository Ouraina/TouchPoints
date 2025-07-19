import type { Visit } from '../types'

export interface ConflictCheck {
  hasConflict: boolean
  conflictingVisit?: Visit
}

export const checkVisitConflict = (
  visits: Visit[],
  date: string,
  startTime: string,
  endTime: string,
  excludeVisitId?: string
): ConflictCheck => {
  const conflictingVisit = visits.find(visit => {
    if (visit.id === excludeVisitId) return false
    if (visit.visit_date !== date) return false
    if (visit.status === 'cancelled') return false
    
    // Check for time overlap
    const visitStart = timeToMinutes(visit.start_time)
    const visitEnd = timeToMinutes(visit.end_time)
    const newStart = timeToMinutes(startTime)
    const newEnd = timeToMinutes(endTime)
    
    return (newStart < visitEnd && newEnd > visitStart)
  })

  return {
    hasConflict: !!conflictingVisit,
    conflictingVisit
  }
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export const getVisitForTimeSlot = (
  visits: Visit[],
  date: string,
  time: string
): Visit | undefined => {
  return visits.find(visit => {
    if (visit.visit_date !== date) return false
    if (visit.status === 'cancelled') return false
    
    const visitStart = timeToMinutes(visit.start_time)
    const visitEnd = timeToMinutes(visit.end_time)
    const slotTime = timeToMinutes(time)
    
    return slotTime >= visitStart && slotTime < visitEnd
  })
}