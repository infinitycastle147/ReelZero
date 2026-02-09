// ElevenLabs TTS with word-level alignment — with-timestamps endpoint

import { AI_CONFIG } from "@/lib/ai/config";
import { withRetry, RetryableError } from "@/lib/ai/retry";
import type {
  GenerateAudioInput,
  GenerateAudioOutput,
  WordAlignment,
} from "@/lib/ai/types";
import { resolveVoiceId } from "@/lib/ai/voice-map";
import { TTS_MAX_CHARACTERS } from "@/lib/constants/ai";
import { createGenerationLog, updateGenerationLog } from "@/lib/db/queries/generation-logs";
import { uploadFile, getFileUrl } from "@/lib/db/storage";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

type ElevenLabsTimestampResponse = {
  audio_base64: string;
  normalized_alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
};

function aggregateCharToWordAlignment(
  characters: string[],
  startTimes: number[],
  endTimes: number[],
): WordAlignment[] {
  const words: WordAlignment[] = [];
  let currentWord = "";
  let wordStart = -1;
  let wordEnd = -1;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    if (char === " " || char === "\n" || char === "\t") {
      // Whitespace boundary — emit accumulated word
      if (currentWord.length > 0) {
        words.push({ word: currentWord, start: wordStart, end: wordEnd });
        currentWord = "";
        wordStart = -1;
        wordEnd = -1;
      }
    } else {
      // Accumulate character
      if (currentWord.length === 0) {
        wordStart = startTimes[i];
      }
      currentWord += char;
      wordEnd = endTimes[i];
    }
  }

  // Emit last word if any
  if (currentWord.length > 0) {
    words.push({ word: currentWord, start: wordStart, end: wordEnd });
  }

  return words;
}

export async function generateAudio(input: GenerateAudioInput): Promise<GenerateAudioOutput> {
  // Validate narration length
  if (input.narrationText.length > TTS_MAX_CHARACTERS) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `Narration text exceeds ${TTS_MAX_CHARACTERS} character limit (got ${input.narrationText.length})`,
    );
  }

  if (input.narrationText.trim().length === 0) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      "Narration text cannot be empty",
    );
  }

  // Resolve voice ID
  const elevenlabsVoiceId = resolveVoiceId(input.voiceId);

  // Auto-log: create pending generation log
  const log = await createGenerationLog({
    video_id: input.videoId,
    stage: "audio",
    status: "pending",
  });

  const startTime = Date.now();

  try {
    const url = `${AI_CONFIG.elevenlabs.baseUrl}/text-to-speech/${elevenlabsVoiceId}/with-timestamps`;

    const result = await withRetry(async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": AI_CONFIG.elevenlabs.apiKey,
        },
        body: JSON.stringify({
          text: input.narrationText,
          model_id: AI_CONFIG.elevenlabs.defaultModel,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        // Content-policy or quota rejections (403/422)
        if (response.status === 403 || response.status === 422) {
          const errorBody = (await response.json().catch(() => ({}))) as {
            detail?: { message?: string };
          };
          throw new AppError(
            ERROR_CODES.GENERATION_AUDIO_FAILED,
            errorBody.detail?.message ??
              "Audio generation was rejected. Please check your text content or account quota.",
          );
        }

        throw new RetryableError(
          `ElevenLabs API error: ${response.status}`,
          response.status,
        );
      }

      return response.json() as Promise<ElevenLabsTimestampResponse>;
    });

    // Validate alignment data
    if (
      !result.normalized_alignment ||
      !result.normalized_alignment.characters ||
      result.normalized_alignment.characters.length === 0
    ) {
      throw new AppError(
        ERROR_CODES.GENERATION_AUDIO_FAILED,
        "No alignment data returned from TTS service",
      );
    }

    // Aggregate character-level timing to word-level
    const alignment = aggregateCharToWordAlignment(
      result.normalized_alignment.characters,
      result.normalized_alignment.character_start_times_seconds,
      result.normalized_alignment.character_end_times_seconds,
    );

    // Decode base64 audio to buffer
    const audioBuffer = Buffer.from(result.audio_base64, "base64");

    // Upload MP3 to storage
    const filename = `${input.videoId}.mp3`;
    const storagePath = await uploadFile(
      "audio",
      input.userId,
      filename,
      audioBuffer,
      "audio/mpeg",
    );

    // Get signed URL
    const storageUrl = await getFileUrl("audio", input.userId, filename);

    // Calculate duration from last word end time
    const durationSeconds =
      alignment.length > 0 ? alignment[alignment.length - 1].end : 0;

    // Auto-log: mark success
    const durationMs = Date.now() - startTime;
    await updateGenerationLog(log.id, {
      status: "success",
      duration_ms: durationMs,
    });

    return {
      storageUrl,
      storagePath,
      alignment,
      durationSeconds,
    };
  } catch (error: unknown) {
    // Auto-log: mark error
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof AppError ? error.message : "Unknown audio generation error";

    await updateGenerationLog(log.id, {
      status: "error",
      duration_ms: durationMs,
      error_message: errorMessage,
    });

    throw error;
  }
}
