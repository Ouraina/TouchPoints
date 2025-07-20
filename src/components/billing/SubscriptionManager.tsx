import React, { useState, useEffect } from 'react'
import { 
  CreditCard, 
  Check, 
  Star, 
  Sparkles, 
  Users, 
  Calendar,
  Heart,
  Shield,
  Zap,
  Crown
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { StripeService, PRICING_TIERS } from '../../lib/stripe'
import { useAuth } from '../../hooks/useAuth'

interface PricingTier {
  id: string
  name: string
  price: number
  originalPrice?: number
  features: string[]
  popular?: boolean
  description: string
  icon: React.ReactNode
  stripePriceId: string
}

interface SubscriptionManagerProps {
  onSubscribe?: (tierId: string) => void
  currentPlan?: string
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  onSubscribe,
  currentPlan
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('family')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const { user } = useAuth()

  const pricingTiers: PricingTier[] = [
    {
      id: 'solo',
      name: 'Solo Caregiver',
      price: 12.99,
      originalPrice: 19.99,
      description: 'Perfect for single caregivers managing visits',
      icon: <Heart className="w-6 h-6 text-red-500" />,
      stripePriceId: 'price_solo_monthly',
      features: [
        '1 care circle',
        'Basic visit scheduling',
        'Photo sharing',
        'Visit notes',
        'Mobile app access',
        'Email support'
      ]
    },
    {
      id: 'family',
      name: 'Family Plan',
      price: 29.99,
      originalPrice: 49.99,
      description: 'Most popular - coordinate across the whole family',
      icon: <Users className="w-6 h-6 text-blue-500" />,
      stripePriceId: 'price_family_monthly',
      popular: true,
      features: [
        'Unlimited family members',
        'Smart AI suggestions',
        'Real-time notifications',
        'Advanced calendar views',
        'Voice notes with transcription',
        'Family insights dashboard',
        'Emergency alert system',
        'Priority support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Care Team',
      price: 49.99,
      originalPrice: 79.99,
      description: 'For families + professional caregivers',
      icon: <Crown className="w-6 h-6 text-purple-500" />,
      stripePriceId: 'price_pro_monthly',
      features: [
        'Everything in Family',
        'Professional caregiver access',
        'Advanced analytics & reports',
        'API integrations',
        'Custom care protocols',
        '24/7 phone support',
        'White-label options',
        'HIPAA compliance tools'
      ]
    }
  ]

  const handleSubscribe = async (tierId: string) => {
    setIsProcessing(true)
    setSelectedPlan(tierId)
    
    try {
      const selectedTier = pricingTiers.find(t => t.id === tierId)
      if (!selectedTier) {
        throw new Error('Invalid tier selected')
      }

      // Create Stripe checkout session
      const successUrl = `${window.location.origin}/dashboard?subscription=success`
      const cancelUrl = `${window.location.origin}/pricing?canceled=true`
      
      await StripeService.createCheckoutSession(
        selectedTier.stripePriceId,
        successUrl,
        cancelUrl
      )
      
      // Note: User will be redirected to Stripe, so we don't need to handle success here
      // The success will be handled when they return to the successUrl
      
    } catch (error) {
      console.error('Subscription failed:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const returnUrl = `${window.location.origin}/dashboard`
      await StripeService.createPortalSession(returnUrl)
    } catch (error) {
      console.error('Failed to open customer portal:', error)
      alert('Failed to open subscription management. Please try again.')
    }
  }

  const calculateSavings = (price: number, originalPrice?: number) => {
    if (!originalPrice) return 0
    return Math.round(((originalPrice - price) / originalPrice) * 100)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-2 rounded-full mb-4">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-800">Limited Time: First Month FREE!</span>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Family Care Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Transform chaotic family coordination into seamless care with TouchPoints' AI-powered platform
        </p>
        
        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>30-day money-back guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span>HIPAA compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Setup in under 5 minutes</span>
          </div>
        </div>
      </div>

      {/* Current Plan Management */}
      {currentPlan && (
        <div className="mb-8">
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Current Plan: {currentPlan}</h3>
                <p className="text-blue-700">Manage your subscription and billing</p>
              </div>
              <Button
                onClick={handleManageSubscription}
                variant="secondary"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {pricingTiers.map((tier) => {
          const savings = calculateSavings(tier.price, tier.originalPrice)
          const isSelected = selectedPlan === tier.id
          const isCurrent = currentPlan === tier.id
          
          return (
            <Card
              key={tier.id}
              className={`
                relative p-8 transition-all duration-300 cursor-pointer
                ${tier.popular ? 'ring-2 ring-blue-500 scale-105' : 'hover:shadow-xl'}
                ${isSelected ? 'ring-2 ring-purple-500' : ''}
                ${isCurrent ? 'bg-green-50 border-green-200' : ''}
              `}
              onClick={() => setSelectedPlan(tier.id)}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Savings Badge */}
              {savings > 0 && (
                <div className="absolute top-4 right-4">
                  <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                    SAVE {savings}%
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute top-4 left-4">
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Current Plan
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className="flex justify-center mb-3">
                  {tier.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
                
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                  <span className="text-gray-500 ml-1">/month</span>
                </div>
                
                {tier.originalPrice && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-lg text-gray-400 line-through">${tier.originalPrice}</span>
                    <span className="text-sm text-green-600 font-medium">
                      Save ${(tier.originalPrice - tier.price).toFixed(2)}/month
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleSubscribe(tier.id)}
                disabled={isProcessing || isCurrent}
                className={`
                  w-full py-3 text-lg font-semibold transition-all duration-200
                  ${tier.popular 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white' 
                    : isCurrent
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }
                `}
              >
                {isProcessing && selectedPlan === tier.id ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </div>
                ) : isCurrent ? (
                  'Current Plan'
                ) : (
                  <>
                    Start Free Trial
                    <span className="ml-2 text-sm opacity-80">(First month FREE!)</span>
                  </>
                )}
              </Button>
            </Card>
          )
        })}
      </div>

      {/* Trust Signals */}
      <div className="text-center py-8 bg-gray-50 rounded-xl">
        <p className="text-gray-600 mb-4">Trusted by families across the country</p>
        <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>HIPAA Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span>99.9% Uptime</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>10,000+ Families</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span>4.9/5 Rating</span>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Frequently Asked Questions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is there a setup fee?</h3>
              <p className="text-gray-600 text-sm">No setup fees. Your first month is completely free, and you can cancel anytime.</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How secure is our family data?</h3>
              <p className="text-gray-600 text-sm">We're HIPAA compliant with enterprise-grade encryption. Your data is as secure as your bank's.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I change plans later?</h3>
              <p className="text-gray-600 text-sm">Yes! Upgrade or downgrade anytime. Changes take effect immediately.</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What if I need help?</h3>
              <p className="text-gray-600 text-sm">All plans include support. Pro plans get 24/7 phone support from our care specialists.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to TouchPoints!</h3>
            <p className="text-gray-600 mb-6">
              Your subscription is active. Let's get your family care coordination set up.
            </p>
            
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Start Setting Up Your Family
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}