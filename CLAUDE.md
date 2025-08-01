# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# STEEL RFI System - Comprehensive Documentation for Claude Code

## 🏗️ System Overview

**STEEL RFI** is a comprehensive Request for Information (RFI) management system designed specifically for steel construction and industrial projects. It's a Next.js 15 application with PostgreSQL database, focused on managing communication between internal teams and external clients through structured RFI workflows.

### Key Characteristics
- **Industry Focus**: Heavy construction, steel detailing, and industrial projects
- **User Types**: Internal staff (USER, MANAGER, ADMIN) and external stakeholders (STAKEHOLDER_L1, STAKEHOLDER_L2)
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
- **PDF Generation**: jsPDF for lightweight, browser-free document generation
- **Authentication**: JWT-based with bcrypt password hashing, dual user system
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
│   │   ├── stakeholders/        # Stakeholder management components
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

#### Contacts (`contacts`) - Enhanced for Stakeholder System
- **Purpose**: External contact persons who can become stakeholders
- **Roles**: Can have STAKEHOLDER_L1 or STAKEHOLDER_L2 when registered
- **Key Fields**: id, name, email, phone, title, clientId, password (nullable), role (nullable), registrationEligible
- **Authentication**: Can authenticate when password is set
- **Relations**: Belongs to client, can be project stakeholders

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

#### Project Stakeholders (`project_stakeholders`)
- **Purpose**: Links contacts to specific projects with permission levels
- **Key Fields**: projectId, contactId, stakeholderLevel (1 or 2), addedById, addedByContactId
- **Relations**: Links contacts to projects they can access

#### Registration Tokens (`registration_tokens`)
- **Purpose**: Secure stakeholder onboarding
- **Key Fields**: token, email, contactId, role, expiresAt
- **Usage**: Sent in emails to allow contacts to self-register

#### Access Requests (`access_requests`)
- **Purpose**: Allow stakeholders to request access to projects
- **Key Fields**: contactId, projectId, status, requestedRole
- **Auto-approval**: Domain matching triggers automatic approval

### Advanced Features
- **Email Logs**: Track all outbound emails with success/failure status
- **Email Queue**: Scheduled email delivery system
- **Email Usage**: Daily usage tracking for provider rate limits
- **Settings**: System-wide configuration storage

---

## 👥 User System Architecture

### Dual Authentication System

The system supports two distinct user types with separate authentication flows:

#### 1. Internal Users (`users` table)
- **Roles**: USER, MANAGER, ADMIN
- **Capabilities**: Full system access based on role
- **Authentication**: Email/password via `/api/auth/login`
- **Access**: Can view all clients, projects, and RFIs
- **Creation**: Admin creates accounts directly

#### 2. External Stakeholders (`contacts` table with password)
- **Roles**: STAKEHOLDER_L1 (client admins), STAKEHOLDER_L2 (sub-contractors)
- **Capabilities**: Project-scoped access only
- **Authentication**: Email/password via same login endpoint
- **Access**: Only see assigned projects and related RFIs
- **Creation**: Self-register via invitation token or request access

### Authentication Flow
```typescript
// JWT payload structure
{
  userId: string,
  email: string,
  role: Role,
  userType: 'internal' | 'stakeholder',
  contactId?: string,  // Only for stakeholders
  projectAccess?: string[]  // Array of project IDs for stakeholders
}
```

### Permission System
- **Internal Users**: Role-based permissions (USER < MANAGER < ADMIN)
- **Stakeholders**: Project-scoped permissions via `projectAccess` array
- **API Protection**: All endpoints check `hasProjectAccess()` for stakeholders
- **Data Filtering**: Automatic filtering based on user type and project access

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
./scripts/deploy-cloudron.sh  # Deploy using commit-specific tags (RECOMMENDED)
cloudron update --image ghcr.io/viaviktor/rfisys:latest  # Use only if commit-specific fails
```

### Database Management
- **Adminer**: http://localhost:8080 (PostgreSQL GUI)
- **Mailhog**: http://localhost:8025 (Email testing interface)
- **Redis**: localhost:6379 (Caching/sessions)

---

## 🌍 Environment Configuration

### Required Environment Variables
```bash
# Database (Required) - Must match docker-compose.yml
DATABASE_URL="postgresql://rfi_user:rfi_dev_password@localhost:5432/rfi_development?schema=public"

# Authentication (Required)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Registration Control
ALLOW_PUBLIC_REGISTRATION="false"  # Keep false for security

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
MAILGUN_DOMAIN="mgrfi.steel-detailer.com"
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
- **Dual System**: Checks both `users` and `contacts` tables

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
├── stakeholders/           # Stakeholder management
├── invitations/            # Invitation system
├── access-requests/        # Access request system
├── uploads/                # File serving endpoints (CRITICAL: ensure not blocked by .gitignore)
├── attachments/            # File download/serve
├── admin/                  # Admin-only endpoints
└── test/                   # Development testing endpoints
```

### Key API Patterns
- **Pagination**: `?page=1&limit=20` for list endpoints
- **Filtering**: `?status=OPEN&priority=HIGH` for search
- **Include Relations**: `?include=client,project,responses` for nested data
- **Error Handling**: Consistent JSON error responses with HTTP status codes
- **Permission Checking**: All endpoints validate access based on user type

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

#### Email Templates with Registration Support
- **RFI Notifications**: Include "Create Your Account" button for unregistered contacts
- **Registration Tokens**: 30-day expiry, auto-approve stakeholder registration
- **Access Request Links**: Forwarded emails include "Request Access" links
- **Professional Templates**: Construction industry styling with PDF-quality HTML

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
- **Entity Cards**: Interconnected cards for clients, projects, RFIs, users, contacts
- **Entity Links**: Clickable navigation between related entities

### Role-Based Dashboards
- **Admin/Manager/User**: Full dashboard with all features
- **Stakeholder L1**: Project-focused view with invitation capabilities
- **Stakeholder L2**: Limited view of assigned projects only

---

## 📊 Data Flow Patterns

### RFI Lifecycle
1. **Creation**: Internal user creates RFI (DRAFT status)
2. **Review**: Manager reviews and approves
3. **Distribution**: Email sent to project stakeholders (OPEN status)
4. **Response**: Client responds via email or dashboard
5. **Closure**: Internal user marks RFI as CLOSED
6. **Archive**: Historical record maintained

### Stakeholder Registration Flow
1. **Contact Added**: Admin adds contact to client
2. **RFI Sent**: Contact receives RFI email with registration link
3. **Token Created**: 30-day registration token generated
4. **Registration**: Contact clicks link, creates password
5. **Auto-Approval**: Becomes STAKEHOLDER_L1 automatically
6. **Access Granted**: Can view/respond to project RFIs

### Access Request Flow
1. **Forwarded Email**: Non-stakeholder receives forwarded RFI
2. **Request Access**: Clicks "Request Access" link
3. **Domain Check**: System checks if email domain matches existing stakeholders
4. **Auto-Approval**: If domain matches, access granted automatically
5. **Manual Review**: If no match, admin reviews request

---

## 🏗️ Deployment & Infrastructure

### Docker Development Environment
The `docker-compose.yml` provides a complete development stack:
- **PostgreSQL 15**: Primary database with correct credentials
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
The application is designed for self-hosted deployment via Cloudron platform.

---

## 🔍 Key Features Deep Dive

### Stakeholder Management System
- **Hierarchical Roles**: L1 stakeholders (clients) and L2 stakeholders (sub-contractors)
- **Project Scoping**: Stakeholders only see assigned projects
- **Invitation System**: L1 can invite L2 (limited by schema constraints)
- **Auto-Registration**: Email recipients can self-register
- **Domain Trust**: Automatic approval for matching email domains

### PDF Generation System
- **jsPDF-based**: Lightweight, browser-free PDF generation
- **Professional Templates**: Construction industry formatting
- **Two-column Design**: Efficient space utilization
- **Response Sections**: Pre-formatted response areas
- **Batch Export**: Multiple RFI PDF generation

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
- **Project Filtering**: Automatic for stakeholders

---

## 🛠️ Development Patterns

### Code Organization
- **Modular Architecture**: Clear separation of concerns
- **TypeScript**: Full type safety throughout application
- **API-First**: RESTful API design with consistent patterns
- **Component-Driven**: Reusable UI component library
- **Hook-Based**: Custom hooks for data fetching and business logic

### API Route Pattern (Next.js 15)
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await authenticateRequest(request)
  
  // Check permissions for stakeholders
  if (user.userType === 'stakeholder') {
    if (!await hasProjectAccess(user, resource.projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }
  
  // ... rest of handler
}
```

### Error Handling
- **Global Error Boundary**: React error boundary for UI crashes
- **API Error Responses**: Consistent JSON error format
- **Validation**: Zod schema validation for forms and API
- **Logging**: Structured logging for debugging
- **User Feedback**: Toast notifications for user actions

---

## 🚨 Critical Development Notes

### File Upload System Architecture
The file upload/serving system has a specific architecture that must be maintained:

**Upload Flow**:
1. Files uploaded via `/api/rfis/[id]/attachments` (POST)
2. Files stored in `UPLOAD_DIR` with UUID-based names
3. Database records created with URL format: `/api/uploads/{storedName}`
4. Files served via `/api/uploads/[filename]` (GET) - **NO AUTHENTICATION REQUIRED**

**CRITICAL .gitignore Configuration**:
```bash
# CORRECT - Only ignore upload directory, not API routes
/uploads/

# WRONG - Would block API routes from deployment
uploads/
```

### Database Connection Configuration
**Always ensure .env matches docker-compose.yml**:
```bash
# Correct credentials from docker-compose.yml
DATABASE_URL="postgresql://rfi_user:rfi_dev_password@localhost:5432/rfi_development?schema=public"
```

### Email Reply System Configuration
The email reply-by-email system requires specific configuration:

**Working Configuration**:
- **Domain**: Use same domain for sending and receiving
- **Mailgun Route**: Catch-all pattern (`*`) forwarding to webhook
- **Webhook**: `/api/email/mailgun-webhook-simple` (production-ready)
- **Signing Key**: Account-wide webhook signing key (32-char hex)

---

## 🔧 Common Development Tasks

### After Schema Changes
```bash
npm run db:generate          # Update Prisma client
npm run db:push             # Apply changes to database
```

### Adding New Features
1. **Database**: Update Prisma schema, generate migration
2. **Types**: Add TypeScript types in `/src/types/`
3. **API**: Create API routes in `/src/app/api/`
4. **UI**: Build components in `/src/components/`
5. **Hooks**: Add data fetching hooks in `/src/hooks/`
6. **Pages**: Create/update pages in `/src/app/dashboard/`

### Testing Stakeholder Features
1. **Create Contact**: Add contact to a client
2. **Send RFI**: Email will include registration link
3. **Register**: Click link in email to create account
4. **Login**: Use same login page as internal users
5. **View Dashboard**: See project-specific stakeholder view

### Debugging Authentication
- Check `userType` in JWT payload
- Verify `projectAccess` array for stakeholders
- Use `/api/auth/me` to inspect current user
- Check browser DevTools > Application > Cookies

---

## 📚 Additional Resources

### Related Documentation
- **EMAIL_REPLY_SYSTEM.md**: Complete email reply system documentation
- **DEPLOYMENT.md**: Deployment instructions
- **Prisma Schema**: Database relationships and constraints
- **API Routes**: Individual endpoint documentation in route files

### Recent Major Changes (Stakeholder System - 2025)

The system underwent significant architectural changes to support external stakeholders:

1. **Dual User System**: 
   - Separated internal users from external stakeholders
   - JWT tokens now include `userType` field
   - Authentication checks both `users` and `contacts` tables

2. **Role Hierarchy**: 
   - Added STAKEHOLDER_L1 (direct clients) and STAKEHOLDER_L2 (sub-contractors)
   - L1 can invite L2 (limited by schema constraints)

3. **Project Scoping**: 
   - Stakeholders only see assigned projects
   - All API endpoints filter data based on `projectAccess`
   - Permission system in `/src/lib/permissions.ts`

4. **Auto-Registration**: 
   - Contacts receive registration links in RFI emails
   - 30-day token expiry
   - Automatic approval as STAKEHOLDER_L1

5. **Access Requests**: 
   - Domain-based auto-approval system
   - Manual approval workflow for unknown domains
   - Accessible via forwarded email links

6. **UI Enhancements**:
   - Separate dashboards for different user types
   - Interconnected entity cards and links
   - Role-based navigation menus
   - Stakeholder management interfaces

**Note**: L1 stakeholder inviting L2 is currently limited to internal users due to the `project_stakeholders.addedById` foreign key referencing the `users` table rather than supporting both users and contacts.

---

*This documentation provides a comprehensive overview of the STEEL RFI System architecture, designed to help future Claude Code instances understand and work effectively with this codebase. The system is production-ready with sophisticated email workflows, professional PDF generation, a robust stakeholder management system, and a construction industry-focused user experience.*