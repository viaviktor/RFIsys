'use client'

import { useState, useEffect } from 'react'
import { CheckBox } from '@/components/ui/CheckBox'
import { Button } from '@/components/ui/Button'
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  EllipsisHorizontalIcon 
} from '@heroicons/react/24/outline'

export interface Column<T = any> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  className?: string
  render?: (item: T, index: number) => React.ReactNode
}

export interface CompactTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  selectedItems?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  getItemId?: (item: T) => string
  onItemClick?: (item: T) => void
  isLoading?: boolean
  emptyMessage?: string
  showSelectAll?: boolean
  className?: string
  rowClassName?: (item: T, index: number) => string
  enableHover?: boolean
}

export function CompactTable<T = any>({
  data,
  columns,
  selectedItems = [],
  onSelectionChange,
  onSort,
  sortKey,
  sortDirection,
  getItemId = (item: any) => item.id,
  onItemClick,
  isLoading = false,
  emptyMessage = "No items found",
  showSelectAll = true,
  className = "",
  rowClassName,
  enableHover = true
}: CompactTableProps<T>) {
  const [localSelectedItems, setLocalSelectedItems] = useState<string[]>(selectedItems)

  useEffect(() => {
    setLocalSelectedItems(selectedItems)
  }, [selectedItems])

  const handleSelectAll = () => {
    const allIds = data.map(getItemId)
    const newSelection = localSelectedItems.length === data.length ? [] : allIds
    setLocalSelectedItems(newSelection)
    onSelectionChange?.(newSelection)
  }

  const handleSelectItem = (id: string) => {
    const newSelection = localSelectedItems.includes(id)
      ? localSelectedItems.filter(selectedId => selectedId !== id)
      : [...localSelectedItems, id]
    setLocalSelectedItems(newSelection)
    onSelectionChange?.(newSelection)
  }

  const handleSort = (key: string) => {
    if (!onSort) return
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(key, newDirection)
  }

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return null
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4" />
      : <ChevronDownIcon className="w-4 h-4" />
  }

  if (isLoading) {
    return (
      <div className={`border border-steel-200 rounded-lg overflow-hidden ${className}`}>
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="bg-steel-50 border-b border-steel-200 px-6 py-3">
            <div className="flex items-center gap-4">
              {showSelectAll && onSelectionChange && (
                <div className="w-4 h-4 bg-steel-200 rounded"></div>
              )}
              {columns.map((column, index) => (
                <div key={index} className="h-4 bg-steel-200 rounded flex-1"></div>
              ))}
            </div>
          </div>
          {/* Rows skeleton */}
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="border-b border-steel-100 px-6 py-4">
              <div className="flex items-center gap-4">
                {showSelectAll && onSelectionChange && (
                  <div className="w-4 h-4 bg-steel-100 rounded"></div>
                )}
                {columns.map((column, colIndex) => (
                  <div key={colIndex} className="h-4 bg-steel-100 rounded flex-1"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={`border border-steel-200 rounded-lg overflow-hidden ${className}`}>
        <div className="bg-steel-50 border-b border-steel-200 px-6 py-3">
          <div className="flex items-center gap-4">
            {showSelectAll && onSelectionChange && (
              <div className="w-4"></div>
            )}
            {columns.map((column) => (
              <div 
                key={column.key} 
                className={`text-xs font-medium text-steel-500 uppercase tracking-wider ${column.className || 'flex-1'}`}
                style={{ width: column.width }}
              >
                {column.label}
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-12 text-center">
          <div className="text-steel-400 mb-2">
            <EllipsisHorizontalIcon className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-steel-500 text-sm">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`border border-steel-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-steel-50 border-b border-steel-200 px-6 py-3">
        <div className="flex items-center gap-4">
          {showSelectAll && onSelectionChange && (
            <CheckBox
              checked={localSelectedItems.length === data.length && data.length > 0}
              indeterminate={localSelectedItems.length > 0 && localSelectedItems.length < data.length}
              onChange={handleSelectAll}
              className="shrink-0"
            />
          )}
          {columns.map((column) => (
            <div 
              key={column.key} 
              className={`text-xs font-medium text-steel-500 uppercase tracking-wider ${
                column.sortable ? 'cursor-pointer hover:text-steel-700 flex items-center gap-1' : ''
              } ${column.className || 'flex-1'}`}
              style={{ width: column.width }}
              onClick={column.sortable ? () => handleSort(column.key) : undefined}
            >
              {column.label}
              {column.sortable && getSortIcon(column.key)}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-steel-100">
        {data.map((item, index) => {
          const itemId = getItemId(item)
          const isSelected = localSelectedItems.includes(itemId)
          const baseRowClass = `px-6 py-3 transition-colors ${
            enableHover ? 'hover:bg-steel-25' : ''
          } ${isSelected ? 'bg-orange-25 border-l-2 border-l-orange-500' : ''} ${
            onItemClick ? 'cursor-pointer' : ''
          }`
          const finalRowClass = rowClassName ? `${baseRowClass} ${rowClassName(item, index)}` : baseRowClass

          return (
            <div 
              key={itemId} 
              className={finalRowClass}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
            >
              <div className="flex items-center gap-4">
                {showSelectAll && onSelectionChange && (
                  <CheckBox
                    checked={isSelected}
                    onChange={() => handleSelectItem(itemId)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                )}
                {columns.map((column) => (
                  <div 
                    key={column.key} 
                    className={`text-sm ${column.className || 'flex-1'}`}
                    style={{ width: column.width }}
                  >
                    {column.render ? column.render(item, index) : (item as any)[column.key]}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Utility component for common table patterns
export function TableCell({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`text-sm text-steel-900 ${className}`}>
      {children}
    </div>
  )
}

export function TableSecondaryText({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`text-xs text-steel-500 ${className}`}>
      {children}
    </div>
  )
}