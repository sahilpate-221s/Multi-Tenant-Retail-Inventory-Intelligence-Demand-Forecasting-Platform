/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        status: {
          danger: "#dc2626",
          "danger-bg": "#fef2f2",
          warning: "#d97706",
          "warning-bg": "#fffbeb",
          success: "#16a34a",
          "success-bg": "#f0fdf4",
          info: "#2563eb",
          "info-bg": "#eff6ff",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
}
