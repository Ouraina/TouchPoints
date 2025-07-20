import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { 
  Calendar, 
  UserPlus, 
  BarChart3, 
  MessageCircle, 
  Clock,
  MapPin,
  Phone,
  Bell,
  Settings,
  Camera,
  Pill,
  Users,
  ChevronRight,
  Plus
} from 'lucide-react'

interface QuickAction {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  route: string
}

interface VisitEvent {
  id: string
  time: string
  title: string
  subtitle: string
  location: string
  type: 'checkup' | 'therapy' | 'medication' | 'visit'
}

interface FamilyMember {
  id: string
  name: string
  relationship: string
  avatar: string
  lastVisit: string
  status: 'online' | 'offline'
}

interface ActivityItem {
  id: string
  type: 'photo' | 'medication' | 'visit' | 'note'
  user: string
  action: string
  time: string
  icon: React.ComponentType<{ className?: string }>
}

export const PremiumDashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const quickActions: QuickAction[] = [
    { id: 'schedule', title: 'Schedule Visit', icon: Calendar, color: 'bg-blue-500', route: '/schedule' },
    { id: 'family', title: 'Add Family', icon: UserPlus, color: 'bg-green-500', route: '/invite' },
    { id: 'reports', title: 'View Reports', icon: BarChart3, color: 'bg-purple-500', route: '/reports' },
    { id: 'messages', title: 'Messages', icon: MessageCircle, color: 'bg-orange-500', route: '/messages' }
  ]

  const todaysVisits: VisitEvent[] = [
    {
      id: '1',
      time: '9:00 AM',
      title: "Mom's checkup",
      subtitle: 'Dr. Smith - Cardiology',
      location: 'Room 302',
      type: 'checkup'
    },
    {
      id: '2',
      time: '2:00 PM',
      title: "Dad's PT session",
      subtitle: 'Physical Therapy',
      location: 'Rehab Center',
      type: 'therapy'
    }
  ]

  const familyMembers: FamilyMember[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      relationship: 'Daughter',
      avatar: '👩‍⚕️',
      lastVisit: '2 days ago',
      status: 'online'
    },
    {
      id: '2',
      name: 'Mike Johnson',
      relationship: 'Son',
      avatar: '👨‍💼',
      lastVisit: '1 week ago',
      status: 'offline'
    },
    {
      id: '3',
      name: 'Lisa Wilson',
      relationship: 'Nurse',
      avatar: '👩‍⚕️',
      lastVisit: 'Yesterday',
      status: 'online'
    }
  ]

  const recentActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'photo',
      user: 'Sarah',
      action: 'uploaded 3 photos from visit',
      time: '2 hours ago',
      icon: Camera
    },
    {
      id: '2',
      type: 'medication',
      user: 'Nurse Lisa',
      action: 'added medication reminder',
      time: '4 hours ago',
      icon: Pill
    },
    {
      id: '3',
      type: 'visit',
      user: 'Mike',
      action: 'completed afternoon visit',
      time: '1 day ago',
      icon: Clock
    }
  ]

  const greeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-white">
      {/* Premium Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {greeting()}, {userName}! 👋
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                You have {todaysVisits.length} visits scheduled today
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-20">
        
        {/* Greeting Card */}
        <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back!</h2>
              <p className="text-gray-600">Everything looks good today</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => navigate(action.route)}
                  className="card card-hover p-4 text-center group"
                >
                  <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{action.title}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Visits</h3>
            <button 
              onClick={() => navigate('/calendar')}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              View all
            </button>
          </div>
          
          <div className="card space-y-4">
            {todaysVisits.length > 0 ? (
              todaysVisits.map((visit, index) => (
                <div key={visit.id} className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="text-sm font-semibold text-gray-900 min-w-[60px] text-center">
                      {visit.time}
                    </div>
                    {index < todaysVisits.length - 1 && (
                      <div className="w-px h-8 bg-gray-200 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="font-medium text-gray-900">{visit.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{visit.subtitle}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      {visit.location}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No visits scheduled today</p>
                <button 
                  onClick={() => navigate('/schedule')}
                  className="text-blue-600 text-sm font-medium mt-2 hover:text-blue-700"
                >
                  Schedule a visit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Family Members */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Family Members</h3>
            <button 
              onClick={() => navigate('/family')}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              See all
            </button>
          </div>
          
          <div className="flex space-x-3 overflow-x-auto pb-2">
            {familyMembers.map((member) => (
              <div key={member.id} className="card card-hover min-w-[140px] p-4 text-center">
                <div className="relative mb-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl mx-auto">
                    {member.avatar}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    member.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                </div>
                <p className="font-medium text-gray-900 text-sm">{member.name.split(' ')[0]}</p>
                <p className="text-xs text-gray-500 mt-1">{member.relationship}</p>
                <p className="text-xs text-gray-400 mt-1">Last visit: {member.lastVisit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
              View all
            </button>
          </div>
          
          <div className="card space-y-4">
            {recentActivity.map((activity) => {
              const Icon = activity.icon
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Premium Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom">
        <div className="max-w-md mx-auto">
          <div className="flex justify-around items-center h-16 px-4">
            <button className="flex flex-col items-center space-y-1 text-blue-600">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-sm" />
              </div>
              <span className="text-xs font-medium">Home</span>
            </button>
            
            <button 
              onClick={() => navigate('/calendar')}
              className="flex flex-col items-center space-y-1 text-gray-400 hover:text-gray-600"
            >
              <Calendar className="w-6 h-6" />
              <span className="text-xs">Calendar</span>
            </button>
            
            <button 
              onClick={() => navigate('/schedule')}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/25">
                <Plus className="w-6 h-6 text-white" />
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/family')}
              className="flex flex-col items-center space-y-1 text-gray-400 hover:text-gray-600"
            >
              <Users className="w-6 h-6" />
              <span className="text-xs">Family</span>
            </button>
            
            <button 
              onClick={() => navigate('/profile')}
              className="flex flex-col items-center space-y-1 text-gray-400 hover:text-gray-600"
            >
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
              </div>
              <span className="text-xs">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}