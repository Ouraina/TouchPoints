import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Calendar, Users, Settings, Bell } from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Home',
    icon: Home,
    path: '/dashboard'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    path: '/calendar'
  },
  {
    id: 'circles',
    label: 'Circles',
    icon: Users,
    path: '/circles'
  },
  {
    id: 'notifications',
    label: 'Alerts',
    icon: Bell,
    path: '/notifications'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings'
  }
]

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || 
                          (item.path === '/dashboard' && location.pathname === '/')
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-gray-500 hover:text-primary'
              }`}
              style={{
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)'
              }}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Add padding to main content to account for fixed bottom nav
export const BottomNavPadding: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="pb-16">
      {children}
    </div>
  )
}