import React from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Check, Star, Sparkles, Shield, Heart, Users, Crown } from 'lucide-react'

const PricingPage: React.FC = () => {
  const plans = [
    {
      name: 'Solo Caregiver',
      price: '$12.99',
      originalPrice: '$19.99',
      priceId: 'price_solo_monthly',
      features: [
        '1 care circle',
        'Basic visit scheduling',
        'Photo sharing',
        'Visit notes',
        'Mobile app access',
        'Email support'
      ],
      description: 'Perfect for single caregivers managing visits',
      icon: <Heart className="w-6 h-6 text-red-500" />
    },
    {
      name: 'Family Plan',
      price: '$29.99',
      originalPrice: '$49.99',
      priceId: 'price_family_monthly',
      features: [
        'Unlimited family members',
        'Smart AI suggestions',
        'Real-time notifications',
        'Advanced calendar views',
        'Voice notes with transcription',
        'Family insights dashboard',
        'Emergency alert system',
        'Priority support'
      ],
      description: 'Most popular - coordinate across the whole family',
      icon: <Users className="w-6 h-6 text-blue-500" />,
      highlighted: true
    },
    {
      name: 'Pro Care Team',
      price: '$49.99',
      originalPrice: '$79.99',
      priceId: 'price_pro_monthly',
      features: [
        'Everything in Family',
        'Professional caregiver access',
        'Advanced analytics & reports',
        'API integrations',
        'Custom care protocols',
        '24/7 phone support',
        'White-label options',
        'HIPAA compliance tools'
      ],
      description: 'For families + professional caregivers',
      icon: <Crown className="w-6 h-6 text-purple-500" />
    }
  ]

  const handleCheckout = async (priceId: string) => {
    try {
      // Call our backend API route
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
      
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const { error } = await stripe.redirectToCheckout({ sessionId })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Payment failed. Please try again.')
    }
  }

  const calculateSavings = (price: string, originalPrice: string) => {
    const priceNum = parseFloat(price.replace('$', ''))
    const originalNum = parseFloat(originalPrice.replace('$', ''))
    return Math.round(((originalNum - priceNum) / originalNum) * 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-2 rounded-full mb-6">
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
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span>Setup in under 5 minutes</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const savings = calculateSavings(plan.price, plan.originalPrice)
            
            return (
              <Card
                key={plan.priceId}
                className={`
                  relative p-8 transition-all duration-300
                  ${plan.highlighted ? 'ring-2 ring-blue-500 scale-105' : 'hover:shadow-xl'}
                `}
              >
                {/* Popular Badge */}
                {plan.highlighted && (
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

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                  
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 ml-1">/month</span>
                  </div>
                  
                  {plan.originalPrice && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-lg text-gray-400 line-through">{plan.originalPrice}</span>
                      <span className="text-sm text-green-600 font-medium">
                        Save ${(parseFloat(plan.originalPrice.replace('$', '')) - parseFloat(plan.price.replace('$', ''))).toFixed(2)}/month
                      </span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => handleCheckout(plan.priceId)}
                  className={`
                    w-full py-3 text-lg font-semibold transition-all duration-200
                    ${plan.highlighted 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white' 
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }
                  `}
                >
                  Start Free Trial
                  <span className="ml-2 text-sm opacity-80">(First month FREE!)</span>
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
      </div>
    </div>
  )
}

export default PricingPage 