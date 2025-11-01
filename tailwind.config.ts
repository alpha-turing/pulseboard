import type { Config } from 'tailwindcss'
import { designTokens } from './src/lib/design-tokens'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        
        // Brand colors
        brand: designTokens.colors.brand,
        
        // Primary (keeping for compatibility)
        primary: designTokens.colors.brand.primary,
        
        // Semantic colors
        success: designTokens.colors.success,
        danger: designTokens.colors.danger,
        warning: designTokens.colors.warning,
        info: designTokens.colors.info,
        
        // Financial specific
        gain: designTokens.colors.gain,
        loss: designTokens.colors.loss,
        neutral: designTokens.colors.neutral,
        
        // Gray scale
        gray: designTokens.colors.gray,
      },
      
      fontFamily: {
        sans: designTokens.typography.fontFamily.sans,
        display: designTokens.typography.fontFamily.display,
        mono: designTokens.typography.fontFamily.mono,
      },
      
      fontSize: designTokens.typography.fontSize,
      
      spacing: designTokens.spacing,
      
      borderRadius: designTokens.borderRadius,
      
      boxShadow: designTokens.shadows,
      
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      transitionDuration: designTokens.animations.duration,
      
      transitionTimingFunction: designTokens.animations.easing,
      
      // Z-index scale
      zIndex: {
        base: '0',
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modalBackdrop: '1040',
        modal: '1050',
        popover: '1060',
        tooltip: '1070',
        notification: '1080',
      },
      
      maxWidth: designTokens.containers,
      
      // Custom utilities
      minHeight: {
        touch: designTokens.touchTarget.minHeight,
      },
      
      minWidth: {
        touch: designTokens.touchTarget.minWidth,
      },
      
      // Backdrop blur for glass morphism
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
}
export default config
