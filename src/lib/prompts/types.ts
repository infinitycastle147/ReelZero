// Prompt template input types

import type { ScriptTheme } from "@/lib/ai/types";

export type ScriptPromptInput = {
  topic: string;
  theme: ScriptTheme;
  sceneCount: number;
  targetDuration: number;
};

export type ImagePromptInput = {
  visualDescription: string;
  theme: ScriptTheme;
  style?: string;
};
