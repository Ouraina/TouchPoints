import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { CareCircle } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Copy, Share } from 'lucide-react'

export const InviteFamilyScreen: React.FC = () => {
  const { circleId } = useParams()
  const [circle, setCircle] = useState<CareCircle | null>(null)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  const inviteLink = `${window.location.origin}/invite/${circleId}`

  useEffect(() => {
    const fetchCircle = async () => {
      if (!circleId) return
      
      const { data, error } = await supabase
        .from('care_circles')
        .select('*')
        .eq('id', circleId)
        .single()

      if (error) {
        console.error('Error fetching circle:', error)
        return
      }

      setCircle(data)
    }

    fetchCircle()
  }, [circleId])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `TouchPoints - ${circle?.patient_first_name}'s Care Circle`,
          text: `Join the care circle to coordinate visits for ${circle?.patient_first_name}`,
          url: inviteLink,
        })
      } catch (err) {
        console.error('Error sharing:', err)
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const handleContinue = () => {
    navigate(`/dashboard`)
  }

  if (!circle) return <div>Loading...</div>

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text mb-2">Invite Family & Friends</h1>
          <p className="text-textSecondary">
            Share this link so others can join {circle.patient_first_name}'s care circle
          </p>
        </div>

        <Card>
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-textSecondary mb-2">Invite Link:</p>
              <p className="text-sm font-mono break-all text-text">{inviteLink}</p>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleCopyLink}
                variant="secondary"
                className="flex-1 flex items-center justify-center"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button
                onClick={handleShare}
                variant="secondary"
                className="flex-1 flex items-center justify-center"
              >
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-textSecondary mb-4">
                You can invite more people later from the settings page
              </p>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full"
            >
              Continue to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}