import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { Logo } from '../brand/Logo'

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('[LoginScreen] Attempting sign in with:', { email, password: '***' })

    try {
      const { data, error } = await signIn(email, password)
      console.log('[LoginScreen] Sign in response:', { data: !!data, error })
      
      if (error) {
        console.error('[LoginScreen] Sign in error:', error)
        setError(error.message)
      } else {
        console.log('[LoginScreen] Sign in successful, navigating to dashboard')
        navigate('/dashboard')
      }
    } catch (err) {
      console.error('[LoginScreen] Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ 
      background: `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)` 
    }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">TouchPoints</h1>
          <p className="text-white/80">Coordinating family visits with care</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text mb-4">Welcome Back</h2>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
                {error.includes('Auth session or user missing') && (
                  <p className="text-xs text-red-500 mt-1">
                    This usually means the account doesn't exist. Try creating a new account first.
                  </p>
                )}
              </div>
            )}

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
              autoComplete="current-password"
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Sign In
            </Button>

            <div className="text-center text-sm">
              <span className="text-textSecondary">Don't have an account? </span>
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}