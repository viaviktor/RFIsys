'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  })

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true)
    try {
      await login(data.email, data.password, data.rememberMe)
      router.push('/dashboard')
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Login failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <div />
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

      {/* Right side - Login Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-steel-lg border border-steel-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-steel-900 mb-2">Welcome Back</h2>
              <p className="text-steel-600">Sign in to access your RFI dashboard</p>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Input
                {...register('email')}
                type="email"
                label="Email address"
                placeholder="Enter your email"
                error={errors.email?.message}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                error={errors.password?.message}
                autoComplete="current-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  {...register('rememberMe')}
                  id="remember-me"
                  type="checkbox"
                  className="w-4 h-4 text-orange-600 border-steel-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-steel-700">
                  Remember me
                </label>
              </div>

              <div>
                <Link href="/forgot-password" className="text-sm text-orange-600 hover:text-orange-500">
                  Forgot password?
                </Link>
              </div>
            </div>

            {errors.root && (
              <div>
                <div>
                  {errors.root.message}
                </div>
              </div>
            )}

            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting}
             >
                Sign in to Dashboard
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-steel-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-steel-500">New to Steel RFI?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  Create an account
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-steel-50 rounded-lg border border-steel-200">
            <p className="text-sm font-medium text-steel-700 mb-2">Demo Accounts:</p>
            <div className="text-xs text-steel-600 space-y-1">
              <p><strong>Admin:</strong> viktor@kravisindustrial.com</p>
              <p><strong>Manager:</strong> manager@kravisindustrial.com</p> 
              <p><strong>User:</strong> detailer@kravisindustrial.com</p>
              <p className="pt-1"><strong>Password:</strong> password123</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}