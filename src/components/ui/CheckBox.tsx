'use client'

import { forwardRef } from 'react'
import { CheckIcon, MinusIcon } from '@heroicons/react/24/solid'

export interface CheckBoxProps {
  checked?: boolean
  indeterminate?: boolean
  onChange?: (checked: boolean) => void
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
  description?: string
}

export const CheckBox = forwardRef<HTMLInputElement, CheckBoxProps>(({
  checked = false,
  indeterminate = false,
  onChange,
  onClick,
  disabled = false,
  className = "",
  size = 'md',
  label,
  description
}, ref) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  }

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (onClick) {
      onClick(e)
    }
    
    // Trigger onChange when the visual div is clicked
    if (onChange && !disabled) {
      onChange(!checked)
    }
  }

  const checkboxElement = (
    <div className="relative">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
      <div
        className={`
          ${sizeClasses[size]}
          border-2 rounded transition-all duration-200 flex items-center justify-center
          ${checked || indeterminate
            ? 'bg-orange-500 border-orange-500 text-white'
            : 'bg-white border-steel-300 hover:border-steel-400'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer'
          }
          ${className}
        `}
        onClick={handleClick}
      >
        {checked && <CheckIcon className={iconSizeClasses[size]} />}
        {indeterminate && <MinusIcon className={iconSizeClasses[size]} />}
      </div>
    </div>
  )

  if (label || description) {
    return (
      <label className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        {checkboxElement}
        <div className="flex-1">
          {label && (
            <div className={`text-sm font-medium text-steel-900 ${disabled ? 'opacity-50' : ''}`}>
              {label}
            </div>
          )}
          {description && (
            <div className={`text-xs text-steel-500 ${disabled ? 'opacity-50' : ''}`}>
              {description}
            </div>
          )}
        </div>
      </label>
    )
  }

  return checkboxElement
})