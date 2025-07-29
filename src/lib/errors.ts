import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export class APIError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401)
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(message, 403)
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404)
  }
}

export class ConflictError extends APIError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409)
  }
}

export function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): APIError {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target as string[]
      return new ConflictError(`Resource with this ${field?.[0] || 'field'} already exists`)
    
    case 'P2025':
      // Record not found
      return new NotFoundError('Resource not found')
    
    case 'P2003':
      // Foreign key constraint violation
      return new ValidationError('Invalid reference to related resource')
    
    case 'P2006':
      // Invalid value for field
      return new ValidationError('Invalid field value provided')
    
    case 'P2007':
      // Data validation error
      return new ValidationError('Data validation failed')
    
    case 'P2011':
      // Null constraint violation
      return new ValidationError('Required field is missing')
    
    case 'P2012':
      // Missing required value
      return new ValidationError('Missing required field')
    
    case 'P2013':
      // Missing required argument
      return new ValidationError('Missing required argument')
    
    case 'P2014':
      // Relation violation
      return new ValidationError('Invalid relation between resources')
    
    default:
      console.error('Unhandled Prisma error:', error)
      return new APIError('Database operation failed', 500)
  }
}

export function createErrorResponse(error: unknown): NextResponse {
  // Handle our custom API errors
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: error.statusCode }
    )
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const apiError = handlePrismaError(error)
    return NextResponse.json(
      {
        error: apiError.message,
        ...(process.env.NODE_ENV === 'development' && { 
          code: error.code,
          meta: error.meta,
          stack: error.stack 
        }),
      },
      { status: apiError.statusCode }
    )
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: 'Invalid data provided',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error.message,
          stack: error.stack 
        }),
      },
      { status: 400 }
    )
  }

  // Handle JWT errors
  if (error instanceof Error && error.name === 'JsonWebTokenError') {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }

  if (error instanceof Error && error.name === 'TokenExpiredError') {
    return NextResponse.json(
      { error: 'Token expired' },
      { status: 401 }
    )
  }

  // Handle unknown errors
  console.error('Unhandled error:', error)
  return NextResponse.json(
    {
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      }),
    },
    { status: 500 }
  )
}

export function withErrorHandling(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      return createErrorResponse(error)
    }
  }
}