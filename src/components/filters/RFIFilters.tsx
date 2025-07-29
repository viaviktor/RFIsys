import React, { useState, useEffect } from 'react'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { RFIFilters as RFIFiltersType, RFIStatus, Priority, RFIUrgency, RFIDirection } from '@/types'
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface RFIFiltersProps {
  filters: RFIFiltersType
  onFiltersChange: (filters: RFIFiltersType) => void
  onClearFilters: () => void
  className?: string
}

export function RFIFilters({ filters, onFiltersChange, onClearFilters, className }: RFIFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { clients } = useClients({ active: true })
  const { projects } = useProjects({ 
    clientId: filters.clientId, 
    active: true 
  })

  // Reset project when client changes
  useEffect(() => {
    if (filters.clientId && filters.projectId) {
      const projectBelongsToClient = projects.some(
        project => project.id === filters.projectId && project.clientId === filters.clientId
      )
      if (!projectBelongsToClient) {
        onFiltersChange({ ...filters, projectId: undefined })
      }
    }
  }, [filters.clientId, projects, filters.projectId, filters, onFiltersChange])

  const handleSingleFilterChange = (key: keyof RFIFiltersType, value: string | boolean | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    })
  }

  const handleArrayFilterChange = (key: keyof RFIFiltersType, value: string) => {
    const currentArray = (filters[key] as string[]) || []
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    
    onFiltersChange({
      ...filters,
      [key]: newArray.length> 0 ? newArray : undefined
    })
  }

  const hasActiveFilters = Object.keys(filters).some(key => 
    filters[key as keyof RFIFiltersType] !== undefined && 
    filters[key as keyof RFIFiltersType] !== ''
  )

  const availableProjects = projects.filter(project => 
    !filters.clientId || project.clientId === filters.clientId
  )

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-steel-600" />
            <h3 className="text-lg font-semibold text-steel-900">Filters</h3>
            {hasActiveFilters && (
              <span className="badge badge-primary">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                leftIcon={<XMarkIcon className="w-4 h-4" />}
            >
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
          >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="card-body space-y-4">
          {/* Search */}
          <div>
            <Input
              label="Search"
              placeholder="Search RFIs by title, description, or RFI number..."
              value={filters.search || ''}
              onChange={(e) => handleSingleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Client and Project */}
          <div>
            <Select
              label="Client"
              value={filters.clientId || ''}
              onChange={(e) => handleSingleFilterChange('clientId', e.target.value)}
          >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>

            <Select
              label="Project"
              value={filters.projectId || ''}
              onChange={(e) => handleSingleFilterChange('projectId', e.target.value)}
              disabled={!filters.clientId}
          >
              <option value="">
                {!filters.clientId ? 'Select a client first' : 'All Projects'}
              </option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectNumber} - {project.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Status Filters */}
          <div>
            <label>Status</label>
            <div>
              {(['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'] as RFIStatus[]).map((status) => (
                <label key={status}>
                  <input
                    type="checkbox"
                    
                    checked={(filters.status || []).includes(status)}
                    onChange={() => handleArrayFilterChange('status', status)}
                  />
                  <span>
                    {status.toLowerCase().replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filters */}
          <div>
            <label>Priority</label>
            <div>
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((priority) => (
                <label key={priority}>
                  <input
                    type="checkbox"
                    
                    checked={(filters.priority || []).includes(priority)}
                    onChange={() => handleArrayFilterChange('priority', priority)}
                  />
                  <span>
                    {priority.toLowerCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Urgency Filters */}
          <div>
            <label>Urgency</label>
            <div>
              {(['LOW', 'NORMAL', 'URGENT', 'ASAP'] as RFIUrgency[]).map((urgency) => (
                <label key={urgency}>
                  <input
                    type="checkbox"
                    
                    checked={(filters.urgency || []).includes(urgency)}
                    onChange={() => handleArrayFilterChange('urgency', urgency)}
                  />
                  <span>
                    {urgency.toLowerCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Direction */}
          <div>
            <label>Direction</label>
            <div>
              {(['OUTGOING', 'INCOMING'] as RFIDirection[]).map((direction) => (
                <label key={direction}>
                  <input
                    type="checkbox"
                    
                    checked={(filters.direction || []).includes(direction)}
                    onChange={() => handleArrayFilterChange('direction', direction)}
                  />
                  <span>
                    {direction === 'OUTGOING' ? 'Outgoing (To Client)' : 'Incoming (From Client)'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Filters */}
          <div>
            <Input
              type="date"
              label="Date From"
              value={filters.dateFrom || ''}
              onChange={(e) => handleSingleFilterChange('dateFrom', e.target.value)}
            />
            <Input
              type="date"
              label="Date To"
              value={filters.dateTo || ''}
              onChange={(e) => handleSingleFilterChange('dateTo', e.target.value)}
            />
          </div>

          {/* Special Filters */}
          <div>
            <label>
              <input
                type="checkbox"
                
                checked={filters.overdue || false}
                onChange={(e) => handleSingleFilterChange('overdue', e.target.checked)}
              />
              <span>
                Show only overdue RFIs
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}