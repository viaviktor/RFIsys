'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  UserGroupIcon, 
  CheckCircleIcon, 
  ClockIcon,
  EnvelopeIcon 
} from '@heroicons/react/24/outline'

interface InvitedStakeholder {
  id: string
  contact: {
    id: string
    name: string
    email: string
    isRegistered: boolean
  }
  project: {
    id: string
    name: string
    projectNumber?: string
  }
  invitedAt: string
}

interface InvitedStakeholdersListProps {
  projectId?: string
  limit?: number
}

export function InvitedStakeholdersList({ projectId, limit }: InvitedStakeholdersListProps) {
  const [invitations, setInvitations] = useState<InvitedStakeholder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInvitations()
  }, [projectId])

  const fetchInvitations = async () => {
    try {
      setIsLoading(true)
      const params = projectId ? `?projectId=${projectId}` : ''
      const response = await fetch(`/api/invitations${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch invitations')
      }

      const data = await response.json()
      setInvitations(limit ? data.invitations.slice(0, limit) : data.invitations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-steel-100 rounded-lg"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-600">
        {error}
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <UserGroupIcon className="w-12 h-12 text-steel-400 mx-auto mb-3" />
        <p className="text-steel-600">No team members invited yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="p-4 bg-white border border-steel-200 rounded-lg hover:border-orange-300 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-steel-900">
                  {invitation.contact.name}
                </h4>
                {invitation.contact.isRegistered ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    Registered
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-yellow-600">
                    <ClockIcon className="w-4 h-4" />
                    Pending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-steel-600">
                <EnvelopeIcon className="w-4 h-4" />
                {invitation.contact.email}
              </div>
              {!projectId && (
                <p className="text-sm text-steel-500 mt-1">
                  Project: {invitation.project.name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-steel-500">
                Invited {formatDistanceToNow(new Date(invitation.invitedAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}