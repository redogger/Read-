/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#020408',
          900: '#060d14',
          800: '#0a1520',
          700: '#0f1e2d',
          600: '#162639',
        },
        neon: {
          cyan: '#00f5ff',
          blue: '#0088ff',
          green: '#00ff88',
          amber: '#ffb300',
          red: '#ff3366',
          purple: '#9b5dff',
        },
        ghost: {
          100: '#e8f4f8',
          200: '#c5d8e4',
          300: '#8fa8ba',
          400: '#5a7a8f',
          500: '#3a5568',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Space Grotesk"', 'sans-serif'],
        ui: ['"DM Sans"', 'sans-serif'],
      },
      backgroundImage: {
        'grid-obsidian': `linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)`,
        'scanline': `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.08) 2px,
          rgba(0,0,0,0.08) 4px
        )`,
      },
      backgroundSize: {
        'grid-sm': '20px 20px',
        'grid-md': '40px 40px',
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0,245,255,0.3), 0 0 60px rgba(0,245,255,0.1)',
        'neon-green': '0 0 20px rgba(0,255,136,0.3), 0 0 60px rgba(0,255,136,0.1)',
        'neon-red': '0 0 20px rgba(255,51,102,0.4), 0 0 60px rgba(255,51,102,0.15)',
        'neon-amber': '0 0 20px rgba(255,179,0,0.3), 0 0 60px rgba(255,179,0,0.1)',
        'panel': '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        'deep': '0 20px 60px rgba(0,0,0,0.7)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'matrix-rain': 'matrixRain 20s linear infinite',
        'terminal-blink': 'blink 1s step-end infinite',
        'data-flow': 'dataFlow 2s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.4' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        dataFlow: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 -100px' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0,245,255,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(0,245,255,0.6), 0 0 60px rgba(0,245,255,0.2)' },
        },
      },
      borderRadius: {
        'panel': '2px',
      },
    },
  },
  plugins: [],
};
