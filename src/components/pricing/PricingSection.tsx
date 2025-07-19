import React from 'react'
import { Check, Star } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

interface PricingTier {
  id: string
  name: string
  price: number
  period: string
  highlighted?: boolean
  features: string[]
  buttonText: string
  description: string
}

const pricingTiers: PricingTier[] = [
  {
    id: 'solo',
    name: 'Solo',
    price: 12.99,
    period: 'month',
    description: 'Perfect for individuals managing one care circle',
    features: [
      '1 Care Circle',
      'Up to 5 family members',
      'Basic visit scheduling',
      'Photo sharing',
      'Voice notes',
      'Mobile app access'
    ],
    buttonText: 'Get Started'
  },
  {
    id: 'family',
    name: 'Family',
    price: 29.99,
    period: 'month',
    highlighted: true,
    description: 'Most popular for families with multiple care needs',
    features: [
      'Up to 3 Care Circles',
      'Unlimited family members',
      'Advanced scheduling',
      'Calendar sync (Google, Outlook)',
      'Mood tracking',
      'Pattern recognition',
      'Notification system',
      'Priority support'
    ],
    buttonText: 'Choose Family'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49.99,
    period: 'month',
    description: 'For care coordinators and larger families',
    features: [
      'Unlimited Care Circles',
      'Unlimited family members',
      'Everything in Family',
      'Advanced analytics',
      'Care reports & insights',
      'API access',
      'White-label options',
      'Dedicated support'
    ],
    buttonText: 'Go Pro'
  }
]

export const PricingSection: React.FC = () => {
  return (
    <div className="py-16 px-4" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Choose Your Plan
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Select the perfect plan for your family's care coordination needs. 
            All plans include our core features with a 30-day money-back guarantee.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.id}
              className={`relative p-8 text-center transition-all duration-300 hover:scale-105 ${
                tier.highlighted 
                  ? 'ring-2 shadow-xl' 
                  : 'hover:shadow-lg'
              }`}
              style={{
                ringColor: tier.highlighted ? 'var(--accent)' : undefined,
                transform: tier.highlighted ? 'scale(1.05)' : undefined
              }}
            >
              {tier.highlighted && (
                <div 
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-white text-sm font-semibold flex items-center"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <Star className="w-4 h-4 mr-1" />
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {tier.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {tier.description}
                </p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold" style={{ color: 'var(--primary)' }}>
                    ${tier.price}
                  </span>
                  <span className="text-lg ml-1" style={{ color: 'var(--text-secondary)' }}>
                    /{tier.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 text-left">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check 
                      className="w-5 h-5 mr-3 flex-shrink-0" 
                      style={{ color: 'var(--accent)' }} 
                    />
                    <span style={{ color: 'var(--text-primary)' }}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={tier.highlighted ? 'primary' : 'secondary'}
                className={`w-full ${tier.highlighted ? 'btn-success' : ''}`}
                style={{
                  backgroundColor: tier.highlighted ? 'var(--accent)' : undefined,
                  borderColor: tier.highlighted ? 'var(--accent)' : 'var(--primary)',
                  color: tier.highlighted ? 'white' : 'var(--primary)'
                }}
              >
                {tier.buttonText}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            All plans include a 30-day free trial. No credit card required to start.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PricingSection