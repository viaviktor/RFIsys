'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    getValues,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send reset email')
      }

      setIsSubmitted(true)
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Failed to send reset email',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-steel-50 flex flex-col lg:flex-row">
        {/* Left side - Branding */}
        <div className="lg:w-1/2 bg-gradient-construction flex items-center justify-center p-8">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-6 mx-auto shadow-steel">
              <span className="text-2xl font-bold text-orange-600">R</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 text-shadow-construction">
              STEEL RFI SYSTEM
            </h1>
            <p className="text-xl text-orange-100">
              Heavy-duty Request for Information Management
            </p>
          </div>
        </div>

        {/* Right side - Success Message */}
        <div className="lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl shadow-steel-lg border border-steel-200 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-steel-900 mb-2">Check Your Email</h2>
                <p className="text-steel-600">
                  If an account with <strong>{getValues('email')}</strong> exists, we've sent password reset instructions to your inbox.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">What's next?</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Check your email inbox and spam folder</li>
                    <li>• Click the reset link (valid for 30 minutes)</li>
                    <li>• Create a new secure password</li>
                  </ul>
                </div>
                
                <div className="flex space-x-3">
                  <Link href="/login" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <ArrowLeftIcon className="w-4 h-4 mr-2" />
                      Back to Login
                    </Button>
                  </Link>
                  <Button 
                    variant="primary"
                    className="flex-1"
                    onClick={() => setIsSubmitted(false)}
                  >
                    Try Different Email
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-steel-50 flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <div className="lg:w-1/2 bg-gradient-construction flex items-center justify-center p-8">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-6 mx-auto shadow-steel">
            <span className="text-2xl font-bold text-orange-600">R</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-shadow-construction">
            STEEL RFI SYSTEM
          </h1>
          <p className="text-xl text-orange-100">
            Heavy-duty Request for Information Management
          </p>
        </div>
      </div>

      {/* Right side - Reset Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-steel-lg border border-steel-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-steel-900 mb-2">Forgot Password?</h2>
              <p className="text-steel-600">Enter your email address and we'll send you a link to reset your password.</p>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Input
                  {...register('email')}
                  type="email"
                  label="Email address"
                  placeholder="Enter your email address"
                  error={errors.email?.message}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {errors.root && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-red-600">
                    {errors.root.message}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Send Reset Instructions
                </Button>
                
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}