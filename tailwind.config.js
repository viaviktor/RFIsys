/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Construction-themed color palette
        steel: {
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#495057',
          700: '#343a40',
          800: '#212529',
          900: '#1a1d20',
        },
        orange: {
          50: '#fff8f1',
          100: '#feecdc',
          200: '#fcd9bd',
          300: '#fdba8c',
          400: '#ff8a4c',
          500: '#ff5722',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        safety: {
          yellow: '#ffd60a',
          orange: '#ff8500',
          red: '#d00000',
          green: '#2d6a4f',
        },
        construction: {
          concrete: '#8d99ae',
          rust: '#bc6c25',
          blueprint: '#023047',
          caution: '#ffb700',
          helmet: '#ffffff',
        },
        alert: {
          success: '#2d6a4f',
          warning: '#ffb700',
          error: '#d00000',
          info: '#023047',
        },
        status: {
          draft: '#6c757d',
          open: '#ffd60a',
          closed: '#2d6a4f',
          archived: '#495057',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'steel': '0 4px 6px -1px rgba(33, 37, 41, 0.1), 0 2px 4px -1px rgba(33, 37, 41, 0.06)',
        'steel-lg': '0 10px 15px -3px rgba(33, 37, 41, 0.1), 0 4px 6px -2px rgba(33, 37, 41, 0.05)',
        'construction': '0 8px 16px -4px rgba(188, 108, 37, 0.1), 0 4px 6px -1px rgba(188, 108, 37, 0.06)',
        'inset-steel': 'inset 0 2px 4px 0 rgba(33, 37, 41, 0.06)',
      },
      backgroundImage: {
        'gradient-construction': 'linear-gradient(135deg, #ff5722 0%, #ff8500 100%)',
        'gradient-steel': 'linear-gradient(135deg, #495057 0%, #212529 100%)',
        'gradient-blueprint': 'linear-gradient(135deg, #023047 0%, #219ebc 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}