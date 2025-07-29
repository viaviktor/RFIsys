import { z } from 'zod'
import { Role, Priority } from '@/types'

// Auth validation schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
})

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// RFI validation schemas
export const rfiSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  suggestedSolution: z
    .string()
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const),
  urgency: z.enum(['LOW', 'NORMAL', 'URGENT', 'ASAP'] as const).optional(),
  direction: z.enum(['OUTGOING', 'INCOMING'] as const).optional(),
  dueDate: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate >= today
    }, 'Due date must be today or in the future'),
  dateNeededBy: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate >= today
    }, 'Date needed by must be today or in the future'),
  clientId: z.string().min(1, 'Client is required'),
  projectId: z.string().min(1, 'Project is required'),
})

export const rfiUpdateSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'] as const).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).optional(),
  dueDate: z
    .string()
    .nullable()
    .optional()
    .refine((date) => {
      if (!date) return true
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate >= today
    }, 'Due date must be today or in the future'),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
})

// Response validation schema
export const responseSchema = z.object({
  content: z
    .string()
    .min(1, 'Response content is required')
    .min(5, 'Response must be at least 5 characters')
    .max(10000, 'Response must be less than 10,000 characters'),
})

// Filter validation schema
export const rfiFiltersSchema = z.object({
  status: z.array(z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'] as const)).optional(),
  priority: z.array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const)).optional(),
  search: z.string().max(500, 'Search query too long').optional(),
  createdById: z.string().optional(),
  projectId: z.string().optional(),
})

// Utility type inference
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type RFIFormData = z.infer<typeof rfiSchema>
export type RFIUpdateFormData = z.infer<typeof rfiUpdateSchema>
export type ResponseFormData = z.infer<typeof responseSchema>
export type RFIFiltersData = z.infer<typeof rfiFiltersSchema>

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Common validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_WEAK: 'Password must contain uppercase, lowercase, and number',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  TITLE_TOO_SHORT: 'Title must be at least 5 characters',
  DESCRIPTION_TOO_SHORT: 'Description must be at least 10 characters',
  DATE_IN_PAST: 'Date must be today or in the future',
} as const