import express from "express";

import { healthRouter } from "@/routes/health";
import { renderRouter } from "@/routes/render";
import { statusRouter } from "@/routes/status";

const PORT = Number(process.env.PORT ?? 3001);

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check — MUST be registered BEFORE any authenticated router
// so Render.com liveness probes and monitoring tools work without the secret
app.use(healthRouter);

// Authenticated routes
app.use(renderRouter);
app.use(statusRouter);

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[renderer] Starting ReelZero-Renderer on port ${PORT}`);
  console.log(
    "[renderer] Remotion bundle will be created on first render job",
  );
  console.log("[renderer] Server ready");
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("[renderer] SIGTERM received — shutting down gracefully");
  server.close(() => {
    console.log("[renderer] Server closed");
    process.exit(0);
  });
});

export default app;
