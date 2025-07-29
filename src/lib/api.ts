import { RFI, Response, RFIFilters, RFISort, PaginatedResponse, ApiResponse, Client, Project, Contact, User, Role } from '@/types'

class ApiClient {
  private baseUrl = '/api'

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      // If it's a network error, provide more context
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(`Network error: Unable to connect to server at ${url}. Please check if the server is running.`)
      }
      throw error
    }
  }

  // RFI endpoints
  async getRFIs(
    page = 1,
    limit = 10,
    filters?: RFIFilters,
    sort?: RFISort
  ): Promise<PaginatedResponse<RFI>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    if (filters) {
      if (filters.status?.length) {
        // For now, if multiple statuses selected, use the first one
        // TODO: Update API to support multiple values
        params.append('status', filters.status[0])
      }
      if (filters.priority?.length) {
        params.append('priority', filters.priority[0])
      }
      if (filters.urgency?.length) {
        params.append('urgency', filters.urgency[0])
      }
      if (filters.direction?.length) {
        params.append('direction', filters.direction[0])
      }
      if (filters.search) {
        params.append('search', filters.search)
      }
      if (filters.createdById) {
        params.append('createdById', filters.createdById)
      }
      if (filters.clientId) {
        params.append('clientId', filters.clientId)
      }
      if (filters.projectId) {
        params.append('projectId', filters.projectId)
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom)
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo)
      }
      if (filters.overdue) {
        params.append('overdue', filters.overdue.toString())
      }
    }

    if (sort) {
      params.append('sortBy', sort.field)
      params.append('sortOrder', sort.direction)
    }

    return this.request<PaginatedResponse<RFI>>(`/rfis?${params.toString()}`)
  }

  async getRFI(id: string): Promise<RFI> {
    return this.request<RFI>(`/rfis/${id}`)
  }

  async createRFI(rfi: Omit<RFI, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'status' | 'rfiNumber' | 'client' | 'project' | 'createdBy' | 'responses' | 'attachments' | 'emailLogs' | '_count'>): Promise<RFI> {
    return this.request<RFI>('/rfis', {
      method: 'POST',
      body: JSON.stringify(rfi),
    })
  }

  async updateRFI(id: string, updates: Partial<RFI>): Promise<RFI> {
    return this.request<RFI>(`/rfis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteRFI(id: string): Promise<void> {
    await this.request(`/rfis/${id}`, {
      method: 'DELETE',
    })
  }

  // Response endpoints
  async getRFIResponses(rfiId: string, page = 1, limit = 20): Promise<PaginatedResponse<Response>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    return this.request<PaginatedResponse<Response>>(`/rfis/${rfiId}/responses?${params.toString()}`)
  }

  async createResponse(rfiId: string, content: string): Promise<Response> {
    return this.request<Response>(`/rfis/${rfiId}/responses`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  }

  // Client endpoints
  async getClients(
    page = 1,
    limit = 20,
    search?: string,
    active?: boolean
  ): Promise<PaginatedResponse<Client>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    if (search) params.append('search', search)
    if (active !== undefined) params.append('active', active.toString())

    return this.request<PaginatedResponse<Client>>(`/clients?${params.toString()}`)
  }

  async getClient(id: string): Promise<Client> {
    return this.request<Client>(`/clients/${id}`)
  }

  async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'projects' | 'rfis' | '_count'>): Promise<Client> {
    return this.request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    })
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    return this.request<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteClient(id: string): Promise<void> {
    await this.request(`/clients/${id}`, {
      method: 'DELETE',
    })
  }

  // Project endpoints
  async getProjects(
    page = 1,
    limit = 20,
    clientId?: string,
    status?: string,
    managerId?: string,
    search?: string,
    active?: boolean
  ): Promise<PaginatedResponse<Project>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    if (clientId) params.append('clientId', clientId)
    if (status) params.append('status', status)
    if (managerId) params.append('managerId', managerId)
    if (search) params.append('search', search)
    if (active !== undefined) params.append('active', active.toString())

    return this.request<PaginatedResponse<Project>>(`/projects?${params.toString()}`)
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`)
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'client' | 'manager' | 'rfis' | '_count'>): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    })
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, {
      method: 'DELETE',
    })
  }

  async archiveProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}/archive`, {
      method: 'POST',
    })
  }

  async unarchiveProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}/archive`, {
      method: 'DELETE',
    })
  }

  // Contact endpoints
  async getClientContacts(clientId: string, activeOnly = true): Promise<Contact[]> {
    const params = new URLSearchParams()
    if (activeOnly) params.append('active', 'true')

    const response = await this.request<{ data: Contact[] }>(`/clients/${clientId}/contacts?${params.toString()}`)
    return response.data
  }

  async getContact(id: string): Promise<Contact> {
    return this.request<Contact>(`/contacts/${id}`)
  }

  async createContact(clientId: string, contact: Omit<Contact, 'id' | 'clientId' | 'active' | 'createdAt' | 'updatedAt' | 'client'>): Promise<Contact> {
    return this.request<Contact>(`/clients/${clientId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(contact),
    })
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact> {
    return this.request<Contact>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteContact(id: string): Promise<void> {
    await this.request(`/contacts/${id}`, {
      method: 'DELETE',
    })
  }

  // Attachment endpoints
  async getAttachments(rfiId: string): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(`/rfis/${rfiId}/attachments`)
    return response.data
  }

  async uploadAttachment(rfiId: string, file: File, description?: string): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    if (description) {
      formData.append('description', description)
    }

    const response = await fetch(`${this.baseUrl}/rfis/${rfiId}/attachments`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }

    return data
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.request(`/attachments/${attachmentId}`, {
      method: 'DELETE',
    })
  }

  // PDF generation endpoints
  async generateRFIPDF(rfiId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/rfis/${rfiId}/pdf`, {
      credentials: 'include',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to generate PDF')
    }

    return response.blob()
  }

  async exportRFIsPDF(rfiIds: string[]): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/rfis/export-pdf`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rfiIds }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to export PDFs')
    }

    return response.blob()
  }

  // Export functionality
  async exportRFIs(filters?: RFIFilters, format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams({ format })

    if (filters) {
      if (filters.status?.length) {
        params.append('status', filters.status.join(','))
      }
      if (filters.priority?.length) {
        params.append('priority', filters.priority.join(','))
      }
      if (filters.search) {
        params.append('search', filters.search)
      }
    }

    const response = await fetch(`${this.baseUrl}/rfis/export?${params.toString()}`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Export failed')
    }

    return response.blob()
  }
}

export const apiClient = new ApiClient()

// Export the api object for compatibility
export const api = {
  get: <T>(endpoint: string) => apiClient.request<T>(endpoint),
  post: <T>(endpoint: string, data?: any) => apiClient.request<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),
  put: <T>(endpoint: string, data?: any) => apiClient.request<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }),
  delete: <T>(endpoint: string) => apiClient.request<T>(endpoint, {
    method: 'DELETE',
  }),
}

// Utility functions for common operations
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export const formatApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}