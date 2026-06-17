import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/send-sms": {
        target: "https://api.semaphore.co",
        changeOrigin: true,
        rewrite: () => "/api/v4/messages",
      },
    },
  },
});
