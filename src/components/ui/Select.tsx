import React, { forwardRef, SelectHTMLAttributes } from 'react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  children: React.ReactNode
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, required, children, className = '', ...props }, ref) => {
    const selectClasses = error ? 'select-error' : 'select'
    
    return (
      <div className="input-group">
        {label && (
          <label className="input-label">
            {label}
            {required && <span className="text-safety-red ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`${selectClasses} ${className}`}
            {...props}
         >
            {children}
          </select>
          <div className="select-chevron">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="input-error-text">
            <span>⚠</span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="input-helper-text">{helperText}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }