import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The browser only talks to this Vite server. Requests to /api and /health
// are forwarded to the FastAPI backend, so the Groq key never reaches React.
const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const proxy = {
  "/api": { target: backendUrl, changeOrigin: true },
  "/health": { target: backendUrl, changeOrigin: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy }, // npm run dev
  preview: { port: 4173, proxy }, // npm start (serves the production build)
});
