import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { 
  Heart, 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Phone,
  MessageSquare,
  Camera
} from 'lucide-react'

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  component: React.ReactNode
}

interface CareCircleData {
  patientFirstName: string
  patientLastName: string
  facilityName: string
  roomNumber: string
  visitingHoursStart: string
  visitingHoursEnd: string
  specialNotes: string
}

interface FamilyMember {
  email: string
  name: string
  relationship: string
}

export const QuickStartWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [circleData, setCircleData] = useState<CareCircleData>({
    patientFirstName: '',
    patientLastName: '',
    facilityName: '',
    roomNumber: '',
    visitingHoursStart: '09:00',
    visitingHoursEnd: '17:00',
    specialNotes: ''
  })
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const [circleId, setCircleId] = useState('')
  
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleCompleteSetup = async () => {
    setLoading(true)
    setError('')

    try {
      // Create care circle
      const { data: circle, error: circleError } = await supabase
        .from('care_circles')
        .insert([{
          patient_first_name: circleData.patientFirstName,
          patient_last_name: circleData.patientLastName,
          facility_name: circleData.facilityName,
          room_number: circleData.roomNumber,
          visiting_hours_start: circleData.visitingHoursStart,
          visiting_hours_end: circleData.visitingHoursEnd,
          special_notes: circleData.specialNotes,
          created_by: user?.id
        }])
        .select()
        .single()

      if (circleError) throw circleError

      setCircleId(circle.id)

      // Add current user as coordinator
      await supabase
        .from('circle_members')
        .insert([{
          circle_id: circle.id,
          user_id: user?.id,
          role: 'coordinator'
        }])

      // Send invitations to family members
      if (familyMembers.length > 0) {
        // In production, you'd send actual emails here
        console.log('Would send invitations to:', familyMembers)
      }

      // Navigate to dashboard
      navigate('/dashboard?setup=complete')
      
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup')
    } finally {
      setLoading(false)
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to TouchPoints',
      description: 'Let\'s get your family care coordination set up in just a few minutes',
      icon: <Heart className="w-8 h-8 text-red-500" />,
      component: (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-10 h-10 text-white" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TouchPoints</h2>
            <p className="text-gray-600">We're going to help you coordinate family care visits in just a few minutes.</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              What we'll set up:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Patient information and care facility</li>
              <li>• Visiting hours and special notes</li>
              <li>• Family member invitations</li>
              <li>• Your first visit schedule</li>
            </ul>
          </div>

          <Button 
            onClick={() => setCurrentStep(1)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            Let's Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )
    },
    {
      id: 'patient-info',
      title: 'Patient Information',
      description: 'Tell us about the person you\'re coordinating care for',
      icon: <Heart className="w-8 h-8 text-red-500" />,
      component: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <Input
                value={circleData.patientFirstName}
                onChange={(e) => setCircleData({...circleData, patientFirstName: e.target.value})}
                placeholder="e.g., Mom, Dad, Grandma"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <Input
                value={circleData.patientLastName}
                onChange={(e) => setCircleData({...circleData, patientLastName: e.target.value})}
                placeholder="Last name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Care Facility Name
            </label>
            <Input
              value={circleData.facilityName}
              onChange={(e) => setCircleData({...circleData, facilityName: e.target.value})}
              placeholder="e.g., Riverside Care Center, Memorial Hospital"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Number
              </label>
              <Input
                value={circleData.roomNumber}
                onChange={(e) => setCircleData({...circleData, roomNumber: e.target.value})}
                placeholder="e.g., 205, ICU-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Notes
              </label>
              <Input
                value={circleData.specialNotes}
                onChange={(e) => setCircleData({...circleData, specialNotes: e.target.value})}
                placeholder="e.g., Enter through main entrance, call ahead"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visiting Hours Start
              </label>
              <Input
                type="time"
                value={circleData.visitingHoursStart}
                onChange={(e) => setCircleData({...circleData, visitingHoursStart: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visiting Hours End
              </label>
              <Input
                type="time"
                value={circleData.visitingHoursEnd}
                onChange={(e) => setCircleData({...circleData, visitingHoursEnd: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={() => setCurrentStep(0)}
              variant="secondary"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={() => setCurrentStep(2)}
              disabled={!circleData.patientFirstName || !circleData.patientLastName}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'family-invites',
      title: 'Invite Family Members',
      description: 'Add family members who will be coordinating visits',
      icon: <Users className="w-8 h-8 text-blue-500" />,
      component: (
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Setup Options</h3>
            <p className="text-sm text-blue-800 mb-4">
              You can invite family members now, or add them later. They'll receive an email with a secure link to join.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => setCurrentStep(3)}
                variant="secondary"
                className="w-full justify-start"
              >
                <Users className="w-4 h-4 mr-2" />
                Add family members now
              </Button>
              
              <Button
                onClick={() => setCurrentStep(4)}
                variant="secondary"
                className="w-full justify-start"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Skip for now, invite later
              </Button>
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={() => setCurrentStep(1)}
              variant="secondary"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'add-family',
      title: 'Add Family Members',
      description: 'Enter email addresses of family members to invite',
      icon: <Users className="w-8 h-8 text-blue-500" />,
      component: (
        <div className="space-y-6">
          <div className="space-y-4">
            {familyMembers.map((member, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={member.name}
                  onChange={(e) => {
                    const newMembers = [...familyMembers]
                    newMembers[index].name = e.target.value
                    setFamilyMembers(newMembers)
                  }}
                  placeholder="Name"
                  className="flex-1"
                />
                <Input
                  value={member.email}
                  onChange={(e) => {
                    const newMembers = [...familyMembers]
                    newMembers[index].email = e.target.value
                    setFamilyMembers(newMembers)
                  }}
                  placeholder="Email"
                  type="email"
                  className="flex-1"
                />
                <Button
                  onClick={() => setFamilyMembers(familyMembers.filter((_, i) => i !== index))}
                  variant="secondary"
                  size="sm"
                >
                  Remove
                </Button>
              </div>
            ))}
            
            <Button
              onClick={() => setFamilyMembers([...familyMembers, { name: '', email: '', relationship: '' }])}
              variant="secondary"
              className="w-full"
            >
              + Add Another Family Member
            </Button>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={() => setCurrentStep(2)}
              variant="secondary"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={() => setCurrentStep(4)}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'first-visit',
      title: 'Schedule Your First Visit',
      description: 'Let\'s schedule your first visit to get started',
      icon: <Calendar className="w-8 h-8 text-green-500" />,
      component: (
        <div className="space-y-6">
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Ready to Schedule</h3>
            <p className="text-sm text-green-800">
              Let's schedule your first visit to {circleData.patientFirstName}. You can always adjust this later.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visit Date
              </label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visit Time
              </label>
              <Input
                type="time"
                defaultValue="14:00"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={() => setCurrentStep(2)}
              variant="secondary"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={handleCompleteSetup}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Setting up...
                </div>
              ) : (
                <>
                  Complete Setup
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )
    }
  ]

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Setup Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => setError('')} className="w-full">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  const currentStepData = steps[currentStep]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            {currentStepData.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentStepData.title}</h1>
            <p className="text-gray-600">{currentStepData.description}</p>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {currentStepData.component}
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index <= currentStep 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                  : 'bg-gray-300'
              }`}
            ></div>
          ))}
        </div>
      </Card>
    </div>
  )
}