// Image generation prompt template — buildImagePrompt()

import type { ImagePromptInput } from "@/lib/prompts/types";

export function buildImagePrompt(input: ImagePromptInput): string {
  const styleGuide = getThemeStyleGuide(input.theme);

  return `Generate a high-quality image for a short-form vertical video scene (TikTok / Instagram Reels / YouTube Shorts).

VISUAL DESCRIPTION: ${input.visualDescription}

STYLE: ${input.theme}
${styleGuide}

COMPOSITION & FRAMING:
- Vertical portrait orientation — compose for a 9:16 aspect ratio (1080×1920), tall not wide
- Place the main subject centred or in the upper-centre of the frame so it survives a portrait crop
- Keep all critical elements away from the far left and right edges
- Leave clear space at the top and bottom for caption text overlay
- High detail and sharp clarity throughout
- No text, watermarks, logos, UI elements, or borders in the image
${input.style ? `- Additional style notes: ${input.style}` : ""}`;
}

function getThemeStyleGuide(theme: string): string {
  switch (theme) {
    case "realistic":
      return "STYLE GUIDE:\n- Photorealistic rendering\n- Natural lighting and shadows\n- Real-world textures and materials\n- Professional portrait/editorial photography quality\n- Vertical subject framing — shoot as if using a smartphone camera in portrait mode";
    case "anime":
      return "STYLE GUIDE:\n- Anime/manga art style\n- Vibrant, saturated colours\n- Clean line work with cel-shading\n- Expressive character designs if people are present\n- Vertical key-visual composition typical of anime mobile wallpapers";
    case "artistic":
      return "STYLE GUIDE:\n- Painterly, artistic rendering\n- Bold colour palettes with creative use of colour\n- Impressionistic or expressionistic elements\n- Emphasis on mood and atmosphere\n- Vertical canvas composition — think portrait painting, not landscape";
    case "cinematic":
      return "STYLE GUIDE:\n- Cinematic lighting with strong contrast and dramatic shadows\n- Film-like colour grading (teal-orange, cool blue, or warm gold tones)\n- Vertical framing — compose like a movie poster or phone wallpaper, NOT a widescreen still\n- Subject prominent in the centre with depth receding behind";
    case "minimalist":
      return "STYLE GUIDE:\n- Clean, uncluttered composition\n- Limited colour palette (2–3 colours)\n- Generous negative space above and below the subject\n- Simple geometric shapes and forms\n- Vertical balance — subject anchored centrally with empty space framing it";
    default:
      return "STYLE GUIDE:\n- Balanced, visually appealing vertical composition\n- Clear prominent subject matter\n- Professional quality";
  }
}
