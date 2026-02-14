import { Router } from "express";

import { validatePayload } from "@/middleware/validate-payload";
import { validateSecret } from "@/middleware/validate-secret";
import { createJob, getJobByVideoId } from "@/services/job-map";
import { processJob } from "@/services/pipeline";
import type { RenderJobPayload } from "@/types/render";

export const renderRouter = Router();

/**
 * POST /render
 * Accept a render job and begin async processing.
 *
 * - Validates x-render-secret header
 * - Validates RenderJobPayload body via Zod
 * - Returns 409 if a job with the same videoId is already in the job map
 * - Creates job, responds 202 { jobId }, then fires processJob() asynchronously
 */
renderRouter.post(
  "/render",
  validateSecret,
  validatePayload,
  (req, res): void => {
    const payload = req.body as RenderJobPayload;
    const { videoId, userId } = payload;

    // Deduplicate by videoId (jobId is generated fresh by renderer)
    const existingJob = getJobByVideoId(videoId);
    if (existingJob) {
      res.status(409).json({
        error: "Job with this videoId already exists",
        jobId: existingJob.jobId,
      });
      return;
    }

    const jobId = crypto.randomUUID();
    createJob(jobId, videoId, userId);

    // Respond 202 immediately — pipeline runs asynchronously
    res.status(202).json({ jobId });

    // Fire-and-forget — errors are caught and handled inside processJob()
    processJob(jobId, payload).catch((err: unknown) => {
      // This should never be reached — processJob() catches all errors internally
      console.error(
        `[render] Unhandled error in processJob for job ${jobId}:`,
        err,
      );
    });
  },
);
