// Database types based on Prisma schema
export type Role = 'USER' | 'MANAGER' | 'ADMIN' | 'STAKEHOLDER_L1' | 'STAKEHOLDER_L2'
export type RFIStatus = 'DRAFT' | 'OPEN' | 'CLOSED'
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED' | 'ARCHIVED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type RFIDirection = 'OUTGOING' | 'INCOMING'
export type RFIUrgency = 'ASAP' | 'URGENT' | 'NORMAL' | 'LOW'
export type UserType = 'internal' | 'stakeholder'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
  userType?: UserType
  contactId?: string | null
  projectAccess?: string[]
  _count?: {
    rfisCreated: number
    responses: number
    projects: number
  }
}

export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  title?: string
  clientId: string
  active: boolean
  createdAt: string
  updatedAt: string
  password?: string | null
  role?: Role
  registrationEligible?: boolean
  client?: Client
  projectStakeholders?: ProjectStakeholder[]
}

export interface Client {
  id: string
  name: string
  contactName: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country: string
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
  projects?: Project[]
  rfis?: RFI[]
  contacts?: Contact[]
  _count?: {
    projects: number
    rfis: number
    contacts: number
  }
}

export interface Project {
  id: string
  name: string
  description?: string
  projectNumber?: string
  clientId: string
  managerId?: string
  startDate?: string
  endDate?: string
  status: ProjectStatus
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
  client?: Client
  manager?: User
  rfis?: RFI[]
  stakeholders?: ProjectStakeholder[]
  _count?: {
    rfis: number
    stakeholders: number
  }
}

export interface RFI {
  id: string
  rfiNumber: string
  title: string
  description: string
  suggestedSolution?: string
  status: RFIStatus
  priority: Priority
  direction: RFIDirection
  urgency: RFIUrgency
  dateNeededBy?: string
  dateSent?: string
  dateReceived?: string
  reminderSent?: string
  dueDate?: string
  clientId: string
  projectId: string
  createdById: string
  respondedById?: string
  createdAt: string
  updatedAt: string
  client?: Client
  project?: Project
  createdBy?: User
  responses?: Response[]
  attachments?: Attachment[]
  emailLogs?: EmailLog[]
  _count?: {
    responses: number
    attachments: number
  }
}

export interface Response {
  id: string
  content: string
  rfiId: string
  authorId?: string
  authorContactId?: string
  createdAt: string
  updatedAt: string
  author?: User
  authorContact?: Contact
  rfi?: RFI
}

export interface Attachment {
  id: string
  filename: string
  storedName: string
  url: string
  size: number
  mimeType: string
  description?: string
  rfiId: string
  uploadedBy: string
  createdAt: string
  rfi?: RFI
}

export interface EmailLog {
  id: string
  rfiId: string
  recipientEmail: string
  recipientName?: string
  subject: string
  body?: string
  attachments?: string
  sentAt: string
  success: boolean
  errorMessage?: string
  emailType: string
  rfi?: RFI
}

export interface ProjectStakeholder {
  id: string
  projectId: string
  contactId: string
  stakeholderLevel: number
  addedById?: string | null
  addedByContactId?: string | null
  autoApproved: boolean
  createdAt: string
  project?: Project
  contact?: Contact
  addedByUser?: User
  addedByContact?: Contact
}

// API Response types
export interface AuthResponse {
  user: User
  token: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface LoginForm {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface RFIForm {
  title: string
  description: string
  suggestedSolution?: string
  priority: Priority
  urgency?: RFIUrgency
  direction?: RFIDirection
  dateNeededBy?: string
  dueDate?: string
  clientId: string
  projectId: string
}

export interface ClientForm {
  name: string
  contactName: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  notes?: string
}

export interface ProjectForm {
  name: string
  description?: string
  projectNumber?: string
  clientId: string
  managerId?: string
  startDate?: string
  endDate?: string
  notes?: string
}

export interface ResponseForm {
  content: string
}

// Filter and search types
export interface RFIFilters {
  status?: RFIStatus[]
  priority?: Priority[]
  urgency?: RFIUrgency[]
  direction?: RFIDirection[]
  search?: string
  createdById?: string
  clientId?: string
  projectId?: string
  dateFrom?: string
  dateTo?: string
  overdue?: boolean
}

export interface RFISort {
  field: 'createdAt' | 'updatedAt' | 'dueDate' | 'title' | 'priority' | 'status'
  direction: 'asc' | 'desc'
}

// UI State types
export interface LoadingState {
  isLoading: boolean
  error?: string
}

export interface AuthState extends LoadingState {
  user?: User
  isAuthenticated: boolean
}

// Utility types
export type CreateRFI = Omit<RFI, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'createdBy' | 'responses' | 'attachments' | '_count'>
export type UpdateRFI = Partial<CreateRFI>
export type CreateResponse = Omit<Response, 'id' | 'createdAt' | 'updatedAt' | 'authorId' | 'author' | 'rfi'>

// Component prop types
export interface RFICardProps {
  rfi: RFI
  onClick?: (rfi: RFI) => void
  showActions?: boolean
}

export interface StatusBadgeProps {
  status: RFIStatus
  size?: 'sm' | 'md' | 'lg'
}

export interface PriorityBadgeProps {
  priority: Priority
  size?: 'sm' | 'md' | 'lg'
}

export interface UserAvatarProps {
  user: User
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}

// Constants
export const RFI_STATUS_COLORS: Record<RFIStatus, string> = {
  DRAFT: 'badge-secondary',
  OPEN: 'badge-primary',
  CLOSED: 'badge-success',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'badge-secondary',
  MEDIUM: 'badge-primary',
  HIGH: 'badge-warning',
  URGENT: 'badge-danger',
}

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'User',
  MANAGER: 'Manager',
  ADMIN: 'Administrator',
  STAKEHOLDER_L1: 'Level 1 Stakeholder',
  STAKEHOLDER_L2: 'Level 2 Stakeholder',
}

export const STATUS_LABELS: Record<RFIStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  CLOSED: 'Closed',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

