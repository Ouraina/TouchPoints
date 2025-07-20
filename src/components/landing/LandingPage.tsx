import React, { useState, useEffect } from 'react'
import { useAnalytics } from '../../lib/analytics'
import { 
  ArrowRight, 
  Check, 
  Star, 
  Heart, 
  Users, 
  Calendar,
  MessageSquare,
  Phone,
  Zap,
  Shield,
  Sparkles,
  Play,
  ChevronRight,
  Clock,
  AlertTriangle,
  Camera,
  Mic
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'

interface LandingPageProps {
  onGetStarted?: () => void
  onSignUp?: (email: string) => void
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onSignUp
}) => {
  const [email, setEmail] = useState('')
  const [showVideo, setShowVideo] = useState(false)
  const { trackPageView, track, trackTrialStart } = useAnalytics()

  useEffect(() => {
    trackPageView('landing_page')
  }, [])

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      track('email_signup', { email, source: 'landing_page' })
      onSignUp?.(email)
    }
  }

  const handleGetStarted = () => {
    trackTrialStart('family')
    track('cta_click', { button: 'get_started', location: 'hero' })
    onGetStarted?.()
  }

  const handleVideoPlay = () => {
    track('video_play', { video: 'demo', location: 'hero' })
    setShowVideo(true)
  }

  const painPoints = [
    "Confusing group texts about who's visiting when",
    "Family members showing up at the same time by accident", 
    "Missing important updates about mom's mood and health",
    "No one knows if grandpa had visitors this week",
    "Chaos during medical emergencies",
    "Losing precious photos and memories from visits"
  ]

  const features = [
    {
      icon: <Calendar className="w-6 h-6 text-blue-500" />,
      title: 'Smart Visit Scheduling',
      description: 'AI suggests optimal times. Never have empty days or double-bookings again.',
      value: 'Saves 5+ hours per week'
    },
    {
      icon: <Sparkles className="w-6 h-6 text-purple-500" />,
      title: 'Intelligent Insights',
      description: 'Learn that "Sarah\'s visits boost mom\'s mood 40%" and "mornings work best."',
      value: 'Better care outcomes'
    },
    {
      icon: <Heart className="w-6 h-6 text-red-500" />,
      title: 'Memory Timeline',
      description: 'Beautiful photo timelines preserve precious moments forever.',
      value: 'Priceless memories'
    },
    {
      icon: <Phone className="w-6 h-6 text-green-500" />,
      title: 'Emergency System',
      description: 'Instant family alerts and emergency contact access when it matters most.',
      value: 'Peace of mind'
    }
  ]

  const testimonials = [
    {
      name: 'Sarah M.',
      role: 'Daughter, Chicago',
      photo: '👩‍💼',
      quote: 'TouchPoints saved my sanity. No more confusing group texts - everyone knows when they\'re visiting Dad.',
      rating: 5
    },
    {
      name: 'Michael T.',
      role: 'Son, Austin',
      photo: '👨‍💻',
      quote: 'The AI suggestions are incredible. It learned our family patterns and now suggests the perfect visit times.',
      rating: 5
    },
    {
      name: 'Jennifer L.',
      role: 'Family Coordinator, Seattle',
      photo: '👩‍⚕️',
      quote: 'The emergency alert system gave us such peace of mind. When mom fell, everyone was notified instantly.',
      rating: 5
    }
  ]

  const stats = [
    { number: '10,000+', label: 'Families Using TouchPoints' },
    { number: '500,000+', label: 'Visits Coordinated' },
    { number: '99.9%', label: 'Uptime Reliability' },
    { number: '4.9/5', label: 'Family Satisfaction' }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TouchPoints</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="secondary" size="sm">Sign In</Button>
              <Button onClick={onGetStarted} size="sm">Start Free Trial</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Social Proof Badge */}
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full mb-6 shadow-sm">
                <div className="flex -space-x-1">
                  <div className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center">👩</div>
                  <div className="w-6 h-6 bg-green-500 rounded-full text-white text-xs flex items-center justify-center">👨</div>
                  <div className="w-6 h-6 bg-purple-500 rounded-full text-white text-xs flex items-center justify-center">👵</div>
                </div>
                <span className="text-sm font-medium text-gray-700">Join 10,000+ families</span>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
              </div>

              <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
                Your family's 
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> medical visits </span>
                are chaos.<br />
                <span className="text-3xl">We fix that.</span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Stop drowning in group texts. TouchPoints uses AI to coordinate family care visits, 
                preserve precious memories, and give you peace of mind when it matters most.
              </p>

              {/* Pain Points */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Sound familiar?
                </h3>
                <ul className="space-y-2 text-sm text-red-800">
                  {painPoints.slice(0, 3).map((pain, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{pain}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 text-lg font-semibold"
                >
                  Start Free Trial - First Month FREE!
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                <button
                  onClick={handleVideoPlay}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-4 py-4"
                >
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Play className="w-5 h-5 text-blue-500 ml-1" />
                  </div>
                  <span className="font-medium">Watch 2-min demo</span>
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                ✅ No credit card required • ✅ Setup in under 5 minutes • ✅ Cancel anytime
              </p>
            </div>

            {/* Dashboard Preview */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Mom's Care Circle</span>
                    <span className="text-sm opacity-80">Riverside Care • Room 205</span>
                  </div>
                  <div className="text-sm opacity-90">15 consecutive days with visits! 🎉</div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-4">
                  <div className="text-center text-xs text-gray-500 py-1">Sun</div>
                  <div className="text-center text-xs text-gray-500 py-1">Mon</div>
                  <div className="text-center text-xs text-gray-500 py-1">Tue</div>
                  <div className="text-center text-xs text-gray-500 py-1">Wed</div>
                  <div className="text-center text-xs text-gray-500 py-1">Thu</div>
                  <div className="text-center text-xs text-gray-500 py-1">Fri</div>
                  <div className="text-center text-xs text-gray-500 py-1">Sat</div>

                  {[...Array(7)].map((_, i) => (
                    <div key={i} className={`h-8 rounded text-xs text-white flex items-center justify-center ${
                      i % 3 === 0 ? 'bg-blue-500' : i % 3 === 1 ? 'bg-green-500' : 'bg-purple-500'
                    }`}>
                      {i < 5 ? '1' : ''}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Sarah - Today 2:00 PM</span>
                    <Heart className="w-4 h-4 text-red-500 ml-auto" />
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Mike - Tomorrow 10:00 AM</span>
                    <Camera className="w-4 h-4 text-gray-500 ml-auto" />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span><strong>AI Suggestion:</strong> Bob usually visits Sundays at 2 PM</span>
                  </div>
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Live Updates
              </div>
              <div className="absolute -bottom-4 -left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                AI Powered
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why families choose TouchPoints
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              More than just scheduling - TouchPoints uses AI to optimize care, preserve memories, 
              and give your family superpowers during the hardest times.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 mb-3">{feature.description}</p>
                    <div className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                      <Check className="w-4 h-4" />
                      {feature.value}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Real families, real results
            </h2>
            <p className="text-xl text-gray-600">
              See how TouchPoints transformed family care coordination
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <div className="flex text-yellow-400 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                
                <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
                
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{testimonial.photo}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Before/After Comparison */}
      <section className="py-20 bg-gradient-to-r from-red-50 to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Before TouchPoints vs. After TouchPoints
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Before */}
            <Card className="p-8 border-2 border-red-200 bg-red-50">
              <h3 className="text-2xl font-bold text-red-900 mb-6 flex items-center gap-2">
                😩 Before TouchPoints
              </h3>
              <ul className="space-y-3">
                {painPoints.map((pain, index) => (
                  <li key={index} className="flex items-start gap-3 text-red-800">
                    <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{pain}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* After */}
            <Card className="p-8 border-2 border-green-200 bg-green-50">
              <h3 className="text-2xl font-bold text-green-900 mb-6 flex items-center gap-2">
                🎉 After TouchPoints
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-green-800">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>AI suggests perfect visit times for everyone</span>
                </li>
                <li className="flex items-start gap-3 text-green-800">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Smart scheduling prevents double-bookings automatically</span>
                </li>
                <li className="flex items-start gap-3 text-green-800">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Real-time mood tracking and family notifications</span>
                </li>
                <li className="flex items-start gap-3 text-green-800">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Beautiful timeline shows visit history and care patterns</span>
                </li>
                <li className="flex items-start gap-3 text-green-800">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Emergency system alerts entire family instantly</span>
                </li>
                <li className="flex items-start gap-3 text-green-800">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Photos and memories preserved forever in beautiful timeline</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Start coordinating better care today
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join 10,000+ families who've transformed their care coordination with TouchPoints
          </p>

          <div className="bg-white bg-opacity-10 rounded-2xl p-8 mb-8">
            <div className="text-5xl font-bold mb-2">$29.99<span className="text-xl">/month</span></div>
            <div className="text-lg opacity-90 mb-4">Family Plan - Most Popular</div>
            <div className="text-6xl font-bold text-yellow-300 mb-2">FREE</div>
            <div className="text-lg">First Month - Limited Time!</div>
          </div>

          <form onSubmit={handleEmailSignup} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-6">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 bg-white"
              required
            />
            <Button 
              type="submit"
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold px-8"
            >
              Start Free Trial
            </Button>
          </form>

          <p className="text-sm opacity-80">
            No credit card required • Cancel anytime • HIPAA compliant
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold">TouchPoints</span>
            </div>
            
            <div className="text-sm text-gray-400">
              © 2024 TouchPoints. Made with ❤️ for families everywhere.
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">TouchPoints Demo</h3>
              <button
                onClick={() => setShowVideo(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Demo video would play here</p>
                <p className="text-sm text-gray-500 mt-2">
                  Shows family using TouchPoints to coordinate mom's care visits
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}