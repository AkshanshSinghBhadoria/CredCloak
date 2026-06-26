import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cloak: {
          bg: '#0A0D14',
          panel: '#111827',
          elevated: '#1C2333',
          border: '#1F2937',
          text: '#F9FAFB',
          muted: '#9CA3AF',
          dim: '#6B7280',
          proof: '#6366F1',
          glow: '#818CF8',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        proof: '0 0 32px rgba(99, 102, 241, 0.28)',
      },
      keyframes: {
        shieldPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px rgba(129, 140, 248, 0.35))' },
          '50%': { filter: 'drop-shadow(0 0 18px rgba(129, 140, 248, 0.8))' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shield: 'shieldPulse 2.2s ease-in-out infinite',
        rise: 'rise 0.7s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
