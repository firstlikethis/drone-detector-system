/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors for drone threat levels
        'threat-none': '#3388ff',
        'threat-low': '#33cc33',
        'threat-medium': '#ffcc00',
        'threat-high': '#ff6600',
        'threat-critical': '#ff0000',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      height: {
        'screen-90': '90vh',
      },
    },
  },
  plugins: [],
}