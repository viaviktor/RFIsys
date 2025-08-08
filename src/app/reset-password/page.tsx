'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { ArrowLeftIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function ResetPasswordContent() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    if (!token) {
      router.push('/forgot-password')
    }
  }, [token, router])

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reset password')
      }

      setIsSubmitted(true)
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Failed to reset password',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return null // Will redirect
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
                <h2 className="text-2xl font-bold text-steel-900 mb-2">Password Reset Successful</h2>
                <p className="text-steel-600">
                  Your password has been updated successfully. You can now sign in with your new password.
                </p>
              </div>
              
              <div className="space-y-4">
                <Link href="/login">
                  <Button variant="primary" className="w-full">
                    Sign In to Dashboard
                  </Button>
                </Link>
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
              <h2 className="text-2xl font-bold text-steel-900 mb-2">Reset Your Password</h2>
              <p className="text-steel-600">Enter your new password below.</p>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  label="New Password"
                  placeholder="Enter your new password"
                  error={errors.password?.message}
                  autoComplete="new-password"
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-steel-400 hover:text-steel-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  }
                />
              </div>

              <div>
                <Input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  placeholder="Confirm your new password"
                  error={errors.confirmPassword?.message}
                  autoComplete="new-password"
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-steel-400 hover:text-steel-600"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  }
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 text-sm mb-1">Password Requirements:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Use a strong, unique password</li>
                </ul>
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
                  Update Password
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-steel-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-steel-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}