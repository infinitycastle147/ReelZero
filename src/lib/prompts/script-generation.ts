// Script generation prompt template — buildScriptPrompt()

import type { ScriptPromptInput } from "@/lib/prompts/types";

export function buildScriptPrompt(input: ScriptPromptInput): string {
  return `You are a professional short-form video scriptwriter. Create a video script about the following topic.

TOPIC: ${input.topic}

THEME/STYLE: ${input.theme}

REQUIREMENTS:
- Generate exactly ${input.sceneCount} scenes
- Total video duration must be between 50 and ${input.targetDuration} seconds
- Each scene should be 10-12 seconds long
- Each scene must include:
  - "scene_number": sequential integer starting at 1
  - "narration": the spoken text for this scene (conversational, engaging tone)
  - "visual_description": a detailed description of what the viewer should see (suitable for AI image generation)
  - "duration_seconds": an integer between 10 and 12
  - "keywords": an array of 3-5 relevant keywords for this scene

STYLE GUIDELINES FOR "${input.theme}" THEME:
${getThemeGuidelines(input.theme)}

OUTPUT FORMAT:
Return a JSON object with:
- "total_duration": the sum of all scene durations (integer, must be 50-60)
- "scenes": an array of scene objects

Ensure the narration flows naturally from one scene to the next, telling a cohesive story about the topic. The visual descriptions should be vivid and specific enough for AI image generation.`;
}

function getThemeGuidelines(theme: string): string {
  switch (theme) {
    case "realistic":
      return "- Visual descriptions should emphasize photorealistic quality\n- Use natural lighting, real-world settings\n- Narration should be informative and grounded";
    case "anime":
      return "- Visual descriptions should reference anime/manga art style\n- Use vibrant colors, dynamic compositions\n- Narration can be more dramatic and expressive";
    case "artistic":
      return "- Visual descriptions should emphasize artistic, painterly quality\n- Use creative compositions, bold color palettes\n- Narration should be poetic and evocative";
    case "cinematic":
      return "- Visual descriptions should reference cinematic framing and lighting\n- Use dramatic angles, depth of field, movie-like composition\n- Narration should be dramatic and impactful";
    case "minimalist":
      return "- Visual descriptions should be clean, simple, uncluttered\n- Use muted colors, plenty of negative space\n- Narration should be concise and direct";
    default:
      return "- Use a balanced, visually appealing style\n- Narration should be clear and engaging";
  }
}
