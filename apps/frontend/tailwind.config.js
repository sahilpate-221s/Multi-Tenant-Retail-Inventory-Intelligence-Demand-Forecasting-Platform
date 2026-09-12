/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sp: {
          base: "#0c0c0e",
          elevated: "#141416",
          surface: "#1a1a1d",
          panel: "#212124",
          recessed: "#0a0a0c",
          accent: "#d4a853",
          "accent-dim": "#b8923e",
          "accent-bright": "#e8be66",
          lime: "#b8e636",
        },
        status: {
          danger: "#d45a4a",
          "danger-bg": "rgba(212, 90, 74, 0.08)",
          warning: "#d4a853",
          "warning-bg": "rgba(212, 168, 83, 0.08)",
          success: "#4aba7a",
          "success-bg": "rgba(74, 186, 122, 0.08)",
          info: "#6b8cc7",
          "info-bg": "rgba(107, 140, 199, 0.08)",
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
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
}
