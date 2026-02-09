// Image generation prompt template — buildImagePrompt()

import type { ImagePromptInput } from "@/lib/prompts/types";

export function buildImagePrompt(input: ImagePromptInput): string {
  const styleGuide = getThemeStyleGuide(input.theme);

  return `Generate a high-quality image based on the following description.

VISUAL DESCRIPTION: ${input.visualDescription}

STYLE: ${input.theme}
${styleGuide}

REQUIREMENTS:
- Square aspect ratio (1:1)
- High detail and clarity
- No text, watermarks, or logos in the image
- The image should be suitable for a short-form video scene background
${input.style ? `- Additional style notes: ${input.style}` : ""}`;
}

function getThemeStyleGuide(theme: string): string {
  switch (theme) {
    case "realistic":
      return "STYLE GUIDE:\n- Photorealistic rendering\n- Natural lighting and shadows\n- Real-world textures and materials\n- Professional photography quality";
    case "anime":
      return "STYLE GUIDE:\n- Anime/manga art style\n- Vibrant, saturated colors\n- Clean line work with cel-shading\n- Expressive character designs if people are present";
    case "artistic":
      return "STYLE GUIDE:\n- Painterly, artistic rendering\n- Bold color palettes with creative use of color\n- Impressionistic or expressionistic elements\n- Emphasis on mood and atmosphere";
    case "cinematic":
      return "STYLE GUIDE:\n- Cinematic composition and framing\n- Dramatic lighting with strong contrast\n- Film-like color grading\n- Wide-angle or anamorphic lens feel";
    case "minimalist":
      return "STYLE GUIDE:\n- Clean, minimal composition\n- Limited color palette (2-3 main colors)\n- Generous negative space\n- Simple shapes and forms";
    default:
      return "STYLE GUIDE:\n- Balanced, visually appealing composition\n- Clear subject matter\n- Professional quality";
  }
}
