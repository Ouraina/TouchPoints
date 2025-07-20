import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { returnUrl, customerId } = req.body

    if (!returnUrl) {
      return res.status(400).json({ error: 'Missing return URL' })
    }

    // For now, we'll create a portal session for a demo customer
    // In production, you'd get the customerId from the authenticated user
    const customer = customerId || 'cus_demo_customer'

    const session = await stripe.billingPortal.sessions.create({
      customer: customer,
      return_url: returnUrl,
    })

    res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Stripe portal error:', error)
    res.status(500).json({ error: 'Failed to create portal session' })
  }
} 