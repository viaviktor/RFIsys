'use client'

import { useState } from 'react'
import { useEmail } from '@/hooks/useEmail'
import { Button } from '@/components/ui/Button'
import { EnvelopeIcon } from '@heroicons/react/24/outline'

interface EmailTestButtonProps {
  testEmail?: string
  className?: string
}

export function EmailTestButton({ testEmail = 'test@example.com', className }: EmailTestButtonProps) {
  const [email, setEmail] = useState(testEmail)
  const { sendTestEmail, isLoading, error } = useEmail()
  const [success, setSuccess] = useState(false)

  const handleSendTest = async () => {
    setSuccess(false)
    const result = await sendTestEmail(email)
    if (result?.success) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000) // Clear success after 3 seconds
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Test email address"
          
        />
        <Button
          
          onClick={handleSendTest}
          disabled={isLoading || !email}
          isLoading={isLoading}
          leftIcon={<EnvelopeIcon />}
       >
          Send Test
        </Button>
      </div>
      
      {error && (
        <p>{error}</p>
      )}
      
      {success && (
        <p>Test email sent successfully!</p>
      )}
    </div>
  )
}