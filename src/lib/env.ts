/**
 * Environment configuration and validation
 * This file centralizes all environment variable access and validation
 */

// Server-side environment variables
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || (process.env.SKIP_ENV_VALIDATION ? 'postgresql://placeholder' : undefined)!,
  JWT_SECRET: process.env.JWT_SECRET || (process.env.SKIP_ENV_VALIDATION ? 'placeholder-secret' : undefined)!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Email configuration
  SMTP_HOST: process.env.SMTP_HOST || 'localhost',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '1025'),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@example.com',
  
  // File upload configuration
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  UPLOAD_MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE || process.env.UPLOAD_MAX_SIZE || '10485760'), // 10MB
  UPLOAD_ALLOWED_TYPES: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
    'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'
  ],
  
  // Brevo Email Configuration (Legacy)
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  BREVO_REPLY_DOMAIN: process.env.BREVO_REPLY_DOMAIN || '',
  BREVO_WEBHOOK_SECRET: process.env.BREVO_WEBHOOK_SECRET || '',
  
  // Mailgun Email Configuration (Primary)
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY || '',
  MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || '',
  MAILGUN_BASE_URL: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net/v3',
  MAILGUN_WEBHOOK_SIGNING_KEY: process.env.MAILGUN_WEBHOOK_SIGNING_KEY || '',
  MAILGUN_REPLY_DOMAIN: process.env.MAILGUN_REPLY_DOMAIN || 'mgrfi.steel-detailer.com',
  
  // Email Provider Selection
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'mailgun', // 'mailgun', 'brevo', or 'smtp'
  
  // API configuration
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000'),
  API_RETRY_ATTEMPTS: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
  
  // Feature flags
  FEATURE_EMAIL_NOTIFICATIONS: process.env.FEATURE_EMAIL_NOTIFICATIONS === 'true',
  FEATURE_FILE_ATTACHMENTS: process.env.FEATURE_FILE_ATTACHMENTS === 'true',
  FEATURE_EXPORT_PDF: process.env.FEATURE_EXPORT_PDF === 'true',
  FEATURE_REAL_TIME_UPDATES: process.env.FEATURE_REAL_TIME_UPDATES === 'true',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE_PATH: process.env.LOG_FILE_PATH || './logs/app.log',
  
  // Cache
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes
}

// Client-side environment variables (must be prefixed with NEXT_PUBLIC_)
export const publicEnv = {
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'RFI System',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  SHOW_DEBUG_INFO: process.env.NEXT_PUBLIC_SHOW_DEBUG_INFO === 'true',
}

// Environment validation
export function validateEnv() {
  // Skip validation during build process
  if (process.env.SKIP_ENV_VALIDATION) {
    return
  }
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    )
  }
  
  // Validate JWT_SECRET in production
  if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'your-secret-key-change-this-in-production') {
    throw new Error(
      'JWT_SECRET must be changed from the default value in production!'
    )
  }
  
  // Validate DATABASE_URL format
  if (!env.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string')
  }
}

// Utility functions
export function isDevelopment() {
  return env.NODE_ENV === 'development'
}

export function isProduction() {
  return env.NODE_ENV === 'production'
}

export function isTest() {
  return env.NODE_ENV === 'test'
}

// App configuration object
export const appConfig = {
  name: publicEnv.APP_NAME,
  url: publicEnv.APP_URL,
  version: publicEnv.APP_VERSION,
  
  // Database
  database: {
    url: env.DATABASE_URL,
  },
  
  // Authentication
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
  },
  
  // Email
  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  },
  
  // File uploads
  upload: {
    dir: env.UPLOAD_DIR,
    maxSize: env.UPLOAD_MAX_SIZE,
    allowedTypes: env.UPLOAD_ALLOWED_TYPES,
  },
  
  // Brevo Email (Legacy)
  brevo: {
    apiKey: env.BREVO_API_KEY,
    replyDomain: env.BREVO_REPLY_DOMAIN,
    webhookSecret: env.BREVO_WEBHOOK_SECRET,
  },
  
  // Mailgun Email (Primary)
  mailgun: {
    apiKey: env.MAILGUN_API_KEY,
    domain: env.MAILGUN_DOMAIN,
    baseUrl: env.MAILGUN_BASE_URL,
    webhookSigningKey: env.MAILGUN_WEBHOOK_SIGNING_KEY,
    replyDomain: env.MAILGUN_REPLY_DOMAIN,
  },
  
  // Email provider
  emailProvider: env.EMAIL_PROVIDER,
  
  // API
  api: {
    timeout: env.API_TIMEOUT,
    retryAttempts: env.API_RETRY_ATTEMPTS,
  },
  
  // Features
  features: {
    emailNotifications: env.FEATURE_EMAIL_NOTIFICATIONS,
    fileAttachments: env.FEATURE_FILE_ATTACHMENTS,
    exportPdf: env.FEATURE_EXPORT_PDF,
    realTimeUpdates: env.FEATURE_REAL_TIME_UPDATES,
  },
  
  // Development
  debug: {
    showInfo: publicEnv.SHOW_DEBUG_INFO,
    logLevel: env.LOG_LEVEL,
    logFilePath: env.LOG_FILE_PATH,
  },
  
  // Cache
  cache: {
    ttl: env.CACHE_TTL,
  },
}

// Export for use in other files
export default appConfig