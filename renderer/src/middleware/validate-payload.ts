import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

/** Zod schema for RenderJobPayload — must match src/types/render.ts */
export const renderJobSchema = z.object({
  videoId: z.string().uuid({ message: "videoId must be a valid UUID" }),
  userId: z.string().min(1, { message: "userId is required" }),
  audioUrl: z.string().url({ message: "audioUrl must be a valid URL" }),
  scenes: z
    .array(
      z.object({
        sceneNumber: z
          .number()
          .int()
          .min(1)
          .max(5, { message: "sceneNumber must be between 1 and 5" }),
        imageUrl: z.string().url({ message: "imageUrl must be a valid URL" }),
        durationInFrames: z
          .number()
          .int()
          .positive({ message: "durationInFrames must be a positive integer" }),
        startFrame: z
          .number()
          .int()
          .nonnegative({ message: "startFrame must be non-negative" }),
        wordTimings: z.array(
          z.object({
            word: z.string(),
            startFrame: z.number().int().nonnegative(),
            endFrame: z.number().int().nonnegative(),
          }),
        ),
      }),
    )
    .min(3, { message: "scenes must contain at least 3 elements" })
    .max(5, { message: "scenes must contain at most 5 elements" }),
  captionStyle: z.enum(["word-by-word", "full-sentence", "none"]),
  transitionType: z.enum(["fade", "crossfade"]),
  showWatermark: z.boolean(),
  callbackUrl: z.string().url({ message: "callbackUrl must be a valid URL" }),
  stageCallbackUrl: z
    .string()
    .url({ message: "stageCallbackUrl must be a valid URL" }),
});

export type ValidatedRenderJobPayload = z.infer<typeof renderJobSchema>;

/**
 * Middleware: validate the request body against renderJobSchema.
 * Returns 422 with validation details on failure.
 * Attaches the parsed payload to req.body on success.
 */
export function validatePayload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const result = renderJobSchema.safeParse(req.body);

  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    res.status(422).json({ error: "Validation failed", details });
    return;
  }

  // Replace body with the validated + typed payload
  req.body = result.data;
  next();
}
