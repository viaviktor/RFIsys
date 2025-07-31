# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# STEEL RFI System - Comprehensive Documentation for Claude Code

## 🏗️ System Overview

**STEEL RFI** is a comprehensive Request for Information (RFI) management system designed specifically for steel construction and industrial projects. It's a Next.js 15 application with PostgreSQL database, focused on managing communication between internal teams and external clients through structured RFI workflows.

### Key Characteristics
- **Industry Focus**: Heavy construction, steel detailing, and industrial projects
- **User Types**: Internal staff (USER, MANAGER, ADMIN) and external client stakeholders
- **Core Function**: Streamlined RFI creation, distribution, tracking, and response management
- **Email Integration**: Sophisticated email workflows with reply-by-email functionality
- **PDF Generation**: Professional RFI documents with construction industry styling

---

## 🏛️ Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS with construction-themed design system
- **Email**: Dual provider system (Mailgun primary, Brevo fallback, SMTP dev)
- **PDF Generation**: Puppeteer for high-quality document generation
- **Authentication**: JWT-based with bcrypt password hashing
- **File Storage**: Local filesystem with UUID-based naming
- **State Management**: SWR for client-side data fetching
- **Form Handling**: React Hook Form with Zod validation

### Project Structure
```
/root/Projects/RFIsys/
├── prisma/                      # Database schema and migrations
├── src/
│   ├── app/                     # Next.js App Router pages and API routes
│   │   ├── api/                 # REST API endpoints
│   │   ├── dashboard/           # Authenticated UI pages
│   │   ├── login/               # Authentication pages
│   │   └── layout.tsx           # Root layout with providers
│   ├── components/              # Reusable UI components
│   │   ├── ui/                  # Base UI components
│   │   ├── forms/               # Form components
│   │   ├── layout/              # Layout components
│   │   ├── admin/               # Admin-specific components
│   │   └── providers/           # React context providers
│   ├── hooks/                   # Custom React hooks for data fetching
│   ├── lib/                     # Utility libraries and configurations
│   └── types/                   # TypeScript type definitions
├── uploads/                     # File upload storage directory
├── docker-compose.yml           # Development environment setup
├── Dockerfile                   # Container build configuration
├── CloudronManifest.json        # Cloudron platform deployment manifest
├── DEPLOYMENT.md                # Deployment documentation
├── EMAIL_REPLY_SYSTEM.md        # Email system technical documentation
└── start.sh                     # Application startup script
```

---

## 🗄️ Database Schema

### Core Entities

#### Users (`users`)
- **Purpose**: Internal staff members who create and manage RFIs
- **Roles**: USER, MANAGER, ADMIN
- **Key Fields**: id, email, name, password (hashed), role, active
- **Relations**: Creates RFIs, writes responses, manages projects

#### Clients (`clients`)
- **Purpose**: External organizations/companies that receive RFIs
- **Key Fields**: name, contactName, email, phone, address, city, state, zipCode
- **Relations**: Has projects, receives RFIs, has contacts

#### Projects (`projects`)
- **Purpose**: Individual construction/industrial projects
- **Key Fields**: name, description, projectNumber, clientId, managerId, status
- **Relations**: Belongs to client, managed by user, contains RFIs, has stakeholders

#### RFIs (`rfis`) - Core Entity
- **Purpose**: Individual requests for information
- **Status Flow**: DRAFT → OPEN → CLOSED
- **Priority Levels**: LOW, MEDIUM, HIGH, URGENT
- **Direction**: OUTGOING (to clients), INCOMING (from clients)
- **Urgency**: ASAP, URGENT, NORMAL, LOW
- **Key Fields**: rfiNumber (auto-generated), title, description, suggestedSolution
- **Dates**: dateNeededBy, dateSent, dateReceived, reminderSent, dueDate
- **Relations**: Belongs to client/project, has responses, attachments, email logs

#### Responses (`responses`)
- **Purpose**: Answers/replies to RFIs from users or clients
- **Key Fields**: content, rfiId, authorId
- **Relations**: Belongs to RFI, authored by user

#### Attachments (`attachments`)
- **Purpose**: Files attached to RFIs (drawings, specs, photos)
- **Key Fields**: filename, storedName (UUID), url, size, mimeType
- **Security**: Files stored outside web root with safe naming

#### Contacts (`contacts`)
- **Purpose**: Individual contact persons within client companies
- **Key Fields**: name, email, phone, title, clientId
- **Relations**: Belongs to client, can be project stakeholders

#### Project Stakeholders (`project_stakeholders`)
- **Purpose**: Links contacts to specific projects for targeted communication
- **Key Fields**: projectId, contactId
- **Usage**: Determines who receives RFI notifications for each project

### Advanced Features
- **Email Logs**: Track all outbound emails with success/failure status
- **Email Queue**: Scheduled email delivery system
- **Email Usage**: Daily usage tracking for provider rate limits
- **Settings**: System-wide configuration storage

---

## 🔧 Development Commands

### Essential Commands
```bash
# Development server
npm run dev                    # Start Next.js development server on port 3000

# Database operations
npm run db:generate           # Generate Prisma client after schema changes
npm run db:push              # Push schema changes to database (development)
npm run db:migrate           # Create and run migrations (production-ready)
npm run db:seed              # Populate database with initial data

# Build and deployment
npm run build                # Build production application
npm run start                # Start production server
npm run lint                 # Run ESLint code quality checks

# Docker development environment
docker-compose up -d         # Start PostgreSQL, Redis, Mailhog, Adminer
docker-compose down          # Stop all services

# Cloudron deployment
./scripts/deploy-cloudron.sh  # Deploy latest GitHub image to Cloudron
cloudron update --image ghcr.io/viaviktor/rfisys:latest  # Direct deployment command
```

### Database Management
- **Adminer**: http://localhost:8080 (PostgreSQL GUI)
- **Mailhog**: http://localhost:8025 (Email testing interface)
- **Redis**: localhost:6379 (Caching/sessions)

---

## 🌍 Environment Configuration

### Required Environment Variables
```bash
# Database (Required)
DATABASE_URL="postgresql://username:password@localhost:5432/rfisys?schema=public"

# Authentication (Required)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### Email Provider Configuration
The system supports three email providers with automatic fallback:

#### Primary: Mailgun (Production Recommended)
```bash
EMAIL_PROVIDER="mailgun"
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="mg.yourdomain.com"
MAILGUN_REPLY_DOMAIN="mgrfi.steel-detailer.com"
MAILGUN_WEBHOOK_SIGNING_KEY="your-webhook-signing-key"
```

#### Secondary: Brevo (Free Tier Alternative)
```bash
BREVO_API_KEY="your-brevo-api-key"
BREVO_REPLY_DOMAIN="rfi.steel-detailer.com"
BREVO_WEBHOOK_SECRET="your-webhook-secret"
```

#### Development: SMTP/Mailhog
```bash
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_FROM="RFI System <noreply@localhost>"
```

---

## 🔌 API Architecture

### Authentication
- **Method**: JWT tokens in Authorization header or cookies
- **Endpoints**: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`
- **Middleware**: Automatic authentication validation in API routes

### REST API Structure
```
/api/
├── auth/                    # Authentication endpoints
├── users/                   # User management (admin only)
├── clients/                 # Client management
├── projects/                # Project management
├── rfis/                    # RFI CRUD operations
│   ├── [id]/               # Individual RFI operations
│   │   ├── responses/      # RFI responses
│   │   ├── attachments/    # File attachments
│   │   ├── email/          # Send RFI emails
│   │   └── pdf/            # Generate PDF
│   ├── email-reply/        # Email webhook endpoint
│   ├── reminders/          # Automated reminders
│   └── export-pdf/         # Bulk PDF export
├── contacts/               # Contact management
├── attachments/            # File download/serve
├── admin/                  # Admin-only endpoints
└── test/                   # Development testing endpoints
```

### Key API Patterns
- **Pagination**: `?page=1&limit=20` for list endpoints
- **Filtering**: `?status=OPEN&priority=HIGH` for search
- **Include Relations**: `?include=client,project,responses` for nested data
- **Error Handling**: Consistent JSON error responses with HTTP status codes

---

## 📧 Email System Architecture

### Email Reply-by-Email System
One of the most sophisticated features - allows clients to respond to RFIs directly via email.

#### Flow Overview
1. **RFI Created** → System generates unique reply-to email address
2. **Email Sent** → RFI notification sent with special reply-to address
3. **Client Replies** → Response goes to `rfi-{rfiId}-{token}@domain.com`
4. **Webhook Triggered** → Email provider forwards to `/api/rfis/email-reply`
5. **Response Processed** → System creates response record and processes attachments
6. **UI Updated** → Response appears in dashboard automatically

#### Security Features
- **HMAC Tokens**: Prevent unauthorized responses with cryptographic validation
- **Domain Validation**: Only configured domains can trigger webhooks
- **File Security**: Attachment scanning and safe storage
- **User Matching**: Email sender must match registered user/contact

#### Email Templates
- **Professional PDF-quality HTML templates** with construction industry styling
- **RFI Creation Notifications**: Full RFI details with response sections
- **Response Confirmations**: Formatted response notifications
- **Reminder Emails**: Due tomorrow and overdue alerts with escalating urgency
- **Text Fallbacks**: Plain text versions for all templates

### Email Providers & Failover
1. **Mailgun** (Primary): Production email delivery with webhook support
2. **Brevo** (Secondary): Free tier fallback with 300 emails/day limit
3. **SMTP** (Development): Local Mailhog for testing

---

## 🎨 UI/UX Design System

### Construction Industry Theme
- **Color Palette**: Steel grays, safety orange, construction blues
- **Typography**: Inter font family with construction-focused sizing
- **Components**: Heavy-duty styling with industrial aesthetics
- **Responsive**: Mobile-first design for field use

### Key Components
- **Dashboard Layout**: Sidebar navigation with role-based menu items
- **RFI Cards**: Comprehensive RFI display with status badges
- **Form Components**: Validated forms with error handling
- **Modal System**: Overlay dialogs for quick actions
- **Toast Notifications**: User feedback system
- **File Upload**: Drag-and-drop with progress indicators

### Styling Strategy
- **Tailwind CSS**: Utility-first approach with custom theme extension
- **Component Library**: Reusable UI components in `/src/components/ui/`
- **Responsive Design**: Mobile-optimized for field personnel
- **Accessibility**: WCAG compliance considerations

---

## 📊 Data Flow Patterns

### RFI Lifecycle
1. **Creation**: Internal user creates RFI (DRAFT status)
2. **Review**: Manager reviews and approves
3. **Distribution**: Email sent to project stakeholders (OPEN status)
4. **Response**: Client responds via email or dashboard
5. **Closure**: Internal user marks RFI as CLOSED
6. **Archive**: Historical record maintained

### User Roles & Permissions
- **USER**: Create/edit own RFIs, view assigned projects
- **MANAGER**: Manage projects, assign users, view all RFIs
- **ADMIN**: Full system access, user management, system configuration

### State Management
- **Server State**: SWR for API data caching and synchronization
- **Client State**: React hooks and context for UI state
- **Form State**: React Hook Form for complex form handling
- **Authentication**: JWT tokens with automatic refresh

---

## 🏗️ Deployment & Infrastructure

### Docker Development Environment
The `docker-compose.yml` provides a complete development stack:
- **PostgreSQL 15**: Primary database
- **Redis 7**: Caching and session storage
- **Mailhog**: Email testing interface
- **Adminer**: Database administration

### Production Deployment Considerations
- **Database**: PostgreSQL with connection pooling
- **File Storage**: Consider object storage (S3) for production scale
- **Email**: Mailgun for reliable delivery
- **Monitoring**: Application performance monitoring
- **Scaling**: Next.js supports serverless deployment
- **Security**: HTTPS, secure JWT secrets, database encryption

### Cloudron Compatibility
The application appears designed for self-hosted deployment, potentially via Cloudron platform based on the configuration patterns observed.

---

## 🔍 Key Features Deep Dive

### PDF Generation System
- **Puppeteer-based**: High-quality PDF generation with full HTML/CSS support
- **Professional Templates**: Construction industry formatting
- **Image Embedding**: Attachment images embedded directly in PDFs
- **Batch Export**: Multiple RFI PDF generation
- **Download/Email**: PDFs can be downloaded or emailed as attachments

### File Management
- **Secure Upload**: UUID-based file naming prevents conflicts
- **Type Validation**: Configurable allowed file types
- **Size Limits**: 10MB default limit (configurable)
- **Storage**: Local filesystem with plans for object storage
- **Serving**: Secure file serving through API endpoints

### Search & Filtering
- **Advanced Filters**: Status, priority, urgency, date ranges, text search
- **Sorting**: Multiple field sorting with direction control
- **Pagination**: Efficient large dataset handling
- **Real-time**: Live updates via SWR

### Automated Reminders
- **Cron Jobs**: Background task system for automated emails
- **Due Tomorrow**: Proactive notifications
- **Overdue Alerts**: Escalating reminder system
- **Stakeholder Targeting**: Project-specific recipient lists

---

## 🛠️ Development Patterns

### Code Organization
- **Modular Architecture**: Clear separation of concerns
- **TypeScript**: Full type safety throughout application
- **API-First**: RESTful API design with consistent patterns
- **Component-Driven**: Reusable UI component library
- **Hook-Based**: Custom hooks for data fetching and business logic

### Error Handling
- **Global Error Boundary**: React error boundary for UI crashes
- **API Error Responses**: Consistent JSON error format
- **Validation**: Zod schema validation for forms and API
- **Logging**: Structured logging for debugging
- **User Feedback**: Toast notifications for user actions

### Performance Optimizations
- **Next.js Features**: Image optimization, bundle splitting, SSR
- **Database Indexes**: Optimized queries with strategic indexing
- **Caching**: SWR client-side caching, potential Redis server-side
- **Lazy Loading**: Component and route-based code splitting

---

## 🚨 Security Considerations

### Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **Password Hashing**: bcrypt with salt rounds
- **Role-Based Access**: Granular permission system
- **Session Security**: Secure cookie handling

### Data Protection
- **Input Validation**: Zod schema validation
- **SQL Injection**: Prisma ORM protection
- **File Upload Security**: Type checking, size limits, safe storage
- **CSRF Protection**: Built into Next.js

### Email Security
- **Token Validation**: HMAC-based reply token security
- **Domain Verification**: Email webhook security
- **Rate Limiting**: Email usage tracking and limits

---

## 📈 Monitoring & Maintenance

### Logging
- **Application Logs**: Structured logging with configurable levels
- **Email Logs**: Complete email delivery tracking
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Database query and API response timing

### Maintenance Tasks
- **Database Migrations**: Version-controlled schema updates
- **File Cleanup**: Periodic cleanup of orphaned files
- **Email Usage**: Monitor provider limits and usage
- **Security Updates**: Regular dependency updates

---

## 🔧 Common Development Tasks

### Adding New Features
1. **Database**: Update Prisma schema, generate migration
2. **Types**: Add TypeScript types in `/src/types/`
3. **API**: Create API routes in `/src/app/api/`
4. **UI**: Build components in `/src/components/`
5. **Hooks**: Add data fetching hooks in `/src/hooks/`
6. **Pages**: Create/update pages in `/src/app/dashboard/`

### Debugging
- **Database**: Use Adminer at http://localhost:8080
- **Emails**: Use Mailhog at http://localhost:8025
- **API**: Check browser dev tools Network tab
- **Logs**: Check console output and log files
- **State**: Use React DevTools and SWR DevTools

### Testing
- **Manual Testing**: Use test endpoints in `/src/app/api/test/`
- **Email Testing**: Mailhog for development email testing
- **Database Testing**: Use seed data for consistent testing

---

## 📚 Additional Documentation

For specific implementation details, refer to:
- **EMAIL_REPLY_SYSTEM.md**: Complete email reply system documentation
- **Prisma Schema**: Database relationships and constraints
- **API Routes**: Individual endpoint documentation in route files
- **Component Documentation**: JSDoc comments in component files

---

## 🎯 Future Development Considerations

### Scalability
- **Database**: Consider read replicas for high-load scenarios
- **File Storage**: Migrate to object storage (S3, MinIO)
- **Email**: Implement queue system for bulk operations
- **Caching**: Redis implementation for improved performance

### Feature Enhancements
- **Real-time Updates**: WebSocket integration for live updates
- **Mobile App**: React Native companion app
- **Integration**: Third-party construction software integration
- **Analytics**: RFI performance and timeline analytics
- **Reporting**: Advanced reporting and dashboard features

---

*This documentation provides a comprehensive overview of the STEEL RFI System architecture, designed to help future Claude Code instances understand and work effectively with this codebase. The system is production-ready with sophisticated email workflows, professional PDF generation, and a robust construction industry-focused user experience.*