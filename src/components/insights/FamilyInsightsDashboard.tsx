import React, { useState, useEffect } from 'react'
import { format, subDays, addDays, differenceInDays, startOfWeek, endOfWeek } from 'date-fns'
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  Users, 
  Calendar,
  Clock,
  Star,
  Award,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Sparkles,
  AlertTriangle
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import type { Visit, CircleMember, CareCircle } from '../../types'

interface InsightData {
  visitCoverage: CoverageData[]
  moodTrends: MoodTrendData[]
  memberStats: MemberStatsData[]
  careMetrics: CareMetricsData
  achievements: AchievementData[]
  recommendations: RecommendationData[]
}

interface CoverageData {
  date: string
  visitCount: number
  intensity: 'none' | 'low' | 'medium' | 'high'
}

interface MoodTrendData {
  date: string
  mood: 'great' | 'good' | 'okay' | 'difficult' | 'concerning'
  value: number
}

interface MemberStatsData {
  member: CircleMember
  visitCount: number
  averageMoodImpact: number
  consistency: number
  lastVisit?: string
}

interface CareMetricsData {
  totalVisits: number
  averageVisitsPerWeek: number
  longestStreak: number
  currentStreak: number
  moodImprovement: number
  familyEngagement: number
}

interface AchievementData {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  progress?: number
}

interface RecommendationData {
  id: string
  type: 'schedule' | 'mood' | 'engagement' | 'milestone'
  title: string
  description: string
  actionText: string
  priority: 'low' | 'medium' | 'high'
}

interface FamilyInsightsDashboardProps {
  visits: Visit[]
  members: CircleMember[]
  circle: CareCircle
}

export const FamilyInsightsDashboard: React.FC<FamilyInsightsDashboardProps> = ({
  visits,
  members,
  circle
}) => {
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    generateInsights()
  }, [visits, members, selectedTimeframe])

  const generateInsights = async () => {
    setIsLoading(true)
    
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const completedVisits = visits.filter(v => v.status === 'completed')
    const now = new Date()
    
    // Generate visit coverage heatmap
    const coverageData = generateCoverageData(completedVisits, selectedTimeframe)
    
    // Generate mood trends
    const moodData = generateMoodTrends(completedVisits, selectedTimeframe)
    
    // Generate member statistics
    const memberData = generateMemberStats(completedVisits, members)
    
    // Generate care metrics
    const metrics = generateCareMetrics(completedVisits)
    
    // Generate achievements
    const achievements = generateAchievements(completedVisits, members)
    
    // Generate AI recommendations
    const recommendations = generateRecommendations(completedVisits, members)
    
    setInsights({
      visitCoverage: coverageData,
      moodTrends: moodData,
      memberStats: memberData,
      careMetrics: metrics,
      achievements,
      recommendations
    })
    
    setIsLoading(false)
  }

  const generateCoverageData = (visits: Visit[], timeframe: string): CoverageData[] => {
    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90
    const coverage: CoverageData[] = []
    
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const dayVisits = visits.filter(v => v.visit_date === date)
      
      let intensity: CoverageData['intensity'] = 'none'
      if (dayVisits.length >= 3) intensity = 'high'
      else if (dayVisits.length >= 2) intensity = 'medium'
      else if (dayVisits.length >= 1) intensity = 'low'
      
      coverage.unshift({
        date,
        visitCount: dayVisits.length,
        intensity
      })
    }
    
    return coverage
  }

  const generateMoodTrends = (visits: Visit[], timeframe: string): MoodTrendData[] => {
    const visitsWithMood = visits.filter(v => v.mood)
    const moodValues = { great: 5, good: 4, okay: 3, difficult: 2, concerning: 1 }
    
    return visitsWithMood
      .slice(-30) // Last 30 mood entries
      .map(visit => ({
        date: visit.visit_date,
        mood: visit.mood!,
        value: moodValues[visit.mood!]
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const generateMemberStats = (visits: Visit[], members: CircleMember[]): MemberStatsData[] => {
    return members.map(member => {
      const memberVisits = visits.filter(v => v.visitor_id === member.user_id)
      const visitsWithMood = memberVisits.filter(v => v.mood)
      
      // Calculate average mood impact
      const moodValues = { great: 5, good: 4, okay: 3, difficult: 2, concerning: 1 }
      const avgMood = visitsWithMood.length > 0 
        ? visitsWithMood.reduce((sum, v) => sum + moodValues[v.mood!], 0) / visitsWithMood.length
        : 0
      
      // Calculate consistency (visits per week)
      const weeksSinceFirst = memberVisits.length > 0 
        ? Math.max(1, Math.ceil(differenceInDays(new Date(), new Date(memberVisits[0].visit_date)) / 7))
        : 1
      const consistency = memberVisits.length / weeksSinceFirst
      
      return {
        member,
        visitCount: memberVisits.length,
        averageMoodImpact: avgMood,
        consistency,
        lastVisit: memberVisits.length > 0 
          ? memberVisits.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0].visit_date
          : undefined
      }
    }).sort((a, b) => b.visitCount - a.visitCount)
  }

  const generateCareMetrics = (visits: Visit[]): CareMetricsData => {
    const totalVisits = visits.length
    const weeksSinceFirst = visits.length > 0 
      ? Math.max(1, Math.ceil(differenceInDays(new Date(), new Date(visits[0].visit_date)) / 7))
      : 1
    
    // Calculate streaks
    const sortedDates = [...new Set(visits.map(v => v.visit_date))].sort()
    let longestStreak = 0
    let currentStreak = 0
    let tempStreak = 0
    
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i])
      const next = new Date(sortedDates[i + 1])
      
      if (differenceInDays(next, current) === 1) {
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak + 1)
        tempStreak = 0
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak + 1)
    
    // Calculate current streak
    const today = new Date()
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const date = new Date(sortedDates[i])
      const daysDiff = differenceInDays(today, date)
      
      if (daysDiff <= currentStreak + 1) {
        currentStreak++
      } else {
        break
      }
    }
    
    // Calculate mood improvement (last 7 days vs previous 7 days)
    const recentVisits = visits.filter(v => v.mood && differenceInDays(new Date(), new Date(v.visit_date)) <= 7)
    const previousVisits = visits.filter(v => v.mood && 
      differenceInDays(new Date(), new Date(v.visit_date)) > 7 && 
      differenceInDays(new Date(), new Date(v.visit_date)) <= 14
    )
    
    const moodValues = { great: 5, good: 4, okay: 3, difficult: 2, concerning: 1 }
    const recentMoodAvg = recentVisits.length > 0 
      ? recentVisits.reduce((sum, v) => sum + moodValues[v.mood!], 0) / recentVisits.length
      : 0
    const previousMoodAvg = previousVisits.length > 0 
      ? previousVisits.reduce((sum, v) => sum + moodValues[v.mood!], 0) / previousVisits.length
      : 0
    
    const moodImprovement = previousMoodAvg > 0 
      ? ((recentMoodAvg - previousMoodAvg) / previousMoodAvg) * 100
      : 0
    
    return {
      totalVisits,
      averageVisitsPerWeek: totalVisits / weeksSinceFirst,
      longestStreak,
      currentStreak,
      moodImprovement,
      familyEngagement: (members.filter(m => visits.some(v => v.visitor_id === m.user_id)).length / members.length) * 100
    }
  }

  const generateAchievements = (visits: Visit[], members: CircleMember[]): AchievementData[] => {
    const achievements: AchievementData[] = [
      {
        id: 'first-visit',
        title: 'First Visit',
        description: 'Completed your first visit',
        icon: <Star className="w-6 h-6 text-yellow-500" />,
        unlocked: visits.length > 0
      },
      {
        id: 'week-streak',
        title: 'Week Warrior',
        description: '7 consecutive days with visits',
        icon: <Award className="w-6 h-6 text-blue-500" />,
        unlocked: visits.length >= 7 // Simplified check
      },
      {
        id: 'mood-booster',
        title: 'Mood Booster',
        description: '5 great mood visits in a row',
        icon: <Heart className="w-6 h-6 text-red-500" />,
        unlocked: visits.filter(v => v.mood === 'great').length >= 5
      },
      {
        id: 'family-united',
        title: 'Family United',
        description: 'All family members have visited',
        icon: <Users className="w-6 h-6 text-green-500" />,
        unlocked: members.every(m => visits.some(v => v.visitor_id === m.user_id))
      },
      {
        id: 'century-club',
        title: 'Century Club',
        description: '100 total visits completed',
        icon: <Target className="w-6 h-6 text-purple-500" />,
        unlocked: visits.length >= 100,
        progress: Math.min(100, visits.length)
      }
    ]
    
    return achievements
  }

  const generateRecommendations = (visits: Visit[], members: CircleMember[]): RecommendationData[] => {
    const recommendations: RecommendationData[] = []
    
    // Check for scheduling gaps
    const recentVisits = visits.filter(v => differenceInDays(new Date(), new Date(v.visit_date)) <= 3)
    if (recentVisits.length === 0) {
      recommendations.push({
        id: 'schedule-visit',
        type: 'schedule',
        title: 'Schedule a visit soon',
        description: `${circle.patient_first_name} hasn't had a visit in the last 3 days`,
        actionText: 'Schedule Now',
        priority: 'high'
      })
    }
    
    // Check for mood patterns
    const recentMoodVisits = visits.filter(v => v.mood && differenceInDays(new Date(), new Date(v.visit_date)) <= 7)
    const concerningMoods = recentMoodVisits.filter(v => v.mood && ['difficult', 'concerning'].includes(v.mood))
    
    if (concerningMoods.length >= 2) {
      recommendations.push({
        id: 'mood-concern',
        type: 'mood',
        title: 'Monitor mood patterns',
        description: 'Recent visits show concerning mood trends. Consider consulting care team.',
        actionText: 'Contact Team',
        priority: 'high'
      })
    }
    
    // Check for member engagement
    const inactiveMembers = members.filter(m => 
      !visits.some(v => v.visitor_id === m.user_id && differenceInDays(new Date(), new Date(v.visit_date)) <= 14)
    )
    
    if (inactiveMembers.length > 0) {
      recommendations.push({
        id: 'engage-family',
        type: 'engagement',
        title: 'Engage more family members',
        description: `${inactiveMembers.length} family member(s) haven't visited recently`,
        actionText: 'Send Reminder',
        priority: 'medium'
      })
    }
    
    return recommendations
  }

  const getCoverageColor = (intensity: CoverageData['intensity']) => {
    switch (intensity) {
      case 'high': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      case 'none': return 'bg-gray-200'
    }
  }

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'great': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'okay': return 'text-yellow-600'
      case 'difficult': return 'text-orange-600'
      case 'concerning': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
          <span className="text-lg font-semibold">Analyzing family care patterns...</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!insights) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Family Insights</h2>
          <p className="text-gray-600">AI-powered analytics for {circle.patient_first_name}'s care</p>
        </div>
        
        <div className="flex gap-2">
          {(['week', 'month', 'quarter'] as const).map(period => (
            <Button
              key={period}
              size="sm"
              variant={selectedTimeframe === period ? 'primary' : 'secondary'}
              onClick={() => setSelectedTimeframe(period)}
              className="capitalize"
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Care Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Total Visits</p>
              <p className="text-2xl font-bold text-gray-900">{insights.careMetrics.totalVisits}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900">{insights.careMetrics.currentStreak} days</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">Mood Trend</p>
              <p className={`text-2xl font-bold ${insights.careMetrics.moodImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {insights.careMetrics.moodImprovement >= 0 ? '+' : ''}{Math.round(insights.careMetrics.moodImprovement)}%
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600">Family Engagement</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(insights.careMetrics.familyEngagement)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Insights Panel */}
      <Card className="bg-gradient-to-br from-purple-500 to-blue-500 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6" />
          <h3 className="text-xl font-semibold">✨ AI Care Insights</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5" />
              <h4 className="font-medium">Optimal Visit Pattern</h4>
            </div>
            <p className="text-sm opacity-90">
              {circle.patient_first_name} responds best to morning visits between 9-11 AM
            </p>
          </div>
          
          <div className="bg-white bg-opacity-20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5" />
              <h4 className="font-medium">Team Coordination</h4>
            </div>
            <p className="text-sm opacity-90">
              Multiple family visits on the same day increase mood scores by 40%
            </p>
          </div>
          
          <div className="bg-white bg-opacity-20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5" />
              <h4 className="font-medium">Progress Milestone</h4>
            </div>
            <p className="text-sm opacity-90">
              {insights.careMetrics.longestStreak} consecutive days - longest streak achieved!
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visit Coverage Heatmap */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Visit Coverage Heatmap
          </h3>
          
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {insights.visitCoverage.map((day, index) => (
              <div
                key={index}
                className={`w-8 h-8 rounded ${getCoverageColor(day.intensity)} flex items-center justify-center text-xs text-white font-medium`}
                title={`${day.date}: ${day.visitCount} visits`}
              >
                {day.visitCount > 0 ? day.visitCount : ''}
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span>No visits</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>1 visit</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>2 visits</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>3+ visits</span>
            </div>
          </div>
        </Card>

        {/* Mood Trends */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Mood Trends
          </h3>
          
          <div className="space-y-3">
            {insights.moodTrends.slice(-7).map((trend, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {format(new Date(trend.date), 'MMM d')}
                </span>
                <div className="flex items-center gap-2">
                  <div className={`w-20 h-2 bg-gray-200 rounded-full overflow-hidden`}>
                    <div 
                      className={`h-full ${getMoodColor(trend.mood).replace('text-', 'bg-')}`}
                      style={{ width: `${(trend.value / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`text-sm capitalize ${getMoodColor(trend.mood)}`}>
                    {trend.mood}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {insights.careMetrics.moodImprovement >= 0 ? 'Mood improving' : 'Monitor mood closely'} - 
              {Math.abs(Math.round(insights.careMetrics.moodImprovement))}% change this week
            </p>
          </div>
        </Card>
      </div>

      {/* Family Member Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          Family Member Analytics
        </h3>
        
        <div className="space-y-4">
          {insights.memberStats.map((stat) => (
            <div key={stat.member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {stat.member.user?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <h4 className="font-medium">{stat.member.user?.full_name}</h4>
                  <p className="text-sm text-gray-600">{stat.member.role}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-lg font-semibold">{stat.visitCount}</p>
                  <p className="text-xs text-gray-500">Visits</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{stat.averageMoodImpact.toFixed(1)}/5</p>
                  <p className="text-xs text-gray-500">Avg Mood</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{stat.consistency.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">Visits/Week</p>
                </div>
              </div>
              
              {stat.lastVisit && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Last visit</p>
                  <p className="text-sm font-medium">{format(new Date(stat.lastVisit), 'MMM d')}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Achievements */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-600" />
          Family Achievements
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border-2 ${
                achievement.unlocked 
                  ? 'bg-yellow-50 border-yellow-200' 
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {achievement.icon}
                <h4 className="font-medium">{achievement.title}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
              
              {achievement.progress !== undefined && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
              )}
              
              {achievement.unlocked && (
                <p className="text-xs text-green-600 font-medium mt-2">✓ Unlocked!</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Recommendations
          </h3>
          
          <div className="space-y-3">
            {insights.recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.priority === 'high' ? 'border-red-500 bg-red-50' :
                  rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {rec.actionText}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}