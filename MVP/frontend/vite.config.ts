import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173,
      overlay: mode === "development",
    },
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: mode === "development",
    minify: mode === "production" ? "esbuild" : false,
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          clerk: ["@clerk/clerk-react"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
}));