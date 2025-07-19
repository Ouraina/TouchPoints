import { format, addDays, startOfWeek, endOfWeek, isToday, isPast, parseISO } from 'date-fns'

export const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd')
}

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export const formatDateTime = (date: string, time: string): string => {
  const dateObj = parseISO(date)
  const formattedDate = format(dateObj, 'MMM d')
  return `${formattedDate} at ${formatTime(time)}`
}

export const getWeekDays = (startDate: Date): Date[] => {
  const week = []
  const start = startOfWeek(startDate, { weekStartsOn: 0 }) // Sunday
  
  for (let i = 0; i < 7; i++) {
    week.push(addDays(start, i))
  }
  
  return week
}

export const getTimeSlots = (startHour: number = 9, endHour: number = 21): string[] => {
  const slots = []
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
  }
  return slots
}

export const isWithinVisitingHours = (time: string, startTime?: string, endTime?: string): boolean => {
  if (!startTime || !endTime) return true
  
  const timeValue = parseInt(time.replace(':', ''))
  const startValue = parseInt(startTime.replace(':', ''))
  const endValue = parseInt(endTime.replace(':', ''))
  
  return timeValue >= startValue && timeValue < endValue
}

export const getDayName = (date: Date): string => {
  if (isToday(date)) return 'Today'
  return format(date, 'EEE')
}

export const getDateDisplay = (date: Date): string => {
  return format(date, 'MMM d')
}