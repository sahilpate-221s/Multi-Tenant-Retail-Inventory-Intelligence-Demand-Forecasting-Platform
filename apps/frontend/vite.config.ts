import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("three") || id.includes("@react-three")) {
              return "vendor-three";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("react-router-dom") || id.includes("react-dom") || id.includes("react/")) {
              return "vendor-react";
            }
            if (id.includes("@tanstack")) {
              return "vendor-query";
            }
          }
        },
      },
    },
  },
});

