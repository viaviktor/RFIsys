import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', ...props }, ref) => {
    const inputClasses = error ? 'input-error' : 'input'
    
    return (
      <div className="input-group">
        {label && (
          <label className="input-label">
            {label}
            {props.required && <span className="text-safety-red ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="input-icon-left">
              <span>{leftIcon}</span>
            </div>
          )}
          <input
            ref={ref}
            className={`${inputClasses} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${className}`.trim()}
            {...props}
          />
          {rightIcon && (
            <div className="input-icon-right">
              <span>{rightIcon}</span>
            </div>
          )}
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

Input.displayName = 'Input'