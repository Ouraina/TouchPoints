import React, { useState } from 'react'
import { 
  Phone, 
  AlertTriangle, 
  Heart, 
  Users, 
  MapPin, 
  Clock,
  Shield,
  Zap,
  MessageSquare,
  X,
  Check,
  Copy
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { CareCircle, CircleMember } from '../../types'

interface EmergencyContact {
  id: string
  name: string
  role: string
  phone: string
  availability: string
  priority: 'primary' | 'secondary' | 'backup'
  notes?: string
}

interface EmergencySystemProps {
  circle: CareCircle
  members: CircleMember[]
  isVisible?: boolean
}

export const EmergencySystem: React.FC<EmergencySystemProps> = ({
  circle,
  members,
  isVisible = true
}) => {
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false)
  const [alertSent, setAlertSent] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<'medical' | 'safety' | 'urgent' | null>(null)

  const emergencyContacts: EmergencyContact[] = [
    {
      id: 'doctor',
      name: 'Dr. Sarah Mitchell',
      role: 'Primary Physician',
      phone: '(555) 123-4567',
      availability: '24/7 Emergency Line',
      priority: 'primary',
      notes: 'Call first for medical emergencies'
    },
    {
      id: 'hospital',
      name: 'Riverside General Hospital',
      role: 'Emergency Department',
      phone: '(555) 911-0000',
      availability: '24/7',
      priority: 'primary',
      notes: 'Ask for 3rd floor nurses station'
    },
    {
      id: 'facility',
      name: circle.facility_name || 'Care Facility',
      role: 'Facility Staff',
      phone: '(555) 234-5678',
      availability: '24/7',
      priority: 'primary',
      notes: `Room ${circle.room_number || 'N/A'}`
    },
    {
      id: 'coordinator',
      name: 'Family Coordinator',
      role: 'Care Coordinator',
      phone: '(555) 345-6789',
      availability: 'Mon-Fri 8AM-6PM',
      priority: 'secondary'
    },
    {
      id: 'transport',
      name: 'Medical Transport',
      role: 'Emergency Transport',
      phone: '(555) 456-7890',
      availability: '24/7',
      priority: 'backup'
    }
  ]

  const alertTypes = [
    {
      id: 'medical' as const,
      title: 'Medical Emergency',
      description: 'Immediate medical attention needed',
      icon: <Heart className="w-6 h-6 text-red-500" />,
      color: 'bg-red-500',
      priority: 'CRITICAL'
    },
    {
      id: 'safety' as const,
      title: 'Safety Concern',
      description: 'Safety issue requiring attention',
      icon: <Shield className="w-6 h-6 text-orange-500" />,
      color: 'bg-orange-500',
      priority: 'HIGH'
    },
    {
      id: 'urgent' as const,
      title: 'Urgent Update',
      description: 'Important family notification',
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      color: 'bg-yellow-500',
      priority: 'URGENT'
    }
  ]

  const sendEmergencyAlert = async (alertType: typeof selectedAlert) => {
    if (!alertType) return

    setAlertSent(true)
    
    // Simulate sending alerts to all family members
    const alertMessage = generateAlertMessage(alertType)
    
    try {
      // In real app, would send to:
      // - SMS to all family members
      // - Push notifications
      // - Email alerts
      // - Call emergency contacts if critical
      
      console.log('Emergency alert sent:', {
        type: alertType,
        message: alertMessage,
        recipients: members.map(m => m.user?.full_name),
        timestamp: new Date().toISOString()
      })
      
      // Show confirmation for 3 seconds
      setTimeout(() => {
        setAlertSent(false)
        setSelectedAlert(null)
        setShowEmergencyPanel(false)
      }, 3000)
      
    } catch (error) {
      console.error('Failed to send emergency alert:', error)
      setAlertSent(false)
    }
  }

  const generateAlertMessage = (alertType: typeof selectedAlert): string => {
    const baseInfo = `Emergency Alert for ${circle.patient_first_name} ${circle.patient_last_name}\nLocation: ${circle.facility_name || 'Care Facility'}\nRoom: ${circle.room_number || 'Unknown'}\nTime: ${new Date().toLocaleString()}`
    
    switch (alertType) {
      case 'medical':
        return `🚨 MEDICAL EMERGENCY 🚨\n${baseInfo}\n\nImmediate medical attention required. Family members please respond ASAP.`
      case 'safety':
        return `⚠️ SAFETY ALERT ⚠️\n${baseInfo}\n\nSafety concern reported. Please coordinate family response.`
      case 'urgent':
        return `📢 URGENT FAMILY ALERT 📢\n${baseInfo}\n\nImportant update requires family attention.`
      default:
        return baseInfo
    }
  }

  const callEmergencyContact = (contact: EmergencyContact) => {
    // In mobile app, this would trigger phone dialer
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = `tel:${contact.phone}`
    }
  }

  const copyContactInfo = (contact: EmergencyContact) => {
    const info = `${contact.name}\n${contact.role}\n${contact.phone}\n${contact.availability}`
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(info)
    }
  }

  const getPriorityStyle = (priority: EmergencyContact['priority']) => {
    switch (priority) {
      case 'primary': return 'border-red-300 bg-red-50'
      case 'secondary': return 'border-yellow-300 bg-yellow-50'
      case 'backup': return 'border-blue-300 bg-blue-50'
    }
  }

  const getPriorityBadge = (priority: EmergencyContact['priority']) => {
    switch (priority) {
      case 'primary': return 'bg-red-100 text-red-800'
      case 'secondary': return 'bg-yellow-100 text-yellow-800'
      case 'backup': return 'bg-blue-100 text-blue-800'
    }
  }

  if (!isVisible) return null

  return (
    <>
      {/* Floating Emergency Button */}
      <button
        onClick={() => setShowEmergencyPanel(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center z-40 transition-all duration-200 hover:scale-110 pulse-animation"
        title="Emergency Contacts & Alerts"
      >
        <Phone className="w-8 h-8" />
      </button>

      {/* Emergency Panel Modal */}
      {showEmergencyPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-red-200 bg-red-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-red-900">Emergency Center</h2>
                    <p className="text-red-700">Quick access to emergency contacts and alerts</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmergencyPanel(false)}
                  className="p-2 hover:bg-red-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-red-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient Info */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      {circle.patient_first_name} {circle.patient_last_name}
                    </h3>
                    <p className="text-blue-700">
                      {circle.facility_name} • Room {circle.room_number}
                    </p>
                    <p className="text-sm text-blue-600">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Current time: {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Quick Emergency Actions
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {alertTypes.map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert.id)}
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-200 text-left
                        ${selectedAlert === alert.id 
                          ? 'border-current bg-opacity-20' 
                          : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                        }
                      `}
                      style={{
                        borderColor: selectedAlert === alert.id ? alert.color.replace('bg-', '') : undefined,
                        backgroundColor: selectedAlert === alert.id ? alert.color.replace('bg-', '') + '20' : undefined
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {alert.icon}
                        <span className="font-medium">{alert.title}</span>
                      </div>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          alert.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          alert.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alert.priority}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedAlert && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      This will immediately notify all {members.length} family members via SMS, push notification, and email.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => sendEmergencyAlert(selectedAlert)}
                        disabled={alertSent}
                        className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                      >
                        {alertSent ? (
                          <>
                            <Check className="w-4 h-4" />
                            Alert Sent!
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4" />
                            Send Alert to Family
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedAlert(null)}
                        disabled={alertSent}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Emergency Contacts */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-500" />
                  Emergency Contacts
                </h3>
                
                <div className="space-y-3">
                  {emergencyContacts.map((contact) => (
                    <Card key={contact.id} className={`p-4 border-2 ${getPriorityStyle(contact.priority)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(contact.priority)}`}>
                              {contact.priority}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-1">{contact.role}</p>
                          <p className="text-sm font-mono text-gray-800">{contact.phone}</p>
                          <p className="text-xs text-gray-500">{contact.availability}</p>
                          
                          {contact.notes && (
                            <p className="text-xs text-blue-600 mt-1">ℹ️ {contact.notes}</p>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => callEmergencyContact(contact)}
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                            size="sm"
                          >
                            <Phone className="w-4 h-4" />
                            Call
                          </Button>
                          
                          <Button
                            onClick={() => copyContactInfo(contact)}
                            variant="secondary"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Family Members */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Family Circle ({members.length} members)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <p className="font-medium text-blue-900">{member.user?.full_name}</p>
                        <p className="text-sm text-blue-700">{member.role}</p>
                        <p className="text-sm text-blue-600">{member.user?.email}</p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600">Active</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Emergency Instructions
                </h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• For life-threatening emergencies, call 911 immediately</li>
                  <li>• Contact the primary physician first for medical concerns</li>
                  <li>• Use family alerts to coordinate care responses</li>
                  <li>• Keep this information accessible at all times</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
          }
        }
      `}</style>
    </>
  )
}