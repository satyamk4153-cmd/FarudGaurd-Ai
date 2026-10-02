/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2f7f4',
          100: '#e2efe7',
          200: '#c5ded1',
          300: '#9ac4b1',
          400: '#69a38c',
          500: '#46856f',
          600: '#326956',
          700: '#275344',
          800: '#1b4332',
          900: '#163729',
          950: '#0c2017',
        },
        paper: {
          50: '#faf9f5',
          100: '#f4f3ed',
          200: '#e8e6df',
          300: '#dad7cb',
          400: '#b8b4a2',
          900: '#191c1d',
          950: '#111413',
        },
        brand: {
          50: '#f2f7f4',
          100: '#e2efe7',
          500: '#275344',
          600: '#1b4332',
          700: '#163729',
          800: '#0c2017',
          900: '#07140e',
        },
        risk: {
          low: '#1b4332',      // Forest
          medium: '#b45309',   // Warm Amber
          high: '#c2410c',     // Warm Rust/Orange
          critical: '#b91c1c', // Crimson
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
}
