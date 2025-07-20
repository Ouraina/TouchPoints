// Analytics and conversion tracking
interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
}

class Analytics {
  private static instance: Analytics
  private isProduction = import.meta.env.PROD
  private userId: string | null = null

  private constructor() {
    // Initialize analytics in production
    if (this.isProduction) {
      this.initializeGoogleAnalytics()
      this.initializeFacebookPixel()
    }
  }

  public static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics()
    }
    return Analytics.instance
  }

  private initializeGoogleAnalytics() {
    // Google Analytics 4
    const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX' // Replace with real ID
    
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    document.head.appendChild(script)

    // @ts-ignore
    window.dataLayer = window.dataLayer || []
    // @ts-ignore
    function gtag(...args: any[]) { window.dataLayer.push(args) }
    // @ts-ignore
    window.gtag = gtag

    // @ts-ignore
    gtag('js', new Date())
    // @ts-ignore
    gtag('config', GA_MEASUREMENT_ID)
  }

  private initializeFacebookPixel() {
    // Facebook Pixel
    const FACEBOOK_PIXEL_ID = 'XXXXXXXXXXXXXX' // Replace with real ID
    
    // @ts-ignore
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');

    // @ts-ignore
    fbq('init', FACEBOOK_PIXEL_ID)
    // @ts-ignore
    fbq('track', 'PageView')
  }

  public setUserId(userId: string) {
    this.userId = userId
    
    if (this.isProduction) {
      // @ts-ignore
      if (window.gtag) {
        // @ts-ignore
        window.gtag('config', 'GA_MEASUREMENT_ID', {
          user_id: userId
        })
      }
    }
  }

  public track(event: string, properties?: Record<string, any>) {
    const eventData: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      }
    }

    // Console log in development
    if (!this.isProduction) {
      console.log('📊 Analytics Event:', eventData)
    }

    // Send to Google Analytics
    if (this.isProduction && window.gtag) {
      // @ts-ignore
      window.gtag('event', event, {
        custom_parameter_1: properties?.value,
        custom_parameter_2: properties?.category,
        ...properties
      })
    }

    // Send to Facebook Pixel
    if (this.isProduction && window.fbq) {
      // @ts-ignore
      window.fbq('track', event, properties)
    }

    // Send to our backend for analysis
    this.sendToBackend(eventData)
  }

  private async sendToBackend(eventData: AnalyticsEvent) {
    try {
      // In production, send to your analytics endpoint
      if (this.isProduction) {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData)
        })
      }
    } catch (error) {
      console.error('Failed to send analytics:', error)
    }
  }

  // Conversion tracking methods
  public trackPageView(page: string) {
    this.track('page_view', { page })
  }

  public trackSignup(method: 'email' | 'google' | 'facebook') {
    this.track('sign_up', { method })
  }

  public trackLogin(method: 'email' | 'google' | 'facebook') {
    this.track('login', { method })
  }

  public trackSubscription(plan: string, amount: number) {
    this.track('purchase', { 
      plan, 
      amount, 
      currency: 'USD',
      transaction_id: `txn_${Date.now()}`
    })
  }

  public trackTrialStart(plan: string) {
    this.track('begin_checkout', { plan })
  }

  public trackOnboardingStep(step: number, stepName: string) {
    this.track('onboarding_step', { step, stepName })
  }

  public trackFeatureUsage(feature: string, action: string) {
    this.track('feature_usage', { feature, action })
  }

  public trackEmergencyAlert(alertType: string) {
    this.track('emergency_alert', { alertType })
  }

  public trackVisitScheduled(method: 'manual' | 'ai_suggestion') {
    this.track('visit_scheduled', { method })
  }

  public trackPhotoUpload(visitId: string) {
    this.track('photo_upload', { visitId })
  }

  public trackVoiceNote(duration: number) {
    this.track('voice_note', { duration })
  }

  public trackInviteSent(method: 'email' | 'sms' | 'link') {
    this.track('invite_sent', { method })
  }

  public trackMoodUpdate(mood: string) {
    this.track('mood_update', { mood })
  }
}

// Export singleton instance
export const analytics = Analytics.getInstance()

// Convenience hooks for React components
export const useAnalytics = () => {
  return {
    track: analytics.track.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackSignup: analytics.trackSignup.bind(analytics),
    trackLogin: analytics.trackLogin.bind(analytics),
    trackSubscription: analytics.trackSubscription.bind(analytics),
    trackTrialStart: analytics.trackTrialStart.bind(analytics),
    trackOnboardingStep: analytics.trackOnboardingStep.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    trackEmergencyAlert: analytics.trackEmergencyAlert.bind(analytics),
    trackVisitScheduled: analytics.trackVisitScheduled.bind(analytics),
    trackPhotoUpload: analytics.trackPhotoUpload.bind(analytics),
    trackVoiceNote: analytics.trackVoiceNote.bind(analytics),
    trackInviteSent: analytics.trackInviteSent.bind(analytics),
    trackMoodUpdate: analytics.trackMoodUpdate.bind(analytics),
    setUserId: analytics.setUserId.bind(analytics)
  }
}