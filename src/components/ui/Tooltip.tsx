'use client'

import React, { useState, useRef } from 'react'

interface TooltipProps {
  content: string | React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export function Tooltip({ 
  content, 
  children, 
  position = 'top', 
  delay = 500,
  className = '' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    const id = setTimeout(() => setIsVisible(true), delay)
    setTimeoutId(id)
  }

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(null)
    }
    setIsVisible(false)
  }

  return (
    <div 
      className={`tooltip-container ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      ref={tooltipRef}
    >
      {children}
      {isVisible && (
        <div className={`tooltip tooltip-${position}`}>
          <div className="tooltip-content">
            {content}
          </div>
          <div className={`tooltip-arrow tooltip-arrow-${position}`} />
        </div>
      )}
    </div>
  )
}

// Specialized tooltip for RFI status information
interface StatusTooltipProps {
  status: string
  createdAt: string
  createdBy?: string
  dueDate?: string
  children: React.ReactNode
}

export function StatusTooltip({ 
  status, 
  createdAt, 
  createdBy, 
  dueDate, 
  children 
}: StatusTooltipProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const tooltipContent = (
    <div className="text-sm space-y-1">
      <div className="font-medium">Status: {status.replace('_', ' ')}</div>
      <div>Created: {formatDate(createdAt)}</div>
      {createdBy && <div>By: {createdBy}</div>}
      {dueDate && <div>Due: {formatDate(dueDate)}</div>}
    </div>
  )

  return (
    <Tooltip content={tooltipContent} position="top">
      {children}
    </Tooltip>
  )
}

// Time ago tooltip
interface TimeAgoTooltipProps {
  date: string
  children: React.ReactNode
}

export function TimeAgoTooltip({ date, children }: TimeAgoTooltipProps) {
  const fullDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <Tooltip content={fullDate} position="top">
      {children}
    </Tooltip>
  )
}