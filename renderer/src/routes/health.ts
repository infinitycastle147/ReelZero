import { Router } from "express";

export const healthRouter = Router();

/**
 * GET /health
 * Liveness check — no authentication required.
 * Used by Render.com health check probes and monitoring tools.
 * Must respond in <100ms.
 */
healthRouter.get("/health", (_req, res): void => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
