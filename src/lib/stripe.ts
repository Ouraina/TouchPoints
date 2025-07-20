import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here')

export interface StripePrice {
  id: string
  unit_amount: number
  currency: string
  recurring: {
    interval: 'month' | 'year'
  }
}

export interface StripeSubscription {
  id: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  current_period_end: number
  cancel_at_period_end: boolean
}

export class StripeService {
  private static async getStripe() {
    return await stripePromise
  }

  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(priceId: string, successUrl: string, cancelUrl: string) {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl,
          cancelUrl,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      const stripe = await this.getStripe()
      
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const { error } = await stripe.redirectToCheckout({ sessionId })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Stripe checkout error:', error)
      throw error
    }
  }

  /**
   * Create a customer portal session for subscription management
   */
  static async createPortalSession(returnUrl: string) {
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnUrl }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Stripe portal error:', error)
      throw error
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscription(subscriptionId: string): Promise<StripeSubscription | null> {
    try {
      const response = await fetch(`/api/subscription/${subscriptionId}`)
      
      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching subscription:', error)
      return null
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string) {
    try {
      const response = await fetch(`/api/subscription/${subscriptionId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      return await response.json()
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw error
    }
  }
}

// Pricing tiers configuration
export const PRICING_TIERS = {
  solo: {
    id: 'solo',
    name: 'Solo Caregiver',
    price: 12.99,
    originalPrice: 19.99,
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
  family: {
    id: 'family',
    name: 'Family Plan',
    price: 29.99,
    originalPrice: 49.99,
    stripePriceId: 'price_family_monthly',
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
  pro: {
    id: 'pro',
    name: 'Pro Care Team',
    price: 49.99,
    originalPrice: 79.99,
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
} 