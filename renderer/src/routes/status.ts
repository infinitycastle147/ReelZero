import { Router } from "express";

import { validateSecret } from "@/middleware/validate-secret";
import { getJob } from "@/services/job-map";

export const statusRouter = Router();

/**
 * GET /status/:jobId
 * Poll the current status of a render job.
 *
 * - Requires x-render-secret header
 * - Returns 404 if jobId is unknown
 * - Returns 200 with { jobId, videoId, status, stage, progress } on success
 * - Includes `error` field when status === "failed"
 */
statusRouter.get("/status/:jobId", validateSecret, (req, res): void => {
  const jobId = req.params["jobId"] as string;
  const job = getJob(jobId);

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const response: Record<string, unknown> = {
    jobId: job.jobId,
    videoId: job.videoId,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
  };

  // Only include error field when job has failed
  if (job.status === "failed" && job.error) {
    response.error = job.error;
  }

  res.json(response);
});
