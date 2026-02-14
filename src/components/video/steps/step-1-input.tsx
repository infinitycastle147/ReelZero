"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import type { ScriptTheme } from "@/lib/ai/types";
import { PROMPT_MAX_LENGTH, PROMPT_MIN_LENGTH } from "@/lib/constants/ai";
import { VOICE_OPTIONS } from "@/lib/constants/voices";
import { useVideoStore } from "@/store/video-store";
import type { CaptionStyle } from "@/types/scene";

const THEME_OPTIONS: { value: ScriptTheme; label: string }[] = [
  { value: "realistic", label: "Realistic" },
  { value: "anime", label: "Anime" },
  { value: "artistic", label: "Artistic" },
  { value: "cinematic", label: "Cinematic" },
  { value: "minimalist", label: "Minimalist" },
];

const CAPTION_STYLE_OPTIONS: { value: CaptionStyle; label: string }[] = [
  { value: "word-by-word", label: "Word by Word" },
  { value: "full-sentence", label: "Full Sentence" },
  { value: "none", label: "None" },
];

export function Step1Input() {
  const {
    prompt,
    selectedVoice,
    selectedTheme,
    captionStyle,
    isGenerating,
    setPrompt,
    setVoice,
    setTheme,
    setCaptionStyle,
  } = useVideoStore();

  const { createAndGenerateScript, error } = useVideoGeneration();
  const [touched, setTouched] = useState(false);

  // Clear any stale isGenerating=true left from a crashed previous attempt
  useEffect(() => {
    if (isGenerating) {
      useVideoStore.setState({ isGenerating: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const promptLength = prompt.length;
  const isPromptValid =
    promptLength >= PROMPT_MIN_LENGTH && promptLength <= PROMPT_MAX_LENGTH;
  const canAdvance =
    isPromptValid && !!selectedVoice && !!selectedTheme && !isGenerating;

  const handleNext = async () => {
    setTouched(true);
    if (!canAdvance) return;
    await createAndGenerateScript();
  };

  if (isGenerating) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Generating your script…
        </p>
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="prompt">
          Video Topic or Idea
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        </Label>
        <Textarea
          id="prompt"
          placeholder="e.g. 5 reasons to learn TypeScript in 2026"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={4}
          maxLength={PROMPT_MAX_LENGTH}
          className="resize-none"
          aria-describedby="prompt-hint prompt-count"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span id="prompt-hint">
            {touched && !isPromptValid && (
              <span className="text-destructive">
                {promptLength < PROMPT_MIN_LENGTH
                  ? `At least ${PROMPT_MIN_LENGTH} characters required (${PROMPT_MIN_LENGTH - promptLength} more)`
                  : `Maximum ${PROMPT_MAX_LENGTH} characters`}
              </span>
            )}
          </span>
          <span id="prompt-count">
            {promptLength}/{PROMPT_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Voice */}
        <div className="space-y-2">
          <Label htmlFor="voice">Voice</Label>
          <Select
            value={selectedVoice ?? ""}
            onValueChange={(val) => setVoice(val)}
          >
            <SelectTrigger id="voice" aria-label="Select voice">
              <SelectValue placeholder="Choose voice" />
            </SelectTrigger>
            <SelectContent>
              {VOICE_OPTIONS.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} — {v.accent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <Label htmlFor="theme">Visual Theme</Label>
          <Select
            value={selectedTheme ?? ""}
            onValueChange={(val) => setTheme(val)}
          >
            <SelectTrigger id="theme" aria-label="Select visual theme">
              <SelectValue placeholder="Choose theme" />
            </SelectTrigger>
            <SelectContent>
              {THEME_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Caption Style */}
        <div className="space-y-2">
          <Label htmlFor="caption-style">Caption Style</Label>
          <Select
            value={captionStyle}
            onValueChange={(val) => setCaptionStyle(val as CaptionStyle)}
          >
            <SelectTrigger id="caption-style" aria-label="Select caption style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAPTION_STYLE_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!canAdvance || isGenerating}>
          Generate Script →
        </Button>
      </div>
    </div>
  );
}
