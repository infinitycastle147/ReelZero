// Script generation orchestrator — validate → build prompt → generateText → validate output → log

import { generateText } from "@/lib/ai/text-generation";
import type {
  GenerateScriptInput,
  GeneratedScript,
  GeneratedScene,
} from "@/lib/ai/types";
import { PROMPT_MIN_LENGTH, PROMPT_MAX_LENGTH } from "@/lib/constants/ai";
import { MIN_SCENES, MAX_SCENES } from "@/lib/constants/video";
import { createGenerationLog, updateGenerationLog } from "@/lib/db/queries/generation-logs";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { buildScriptPrompt } from "@/lib/prompts/script-generation";

type RawGeminiScene = {
  scene_number: number;
  narration: string;
  visual_description: string;
  keywords: string[];
};

type RawGeminiScript = {
  scenes: RawGeminiScene[];
};

function parseAndValidateScript(text: string, expectedSceneCount: number): GeneratedScript {
  let raw: RawGeminiScript;

  try {
    raw = JSON.parse(text) as RawGeminiScript;
  } catch {
    throw new AppError(
      ERROR_CODES.GENERATION_SCRIPT_FAILED,
      "AI returned invalid JSON output",
    );
  }

  // Validate scene count
  if (!raw.scenes || raw.scenes.length < MIN_SCENES || raw.scenes.length > expectedSceneCount) {
    throw new AppError(
      ERROR_CODES.GENERATION_SCRIPT_FAILED,
      `Expected ${MIN_SCENES}-${expectedSceneCount} scenes, got ${raw.scenes?.length ?? 0}`,
    );
  }

  // Transform snake_case → camelCase — duration is determined by TTS, not LLM
  const scenes: GeneratedScene[] = raw.scenes.map((scene) => ({
    sceneNumber: scene.scene_number,
    narration: scene.narration,
    visualDescription: scene.visual_description,
    keywords: scene.keywords,
  }));

  return { scenes };
}

export async function generateScript(input: GenerateScriptInput): Promise<GeneratedScript> {
  // Validate prompt length
  if (input.prompt.length < PROMPT_MIN_LENGTH) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `Prompt must be at least ${PROMPT_MIN_LENGTH} characters (got ${input.prompt.length})`,
    );
  }

  if (input.prompt.length > PROMPT_MAX_LENGTH) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `Prompt must be at most ${PROMPT_MAX_LENGTH} characters (got ${input.prompt.length})`,
    );
  }

  // Auto-log: create pending generation log
  const log = await createGenerationLog({
    video_id: input.videoId,
    stage: "script",
    status: "pending",
  });

  const startTime = Date.now();

  try {
    const resolvedSceneCount = input.sceneCount ?? MAX_SCENES;

    // Build prompt from template
    const prompt = buildScriptPrompt({
      topic: input.prompt,
      theme: input.theme,
      sceneCount: resolvedSceneCount,
    });

    // Call Gemini text generation
    const result = await generateText({
      prompt,
      options: { responseFormat: "json" },
    });

    // Parse and validate the script output
    const script = parseAndValidateScript(result.text, resolvedSceneCount);

    // Auto-log: mark success
    const durationMs = Date.now() - startTime;
    await updateGenerationLog(log.id, {
      status: "success",
      duration_ms: durationMs,
    });

    return script;
  } catch (error: unknown) {
    // Auto-log: mark error
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof AppError ? error.message : "Unknown script generation error";

    await updateGenerationLog(log.id, {
      status: "error",
      duration_ms: durationMs,
      error_message: errorMessage,
    });

    throw error;
  }
}
