import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "chat-api-dev",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith("/api/chat")) {
              next();
              return;
            }

            if (req.method === "OPTIONS") {
              res.statusCode = 204;
              res.end();
              return;
            }

            if (req.method !== "POST") {
              res.statusCode = 405;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            try {
              const raw = await readBody(req);
              const body = raw ? JSON.parse(raw) : {};
              const { handleChatRequest } = await import("./api/chat.js");
              const result = await handleChatRequest(body, { ...process.env, ...env });
              res.setHeader("Content-Type", "application/json");
              if (!result.ok) {
                res.statusCode = result.error?.includes("not configured") ? 503 : 400;
                res.end(JSON.stringify({ error: result.error }));
                return;
              }
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err) {
              console.error("Chat API dev error:", err);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Chat service unavailable" }));
            }
          });
        },
      },
    ],
    server: {
      proxy: {
        "/api/send-sms": {
          target: "https://api.semaphore.co",
          changeOrigin: true,
          rewrite: () => "/api/v4/messages",
        },
      },
    },
  };
});
