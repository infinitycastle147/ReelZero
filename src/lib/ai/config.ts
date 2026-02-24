// AI provider configuration — Gemini text/image endpoints, ElevenLabs base URL

export const AI_CONFIG = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    textModel: "gemini-2.5-flash",
    imageModel: "gemini-2.0-flash-preview-image-generation",
    textEndpoint:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    imageEndpoint:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent",
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY!,
    defaultModel: "eleven_multilingual_v2",
    baseUrl: "https://api.elevenlabs.io/v1",
  },
  // MVP fallback — remove when switching to a production image provider
  pollinations: {
    apiKey: process.env.POLLINATIONS_API_KEY!,
    baseUrl: "https://gen.pollinations.ai",
    model: "flux",
  },
} as const;
