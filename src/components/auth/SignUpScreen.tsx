import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { CheckCircle, Mail } from 'lucide-react'
import { Logo } from '../brand/Logo'

export const SignUpScreen: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await signUp(email, password, fullName)
      if (error) {
        setError(error.message)
      } else {
        // Check if email confirmation is required
        if (data?.user && !data?.session) {
          setEmailSent(true)
        } else {
          navigate('/onboarding/create-circle')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ 
        backgroundColor: 'var(--background)' 
      }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">TouchPoints</h1>
            <p className="text-gray-500">Coordinating family visits with care</p>
          </div>

          <Card>
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-text mb-2">Check Your Email</h2>
                <p className="text-textSecondary">
                  We've sent a confirmation link to <strong>{email}</strong>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Click the link in your email to confirm your account and start using TouchPoints.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/login')}
                  variant="secondary"
                  className="w-full"
                >
                  Back to Sign In
                </Button>
                
                <p className="text-xs text-textSecondary">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button 
                    onClick={handleSubmit}
                    className="text-primary hover:underline"
                  >
                    try again
                  </button>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ 
      background: `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)` 
    }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">TouchPoints</h1>
          <p className="text-white/80">Coordinating family visits with care</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text mb-4">Create Account</h2>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Create Account
            </Button>

            <div className="text-center text-sm">
              <span className="text-textSecondary">Already have an account? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}