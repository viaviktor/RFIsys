import React, { forwardRef } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="form-group">
        {label && (
          <label className="form-label">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`form-textarea ${error ? 'error' : ''} ${className}`.trim()}
          {...props}
        />
        {helperText && !error && (
          <p className="form-helper">{helperText}</p>
        )}
        {error && (
          <p className="form-error">{error}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'