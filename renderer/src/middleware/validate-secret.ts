import type { NextFunction, Request, Response } from "express";

/**
 * Middleware: verify the x-render-secret header matches RENDER_WEBHOOK_SECRET.
 * Returns 401 on mismatch. Apply to all routes except GET /health.
 */
export function validateSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const secret = process.env.RENDER_WEBHOOK_SECRET;
  const provided = req.headers["x-render-secret"];

  if (!secret || provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
