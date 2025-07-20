import React, { useState, useEffect } from 'react'
import { format, isToday, isTomorrow, addHours, differenceInHours } from 'date-fns'
import { 
  Bell, 
  X, 
  Clock, 
  Calendar, 
  Heart, 
  Camera, 
  AlertTriangle,
  CheckCircle,
  Users,
  TrendingUp,
  MessageSquare
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { Visit, CircleMember, CareCircle } from '../../types'

interface SmartNotification {
  id: string
  type: 'visit_reminder' | 'empty_slot' | 'mood_alert' | 'photo_shared' | 'weekly_report' | 'pattern_detected' | 'milestone'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
  actionable?: boolean
  actionText?: string
  actionData?: any
  icon?: React.ReactNode
}

interface SmartNotificationCenterProps {
  visits: Visit[]
  members: CircleMember[]
  circle: CareCircle
  isOpen: boolean
  onClose: () => void
  onNotificationAction?: (notification: SmartNotification) => void
}

export const SmartNotificationCenter: React.FC<SmartNotificationCenterProps> = ({
  visits,
  members,
  circle,
  isOpen,
  onClose,
  onNotificationAction
}) => {
  const [notifications, setNotifications] = useState<SmartNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    generateSmartNotifications()
  }, [visits, members])

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.isRead).length)
  }, [notifications])

  const generateSmartNotifications = () => {
    const newNotifications: SmartNotification[] = []
    const now = new Date()

    // 1. Visit Reminders (1 hour before)
    visits.forEach(visit => {
      const visitTime = new Date(`${visit.visit_date}T${visit.start_time}`)
      const hoursBefore = differenceInHours(visitTime, now)
      
      if (hoursBefore > 0 && hoursBefore <= 1 && visit.status === 'scheduled') {
        newNotifications.push({
          id: `reminder-${visit.id}`,
          type: 'visit_reminder',
          title: 'Visit Reminder',
          message: `Your visit with ${circle.patient_first_name} is in ${Math.round(hoursBefore * 60)} minutes`,
          timestamp: now,
          isRead: false,
          priority: 'high',
          actionable: true,
          actionText: 'View Details',
          actionData: { visitId: visit.id },
          icon: <Clock className="w-5 h-5 text-blue-500" />
        })
      }
    })

    // 2. Empty Slot Alerts (tomorrow has no visits)
    const tomorrow = addHours(now, 24)
    const tomorrowVisits = visits.filter(v => 
      v.visit_date === format(tomorrow, 'yyyy-MM-dd') && v.status === 'scheduled'
    )
    
    if (tomorrowVisits.length === 0) {
      newNotifications.push({
        id: 'empty-tomorrow',
        type: 'empty_slot',
        title: 'No visits tomorrow',
        message: `${circle.patient_first_name} has no visits scheduled for tomorrow. Consider scheduling one.`,
        timestamp: now,
        isRead: false,
        priority: 'medium',
        actionable: true,
        actionText: 'Schedule Visit',
        actionData: { date: format(tomorrow, 'yyyy-MM-dd') },
        icon: <AlertTriangle className="w-5 h-5 text-orange-500" />
      })
    }

    // 3. Mood Pattern Alerts
    const recentVisits = visits
      .filter(v => v.mood && new Date(v.visit_date) >= addHours(now, -72))
      .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
    
    const recentDifficult = recentVisits
      .slice(0, 3)
      .filter(v => v.mood && ['difficult', 'concerning'].includes(v.mood))
    
    if (recentDifficult.length >= 2) {
      newNotifications.push({
        id: 'mood-pattern',
        type: 'mood_alert',
        title: 'Mood Pattern Alert',
        message: `${circle.patient_first_name} has had ${recentDifficult.length} challenging visits recently. Consider reaching out to care team.`,
        timestamp: now,
        isRead: false,
        priority: 'high',
        actionable: true,
        actionText: 'Contact Team',
        icon: <Heart className="w-5 h-5 text-red-500" />
      })
    }

    // 4. Photo Sharing Notifications
    const recentPhotos = visits.filter(v => 
      v.enhanced_notes?.photos && 
      new Date(v.visit_date) >= addHours(now, -24)
    )
    
    if (recentPhotos.length > 0) {
      newNotifications.push({
        id: 'photos-shared',
        type: 'photo_shared',
        title: 'New photos shared',
        message: `${recentPhotos.length} new photo(s) added from recent visits`,
        timestamp: now,
        isRead: false,
        priority: 'low',
        actionable: true,
        actionText: 'View Photos',
        icon: <Camera className="w-5 h-5 text-green-500" />
      })
    }

    // 5. Pattern Detection Notifications
    const memberPatterns = analyzeMemberPatterns()
    memberPatterns.forEach(pattern => {
      newNotifications.push({
        id: `pattern-${pattern.memberId}`,
        type: 'pattern_detected',
        title: 'Pattern Detected',
        message: pattern.message,
        timestamp: now,
        isRead: false,
        priority: 'low',
        icon: <TrendingUp className="w-5 h-5 text-purple-500" />
      })
    })

    // 6. Weekly Reports (Sunday evening)
    if (now.getDay() === 0 && now.getHours() >= 18) {
      const weekSummary = generateWeekSummary()
      newNotifications.push({
        id: 'weekly-report',
        type: 'weekly_report',
        title: 'Weekly Care Summary',
        message: weekSummary,
        timestamp: now,
        isRead: false,
        priority: 'medium',
        actionable: true,
        actionText: 'View Report',
        icon: <MessageSquare className="w-5 h-5 text-blue-500" />
      })
    }

    // Sort by priority and timestamp
    newNotifications.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 }
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority]
      }
      return b.timestamp.getTime() - a.timestamp.getTime()
    })

    setNotifications(newNotifications)
  }

  const analyzeMemberPatterns = () => {
    const patterns: Array<{ memberId: string; message: string }> = []
    
    members.forEach(member => {
      const memberVisits = visits.filter(v => v.visitor_id === member.user_id)
      
      if (memberVisits.length >= 3) {
        // Check for weekly consistency
        const weeksWithVisits = new Set(memberVisits.map(v => {
          const date = new Date(v.visit_date)
          const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
          return weekStart.toISOString()
        }))
        
        if (weeksWithVisits.size >= 2) {
          patterns.push({
            memberId: member.id,
            message: `${member.user?.full_name} has been consistently visiting weekly - great pattern!`
          })
        }
      }
    })
    
    return patterns
  }

  const generateWeekSummary = (): string => {
    const weekVisits = visits.filter(v => {
      const visitDate = new Date(v.visit_date)
      const weekAgo = addHours(new Date(), -168) // 7 days ago
      return visitDate >= weekAgo
    })
    
    return `This week: ${weekVisits.length} visits completed, ${members.length} family members involved. ${circle.patient_first_name} had great company!`
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })))
  }

  const handleNotificationClick = (notification: SmartNotification) => {
    markAsRead(notification.id)
    if (onNotificationAction && notification.actionable) {
      onNotificationAction(notification)
    }
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50'
      case 'medium': return 'border-l-yellow-500 bg-yellow-50'
      case 'low': return 'border-l-blue-500 bg-blue-50'
      default: return 'border-l-gray-500 bg-gray-50'
    }
  }

  const formatNotificationTime = (timestamp: Date) => {
    if (isToday(timestamp)) {
      return format(timestamp, 'h:mm a')
    } else if (isTomorrow(timestamp)) {
      return 'Tomorrow'
    } else {
      return format(timestamp, 'MMM d')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4">
      <div className="bg-white rounded-xl shadow-2xl w-96 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-700" />
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    p-4 border-l-4 cursor-pointer transition-colors duration-200
                    ${getPriorityStyle(notification.priority)}
                    ${notification.isRead ? 'opacity-60' : 'hover:bg-gray-50'}
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {notification.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-sm font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {formatNotificationTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className={`text-sm ${notification.isRead ? 'text-gray-500' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      {notification.actionable && !notification.isRead && (
                        <div className="mt-2">
                          <span className="text-xs text-blue-600 font-medium">
                            {notification.actionText} →
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Notification Badge Component for Header
export const NotificationBadge: React.FC<{ 
  count: number
  onClick: () => void 
}> = ({ count, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
    >
      <Bell className="w-6 h-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}