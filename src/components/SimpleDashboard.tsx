import React from 'react'
import { Home, Calendar, Users, Bell, Plus, MapPin, Clock } from 'lucide-react'

export const SimpleDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header - NO LOGO */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Good morning</p>
            <h1 className="text-xl font-semibold text-gray-900">Welcome, Test! 👋</h1>
          </div>
          <div className="flex gap-3">
            <button className="p-2">
              <Bell className="w-6 h-6 text-gray-400" />
            </button>
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              T
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-3xl font-bold text-blue-600">3</p>
          <p className="text-sm text-gray-500">Visits Today</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-3xl font-bold text-green-600">2</p>
          <p className="text-sm text-gray-500">Care Circles</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <Calendar className="w-8 h-8 text-blue-600 mb-2" />
            <p className="text-sm font-medium text-gray-900">Schedule Visit</p>
          </button>
          <button className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <Users className="w-8 h-8 text-green-600 mb-2" />
            <p className="text-sm font-medium text-gray-900">Add Family</p>
          </button>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Today's Schedule</h2>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Mom's Checkup</p>
                <p className="text-sm text-gray-500">Dr. Smith - Cardiology</p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <MapPin className="w-3 h-3 mr-1" />
                  Room 302
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center text-sm font-medium text-gray-900">
                  <Clock className="w-4 h-4 mr-1" />
                  9:00 AM
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Dad's PT Session</p>
                <p className="text-sm text-gray-500">Physical Therapy</p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <MapPin className="w-3 h-3 mr-1" />
                  Rehab Center
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center text-sm font-medium text-gray-900">
                  <Clock className="w-4 h-4 mr-1" />
                  2:00 PM
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Family Members */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Family Members</h2>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">S</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Sarah Johnson</p>
              <p className="text-sm text-gray-500">Daughter • Last visit: 2 days ago</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-semibold">M</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Mike Johnson</p>
              <p className="text-sm text-gray-500">Son • Last visit: 1 week ago</p>
            </div>
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 py-2">
          <button className="flex flex-col items-center py-2">
            <Home className="w-6 h-6 text-blue-600" />
            <span className="text-xs text-blue-600 mt-1 font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <Calendar className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Calendar</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-1">
              <Plus className="w-6 h-6 text-white" />
            </div>
          </button>
          <button className="flex flex-col items-center py-2">
            <Users className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Family</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
            <span className="text-xs text-gray-400 mt-1">Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}