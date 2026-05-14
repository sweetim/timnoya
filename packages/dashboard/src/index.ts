import { serve } from "bun";
import index from "./index.html";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";

const server = serve({
  routes: {
    "/api/*": async (req) => {
      try {
        const url = new URL(req.url);
        const targetUrl = `${API_BASE}${url.pathname.replace(/^\/api/, "")}${url.search}`;
        const res = await fetch(targetUrl, {
          method: req.method,
          headers: req.headers,
          body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
        });
        return new Response(res.body, {
          status: res.status,
          headers: {
            "Content-Type": res.headers.get("Content-Type") || "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err) {
        return Response.json(
          { error: "API server unreachable", detail: err instanceof Error ? err.message : String(err) },
          { status: 502 },
        );
      }
    },
    "/*": index,
  },
  port: 3001,
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
