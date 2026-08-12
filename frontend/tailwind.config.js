/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1d23',
          card: '#22262e',
          elevated: '#2a2e38',
          border: '#343842',
        },
        accent: {
          blue: '#3b82f6',
          green: '#10b981',
          orange: '#f59e0b',
          red: '#ef4444',
          purple: '#8b5cf6',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
      },
    },
  },
  plugins: [],
};
