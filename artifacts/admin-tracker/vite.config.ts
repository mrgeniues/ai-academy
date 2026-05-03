import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import type { Plugin } from "vite";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error("BASE_PATH environment variable is required but was not provided.");
}

// In dev mode, Vite redirects "/" → "<basePath>" with 302.
// The workflow health-checker doesn't follow redirects, so it sees 302 and
// marks the workflow as "not open". This plugin intercepts "/" and returns
// a 200 HTML page that immediately redirects the browser instead.
function rootHealthPlugin(): Plugin {
  return {
    name: "root-health-200",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/" && req.method === "GET") {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${basePath}"></head>` +
            `<body>Redirecting to <a href="${basePath}">${basePath}</a></body></html>`,
          );
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    rootHealthPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
