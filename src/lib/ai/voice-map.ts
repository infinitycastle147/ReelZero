// Voice ID mapping — app voice IDs to ElevenLabs voice IDs

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

// ElevenLabs pre-made voice IDs
// See: https://elevenlabs.io/docs/voices/premade-voices
const VOICE_ID_MAP: Record<string, string> = {
  voice_adam: "pNInz6obpgDQGcFmaJgB",    // Adam
  voice_bella: "EXAVITQu4vr4xnSDxMaL",   // Bella
  voice_charlie: "IKne3meq5aSn9XLyUdCD",  // Charlie
  voice_diana: "FGY2WhTYpPnrIDTdsKH5",    // Diana (Grace)
  voice_echo: "CwhRBWXzGAHq8TQ4Fs17",    // Echo (Roger)
};

export function resolveVoiceId(appVoiceId: string): string {
  const elevenlabsVoiceId = VOICE_ID_MAP[appVoiceId];

  if (!elevenlabsVoiceId) {
    throw new AppError(ERROR_CODES.VALIDATION_INVALID_INPUT, `Unknown voice ID: ${appVoiceId}`);
  }

  return elevenlabsVoiceId;
}
