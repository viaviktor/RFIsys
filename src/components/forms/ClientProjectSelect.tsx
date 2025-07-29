import React, { useEffect, useMemo } from 'react'
import { Select } from '@/components/ui/Select'
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { Client, Project } from '@/types'

interface ClientProjectSelectProps {
  selectedClientId?: string
  selectedProjectId?: string
  onClientChange: (clientId: string) => void
  onProjectChange: (projectId: string) => void
  clientError?: string
  projectError?: string
  required?: boolean
  disabled?: boolean
}

export function ClientProjectSelect({
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange,
  clientError,
  projectError,
  required = false,
  disabled = false,
}: ClientProjectSelectProps) {
  const { clients, isLoading: clientsLoading } = useClients({ active: true })
  const { projects, isLoading: projectsLoading } = useProjects({ 
    clientId: selectedClientId,
    active: true 
  })


  // Reset project selection when client changes
  useEffect(() => {
    if (selectedClientId && selectedProjectId && !projectsLoading && projects.length> 0) {
      const projectBelongsToClient = projects.some(
        project => project.id === selectedProjectId && project.clientId === selectedClientId
      )
      if (!projectBelongsToClient) {
        onProjectChange('')
      }
    }
  }, [selectedClientId, projects, selectedProjectId, onProjectChange, projectsLoading])

  const availableProjects = useMemo(() => {
    if (!selectedClientId) return []
    return projects.filter(project => project.clientId === selectedClientId)
  }, [projects, selectedClientId])

  return (
    <div>
      <Select
        label="Client"
        required={required}
        error={clientError}
        disabled={disabled || clientsLoading}
        value={selectedClientId || ''}
        onChange={(e) => onClientChange(e.target.value)}
     >
        <option value="">
          {clientsLoading ? 'Loading clients...' : 'Select a client'}
        </option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </Select>

      <Select
        label="Project"
        required={required}
        error={projectError}
        disabled={disabled || projectsLoading || !selectedClientId}
        value={selectedProjectId || ''}
        onChange={(e) => onProjectChange(e.target.value)}
     >
        <option value="">
          {!selectedClientId 
            ? 'Select a client first'
            : projectsLoading 
            ? 'Loading projects...' 
            : availableProjects.length === 0
            ? 'No projects available'
            : 'Select a project'
          }
        </option>
        {availableProjects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.projectNumber} - {project.name}
          </option>
        ))}
      </Select>
    </div>
  )
}