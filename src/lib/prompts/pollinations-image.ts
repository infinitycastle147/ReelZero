// Pollinations (Flux Schnell) prompt builder
// Flux responds best to concise comma-separated tag prompts with quality boosters,
// NOT Gemini-style paragraph instructions. Negative prompt passed separately as URL param.

import type { ImagePromptInput } from "@/lib/prompts/types";

const QUALITY_BOOSTERS =
  "masterpiece, best quality, 8k uhd, ultra detailed, sharp focus, high resolution, professional";

const COMPOSITION_TAGS =
  "vertical portrait orientation, 9:16 aspect ratio, centered subject, subject fills frame, " +
  "clear space at top and bottom for text overlay, no watermark, no text, no logo, no borders";

export const POLLINATIONS_NEGATIVE_PROMPT =
  "blurry, low quality, pixelated, distorted, ugly, bad anatomy, watermark, text, logo, " +
  "border, landscape orientation, horizontal composition, widescreen, out of focus, " +
  "low resolution, grainy, oversaturated, deformed, disfigured, duplicate, extra limbs";

function getThemeStyleTags(theme: string): string {
  switch (theme) {
    case "realistic":
      return "photorealistic, DSLR photography, natural lighting, real-world textures, editorial quality, lifelike";
    case "anime":
      return "anime style, vibrant saturated colors, clean line art, cel shading, manga aesthetic, expressive";
    case "artistic":
      return "painterly, oil painting, bold color palette, impressionistic, expressive brushwork, mood lighting";
    case "cinematic":
      return "cinematic lighting, dramatic shadows, film color grading, teal-orange palette, movie poster composition";
    case "minimalist":
      return "minimalist, clean uncluttered composition, limited color palette, geometric shapes, generous negative space";
    default:
      return "balanced composition, visually appealing, clear subject, professional quality";
  }
}

export function buildPollinationsPrompt(input: ImagePromptInput): {
  prompt: string;
  negativePrompt: string;
} {
  const styleTag = getThemeStyleTags(input.theme);

  const prompt = [
    QUALITY_BOOSTERS,
    styleTag,
    input.visualDescription,
    COMPOSITION_TAGS,
  ].join(", ");

  return {
    prompt,
    negativePrompt: POLLINATIONS_NEGATIVE_PROMPT,
  };
}
