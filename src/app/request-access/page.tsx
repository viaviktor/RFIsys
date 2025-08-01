'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

const accessRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  projectNumber: z.string().min(3, 'Please enter a valid project number'),
  reason: z.string().min(10, 'Please provide a reason for access (at least 10 characters)'),
})

type AccessRequestForm = z.infer<typeof accessRequestSchema>

interface SubmissionResult {
  success: boolean
  message: string
  status?: string
  nextSteps?: string
}

export default function RequestAccessPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AccessRequestForm>({
    resolver: zodResolver(accessRequestSchema),
  })

  const onSubmit = async (data: AccessRequestForm) => {
    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await fetch('/api/public/access-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const responseData = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: responseData.message,
          status: responseData.status,
          nextSteps: responseData.nextSteps,
        })
        reset()
      } else {
        setResult({
          success: false,
          message: responseData.error || 'Failed to submit request',
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please check your connection and try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
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
            REQUEST ACCESS
          </h1>
          <p className="text-xl text-orange-100">
            JOIN A PROJECT
          </p>
        </div>
      </div>

      {/* Right side - Request Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-steel-lg border border-steel-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-steel-900 mb-2">Request Project Access</h2>
              <p className="text-steel-600">Get access to a specific project</p>
            </div>
            
            {result && (
              <div className={`rounded-md p-4 mb-6 ${
                result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`text-sm ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  <p className="font-medium mb-2">{result.message}</p>
                  {result.nextSteps && (
                    <p className="text-xs">{result.nextSteps}</p>
                  )}
                </div>
              </div>
            )}

            {!result?.success && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <Input
                    {...register('name')}
                    type="text"
                    label="Full Name"
                    placeholder="Enter your full name"
                    error={errors.name?.message}
                    autoComplete="name"
                    autoFocus
                  />
                </div>

                <div>
                  <Input
                    {...register('email')}
                    type="email"
                    label="Email Address"
                    placeholder="Enter your work email"
                    error={errors.email?.message}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <Input
                    {...register('projectNumber')}
                    type="text"
                    label="Project Number"
                    placeholder="e.g., RFI-2024-001 or project name"
                    error={errors.projectNumber?.message}
                  />
                  <p className="mt-1 text-xs text-steel-500">
                    Enter the project number from the RFI you received
                  </p>
                </div>

                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-steel-700 mb-2">
                    Reason for Access
                  </label>
                  <textarea
                    {...register('reason')}
                    id="reason"
                    rows={4}
                    className="w-full px-3 py-2 border border-steel-300 rounded-md shadow-sm placeholder-steel-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Please explain why you need access to this project..."
                  />
                  {errors.reason && (
                    <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                  )}
                </div>

                <div>
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Submit Request
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-steel-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-steel-500">Already have access?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Sign in instead
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}