"use client";

import { Clapperboard, Film, Minus, Plus, Sparkles, Subtitles, Type } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import type { ScriptTheme } from "@/lib/ai/types";
import { PROMPT_MAX_LENGTH, PROMPT_MIN_LENGTH } from "@/lib/constants/ai";
import { MAX_SCENES, MIN_SCENES } from "@/lib/constants/video";
import { VOICE_OPTIONS } from "@/lib/constants/voices";
import { useVideoStore } from "@/store/video-store";
import type { CaptionStyle } from "@/types/scene";

const THEME_OPTIONS: { value: ScriptTheme; label: string; emoji: string; description: string }[] = [
  { value: "realistic", label: "Realistic", emoji: "📸", description: "Photorealistic" },
  { value: "cinematic", label: "Cinematic", emoji: "🎬", description: "Film look" },
  { value: "anime", label: "Anime", emoji: "🌸", description: "Illustrated" },
  { value: "artistic", label: "Artistic", emoji: "🎨", description: "Abstract art" },
  { value: "minimalist", label: "Minimal", emoji: "◾", description: "Clean & simple" },
];

const CAPTION_STYLE_OPTIONS: { value: CaptionStyle; label: string; icon: React.ElementType; description: string }[] = [
  { value: "word-by-word", label: "Word by Word", icon: Type, description: "Karaoke style" },
  { value: "full-sentence", label: "Full Sentence", icon: Subtitles, description: "Classic subtitles" },
  { value: "none", label: "No Captions", icon: Film, description: "Clean visuals" },
];

export function Step1Input() {
  const {
    prompt,
    selectedVoice,
    selectedTheme,
    captionStyle,
    selectedSceneCount,
    isGenerating,
    setPrompt,
    setVoice,
    setTheme,
    setCaptionStyle,
    setSceneCount,
  } = useVideoStore();

  const { createAndGenerateScript, createAndSkipToManual, error } = useVideoGeneration();
  const [touched, setTouched] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

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

  const handleWriteManually = async () => {
    setTouched(true);
    if (!canAdvance) return;
    setIsSkipping(true);
    await createAndSkipToManual();
    setIsSkipping(false);
  };

  const handleDecrementScenes = () => {
    if (selectedSceneCount > MIN_SCENES) setSceneCount(selectedSceneCount - 1);
  };

  const handleIncrementScenes = () => {
    if (selectedSceneCount < MAX_SCENES) setSceneCount(selectedSceneCount + 1);
  };

  if (isGenerating) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 animate-pulse text-primary" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">Generating your script…</p>
            <p className="mt-0.5 text-xs text-muted-foreground">This takes about 10–15 seconds.</p>
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* ── Prompt ─────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="prompt" className="text-sm font-semibold">
          Video Idea
          <span className="text-destructive ml-1" aria-hidden="true">*</span>
        </Label>
        <div className="relative">
          <Textarea
            id="prompt"
            placeholder="e.g. 5 reasons to learn TypeScript in 2026"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={4}
            maxLength={PROMPT_MAX_LENGTH}
            className="resize-none pr-16 text-sm leading-relaxed"
            aria-describedby="prompt-hint prompt-count"
          />
          <span
            id="prompt-count"
            className="pointer-events-none absolute bottom-2.5 right-3 text-[11px] tabular-nums text-muted-foreground/70"
          >
            {promptLength}/{PROMPT_MAX_LENGTH}
          </span>
        </div>
        <div id="prompt-hint" className="min-h-[1rem]">
          {touched && !isPromptValid && (
            <p className="text-xs text-destructive">
              {promptLength < PROMPT_MIN_LENGTH
                ? `${PROMPT_MIN_LENGTH - promptLength} more character${PROMPT_MIN_LENGTH - promptLength !== 1 ? "s" : ""} needed`
                : `Maximum ${PROMPT_MAX_LENGTH} characters`}
            </p>
          )}
        </div>
      </div>

      {/* ── Visual Theme ───────────────────────────────── */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold">
          Visual Theme
          <span className="text-destructive ml-1" aria-hidden="true">*</span>
        </Label>
        <div className="grid grid-cols-5 gap-2">
          {THEME_OPTIONS.map((t) => {
            const isSelected = selectedTheme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className={[
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-[0_0_0_1px_oklch(0.546_0.245_262.881/0.2)]"
                    : "border-border bg-background hover:border-primary/40 hover:bg-accent/50",
                ].join(" ")}
              >
                <span className="text-xl leading-none" aria-hidden="true">{t.emoji}</span>
                <span className={`text-[11px] font-semibold leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {t.label}
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">{t.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Voice ──────────────────────────────────────── */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold">
          Narrator Voice
          <span className="text-destructive ml-1" aria-hidden="true">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {VOICE_OPTIONS.map((v) => {
            const isSelected = selectedVoice === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVoice(v.id)}
                className={[
                  "flex flex-col items-start gap-0.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/40 hover:bg-accent/50",
                ].join(" ")}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <span className={`text-sm font-semibold leading-none ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {v.name}
                  </span>
                  {v.tier === "premium" && (
                    <span className="rounded-full bg-amber-100 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-amber-700">
                      Pro
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">{v.accent}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Caption Style + Scene Count ────────────────── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Caption Style */}
        <div className="space-y-2.5">
          <Label className="text-sm font-semibold">Caption Style</Label>
          <div className="flex flex-col gap-1.5">
            {CAPTION_STYLE_OPTIONS.map((c) => {
              const isSelected = captionStyle === c.value;
              const Icon = c.icon;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCaptionStyle(c.value as CaptionStyle)}
                  className={[
                    "flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40 hover:bg-accent/50",
                  ].join(" ")}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className={`text-[13px] font-semibold leading-none ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {c.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{c.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scene Count */}
        <div className="space-y-2.5">
          <Label className="text-sm font-semibold">Number of Scenes</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border-2 border-border bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {selectedSceneCount} scene{selectedSceneCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    ~{Math.round(selectedSceneCount * 6)}–{Math.round(selectedSceneCount * 8)}s
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={handleDecrementScenes}
                  disabled={selectedSceneCount <= MIN_SCENES}
                  aria-label="Decrease scene count"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={handleIncrementScenes}
                  disabled={selectedSceneCount >= MAX_SCENES}
                  aria-label="Increase scene count"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Quick picks */}
            <div className="flex flex-wrap gap-1.5">
              {[3, 5, 7, 10].filter((n) => n >= MIN_SCENES && n <= MAX_SCENES).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSceneCount(n)}
                  className={[
                    "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                    selectedSceneCount === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  ].join(" ")}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <p className="text-sm text-destructive" role="alert">{error}</p>
        </div>
      )}

      {/* ── Actions ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Button
          variant="ghost"
          onClick={handleWriteManually}
          disabled={!canAdvance || isGenerating || isSkipping}
          className="text-muted-foreground"
        >
          {isSkipping ? "Setting up…" : "Write manually"}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canAdvance || isGenerating || isSkipping}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Generate Script
        </Button>
      </div>
    </div>
  );
}
