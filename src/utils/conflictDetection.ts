import type { Visit } from '../types'

export interface ConflictResult {
  hasConflict: boolean
  conflictingVisit?: Visit
  message?: string
}

export const checkVisitConflict = (
  visits: Visit[],
  newVisitDate: string,
  newStartTime: string,
  newEndTime: string,
  excludeVisitId?: string
): ConflictResult => {
  // Find visits on the same date
  const sameDayVisits = visits.filter(visit => 
    visit.visit_date === newVisitDate && 
    visit.id !== excludeVisitId &&
    visit.status !== 'cancelled'
  )

  // Convert time strings to minutes for easier comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const newStart = timeToMinutes(newStartTime)
  const newEnd = timeToMinutes(newEndTime)

  // Check for overlaps
  for (const visit of sameDayVisits) {
    const existingStart = timeToMinutes(visit.start_time)
    const existingEnd = timeToMinutes(visit.end_time)

    // Check if times overlap
    const overlaps = (
      (newStart >= existingStart && newStart < existingEnd) || // New start is within existing
      (newEnd > existingStart && newEnd <= existingEnd) ||     // New end is within existing
      (newStart <= existingStart && newEnd >= existingEnd)     // New encompasses existing
    )

    if (overlaps) {
      return {
        hasConflict: true,
        conflictingVisit: visit,
        message: `${visit.visitor?.full_name || 'Someone'} is already visiting at this time (${visit.start_time} - ${visit.end_time})`
      }
    }
  }

  return { hasConflict: false }
}

export const getSuggestedAlternativeTimes = (
  visits: Visit[],
  targetDate: string,
  preferredDuration: number = 60, // in minutes
  visitingHours: { start: string; end: string }
): string[] => {
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const startMinutes = timeToMinutes(visitingHours.start)
  const endMinutes = timeToMinutes(visitingHours.end)
  const suggestions: string[] = []

  // Get existing visits for the day
  const sameDayVisits = visits
    .filter(visit => visit.visit_date === targetDate && visit.status !== 'cancelled')
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))

  // Find gaps between visits
  let currentTime = startMinutes

  for (const visit of sameDayVisits) {
    const visitStart = timeToMinutes(visit.start_time)
    const visitEnd = timeToMinutes(visit.end_time)

    // Check if there's a gap before this visit
    if (visitStart - currentTime >= preferredDuration) {
      suggestions.push(minutesToTime(currentTime))
    }

    currentTime = Math.max(currentTime, visitEnd)
  }

  // Check if there's time after the last visit
  if (endMinutes - currentTime >= preferredDuration) {
    suggestions.push(minutesToTime(currentTime))
  }

  return suggestions.slice(0, 3) // Return up to 3 suggestions
}