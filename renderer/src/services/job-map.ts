/** In-memory job state store. State is lost on process restart (acceptable for MVP). */

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type JobStage =
  | "queued"
  | "download"
  | "bundle"
  | "render"
  | "upload"
  | "done";

export type RenderJob = {
  jobId: string;
  videoId: string;
  userId: string;
  status: JobStatus;
  stage: JobStage;
  /** Render progress 0–100 (updated via Remotion onProgress callback) */
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  /** Human-readable error message when status === "failed" */
  error?: string;
};

/** Module-level singleton — intentional pattern for single-instance service */
const jobMap = new Map<string, RenderJob>();

export function createJob(
  jobId: string,
  videoId: string,
  userId: string,
): RenderJob {
  const job: RenderJob = {
    jobId,
    videoId,
    userId,
    status: "queued",
    stage: "queued",
    progress: 0,
    createdAt: new Date(),
  };
  jobMap.set(jobId, job);
  return job;
}

export function updateJob(jobId: string, partial: Partial<RenderJob>): void {
  const existing = jobMap.get(jobId);
  if (!existing) {
    console.warn(`[job-map] updateJob called for unknown jobId: ${jobId}`);
    return;
  }
  jobMap.set(jobId, { ...existing, ...partial });
}

export function getJob(jobId: string): RenderJob | undefined {
  return jobMap.get(jobId);
}

export function getJobByVideoId(videoId: string): RenderJob | undefined {
  for (const job of jobMap.values()) {
    if (job.videoId === videoId) return job;
  }
  return undefined;
}
