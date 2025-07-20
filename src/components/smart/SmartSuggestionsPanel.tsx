import React, { useState, useEffect } from 'react'
import { format, addDays, differenceInDays } from 'date-fns'
import { 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Heart, 
  Users, 
  CheckCircle,
  X,
  AlertTriangle,
  Brain,
  Target,
  Star
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { Visit, CircleMember, CareCircle } from '../../types'

interface SmartSuggestion {
  id: string
  type: 'pattern' | 'gap' | 'mood' | 'optimal' | 'milestone'
  title: string
  description: string
  actionText: string
  confidence: 'low' | 'medium' | 'high'
  priority: 'low' | 'medium' | 'high'
  data?: any
  icon?: React.ReactNode
}

interface SmartSuggestionsPanelProps {
  visits: Visit[]
  members: CircleMember[]
  circle: CareCircle
  onScheduleVisit?: (date: string, time: string, visitorId?: string) => void
}

export const SmartSuggestionsPanel: React.FC<SmartSuggestionsPanelProps> = ({
  visits,
  members,
  circle,
  onScheduleVisit
}) => {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(true)

  useEffect(() => {
    analyzePatternsAndGenerateSuggestions()
  }, [visits, members])

  const analyzePatternsAndGenerateSuggestions = async () => {
    setIsAnalyzing(true)
    const newSuggestions: SmartSuggestion[] = []

    // 1. Pattern Recognition - Recurring Visits
    const patternSuggestions = findRecurringPatterns()
    newSuggestions.push(...patternSuggestions)

    // 2. Care Gap Detection
    const gapSuggestions = findCareGaps()
    newSuggestions.push(...gapSuggestions)

    // 3. Mood Pattern Analysis
    const moodSuggestions = analyzeMoodPatterns()
    newSuggestions.push(...moodSuggestions)

    // 4. Optimal Time Suggestions
    const timeSuggestions = findOptimalTimes()
    newSuggestions.push(...timeSuggestions)

    // 5. Milestone Recognition
    const milestoneSuggestions = detectMilestones()
    newSuggestions.push(...milestoneSuggestions)

    // Sort by priority and confidence
    newSuggestions.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 }
      const confidenceWeight = { high: 3, medium: 2, low: 1 }
      
      const aScore = priorityWeight[a.priority] + confidenceWeight[a.confidence]
      const bScore = priorityWeight[b.priority] + confidenceWeight[b.confidence]
      
      return bScore - aScore
    })

    setSuggestions(newSuggestions.slice(0, 5)) // Show top 5 suggestions
    setIsAnalyzing(false)
  }

  const findRecurringPatterns = (): SmartSuggestion[] => {
    const patterns: SmartSuggestion[] = []
    
    // Analyze weekly patterns for each member
    members.forEach(member => {
      const memberVisits = visits.filter(v => v.visitor_id === member.user_id)
      
      if (memberVisits.length >= 3) {
        // Check for day of week patterns
        const dayPatterns = memberVisits.reduce((acc, visit) => {
          const day = new Date(visit.visit_date).getDay()
          acc[day] = (acc[day] || 0) + 1
          return acc
        }, {} as Record<number, number>)
        
        const mostCommonDay = Object.entries(dayPatterns)
          .sort(([,a], [,b]) => b - a)[0]
        
        if (mostCommonDay && parseInt(mostCommonDay[1]) >= 2) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          const dayName = dayNames[parseInt(mostCommonDay[0])]
          
          // Suggest next occurrence
          const nextDate = getNextDayOfWeek(parseInt(mostCommonDay[0]))
          
          patterns.push({
            id: `pattern-${member.id}-${mostCommonDay[0]}`,
            type: 'pattern',
            title: `${member.user?.full_name} visits ${dayName}s`,
            description: `Pattern detected: ${member.user?.full_name} typically visits on ${dayName}s. Schedule next visit?`,
            actionText: `Schedule for ${format(nextDate, 'MMM d')}`,
            confidence: parseInt(mostCommonDay[1]) >= 3 ? 'high' : 'medium',
            priority: 'medium',
            icon: <Calendar className="w-5 h-5 text-blue-500" />,
            data: { date: format(nextDate, 'yyyy-MM-dd'), visitorId: member.user_id }
          })
        }
      }
    })
    
    return patterns
  }

  const findCareGaps = (): SmartSuggestion[] => {
    const gaps: SmartSuggestion[] = []
    const today = new Date()
    
    // Check for upcoming days with no visits
    for (let i = 1; i <= 7; i++) {
      const checkDate = addDays(today, i)
      const dateStr = format(checkDate, 'yyyy-MM-dd')
      const dayVisits = visits.filter(v => v.visit_date === dateStr)
      
      if (dayVisits.length === 0) {
        const dayName = format(checkDate, 'EEEE')
        
        gaps.push({
          id: `gap-${dateStr}`,
          type: 'gap',
          title: `${dayName} has no visits scheduled`,
          description: `${circle.patient_first_name} will be alone on ${dayName}. Consider scheduling a visit.`,
          actionText: 'Schedule Visit',
          confidence: 'high',
          priority: i <= 3 ? 'high' : 'medium', // Next 3 days are high priority
          icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
          data: { date: dateStr }
        })
      }
    }
    
    return gaps.slice(0, 2) // Only show next 2 gaps
  }

  const analyzeMoodPatterns = (): SmartSuggestion[] => {
    const moodSuggestions: SmartSuggestion[] = []
    
    // Find visits with good mood outcomes
    const goodMoodVisits = visits.filter(v => v.mood && ['great', 'good'].includes(v.mood))
    
    if (goodMoodVisits.length > 0) {
      // Find which visitors contribute to better moods
      const visitorMoodImpact = members.map(member => {
        const memberVisits = visits.filter(v => v.visitor_id === member.user_id && v.mood)
        const goodMoods = memberVisits.filter(v => ['great', 'good'].includes(v.mood!))
        
        return {
          member,
          impactScore: memberVisits.length > 0 ? goodMoods.length / memberVisits.length : 0,
          visitCount: memberVisits.length
        }
      }).filter(item => item.visitCount >= 2)
        .sort((a, b) => b.impactScore - a.impactScore)
      
      if (visitorMoodImpact.length > 0 && visitorMoodImpact[0].impactScore > 0.6) {
        const topVisitor = visitorMoodImpact[0]
        
        moodSuggestions.push({
          id: `mood-${topVisitor.member.id}`,
          type: 'mood',
          title: `${topVisitor.member.user?.full_name} boosts mood`,
          description: `${topVisitor.member.user?.full_name}'s visits result in ${Math.round(topVisitor.impactScore * 100)}% positive moods. Schedule more visits?`,
          actionText: 'Schedule Visit',
          confidence: 'high',
          priority: 'medium',
          icon: <Heart className="w-5 h-5 text-red-500" />,
          data: { visitorId: topVisitor.member.user_id }
        })
      }
    }
    
    return moodSuggestions
  }

  const findOptimalTimes = (): SmartSuggestion[] => {
    const timeSuggestions: SmartSuggestion[] = []
    
    // Analyze time patterns for good mood visits
    const goodMoodVisits = visits.filter(v => v.mood && ['great', 'good'].includes(v.mood))
    
    if (goodMoodVisits.length >= 3) {
      const timePatterns = goodMoodVisits.reduce((acc, visit) => {
        const hour = parseInt(visit.start_time.split(':')[0])
        const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
        acc[timeSlot] = (acc[timeSlot] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const bestTime = Object.entries(timePatterns)
        .sort(([,a], [,b]) => b - a)[0]
      
      if (bestTime && bestTime[1] >= 2) {
        timeSuggestions.push({
          id: 'optimal-time',
          type: 'optimal',
          title: `${circle.patient_first_name} responds best to ${bestTime[0]} visits`,
          description: `Analysis shows ${bestTime[1]} out of ${goodMoodVisits.length} positive visits happened in the ${bestTime[0]}.`,
          actionText: 'Schedule Morning Visit',
          confidence: bestTime[1] >= 3 ? 'high' : 'medium',
          priority: 'low',
          icon: <Target className="w-5 h-5 text-green-500" />
        })
      }
    }
    
    return timeSuggestions
  }

  const detectMilestones = (): SmartSuggestion[] => {
    const milestones: SmartSuggestion[] = []
    
    // Consecutive days with visits
    let consecutiveDays = 0
    let currentStreak = 0
    const sortedVisits = visits
      .map(v => v.visit_date)
      .sort()
      .filter((date, index, arr) => arr.indexOf(date) === index) // Remove duplicates
    
    for (let i = 0; i < sortedVisits.length - 1; i++) {
      const current = new Date(sortedVisits[i])
      const next = new Date(sortedVisits[i + 1])
      
      if (differenceInDays(next, current) === 1) {
        currentStreak++
      } else {
        consecutiveDays = Math.max(consecutiveDays, currentStreak)
        currentStreak = 0
      }
    }
    consecutiveDays = Math.max(consecutiveDays, currentStreak)
    
    if (consecutiveDays >= 7) {
      milestones.push({
        id: 'streak-milestone',
        type: 'milestone',
        title: `${consecutiveDays} consecutive days with visits!`,
        description: `Incredible! ${circle.patient_first_name} has had visitors for ${consecutiveDays} days straight. Keep the streak going!`,
        actionText: 'Continue Streak',
        confidence: 'high',
        priority: 'low',
        icon: <Star className="w-5 h-5 text-yellow-500" />
      })
    }
    
    return milestones
  }

  const getNextDayOfWeek = (targetDay: number): Date => {
    const today = new Date()
    const currentDay = today.getDay()
    const daysUntil = (targetDay - currentDay + 7) % 7 || 7
    return addDays(today, daysUntil)
  }

  const handleSuggestionAction = (suggestion: SmartSuggestion) => {
    if (suggestion.data?.date && onScheduleVisit) {
      const time = suggestion.type === 'optimal' ? '09:00' : '14:00'
      onScheduleVisit(suggestion.data.date, time, suggestion.data.visitorId)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'medium': return <Brain className="w-4 h-4 text-blue-600" />
      case 'low': return <Clock className="w-4 h-4 text-gray-600" />
      default: return null
    }
  }

  if (isAnalyzing) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent"></div>
          <span className="text-gray-600">Analyzing patterns...</span>
        </div>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No suggestions yet. Keep adding visits to help TouchPoints learn your family's patterns!</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">✨ Smart Suggestions</h3>
            <p className="text-sm text-purple-700">AI-powered insights for better care coordination</p>
          </div>
        </div>

        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`bg-white p-4 rounded-lg border-2 ${getPriorityColor(suggestion.priority)} transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {suggestion.icon}
                    <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                    <div className="flex items-center gap-1">
                      {getConfidenceIcon(suggestion.confidence)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => handleSuggestionAction(suggestion)}
                  className="bg-purple-600 hover:bg-purple-700 text-white ml-4"
                >
                  {suggestion.actionText}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}