export type CaptionStyle = "word-by-word" | "full-sentence" | "none";

export type TransitionType = "fade" | "crossfade";

export type ImageStatus = "idle" | "loading" | "success" | "error";

export type Scene = {
  id: string;
  order: number;
  narration: string;
  visualDescription: string;
  imageUrl: string | null;
  imageSource: "ai" | "upload";
  duration: number | null;
  imageStatus: ImageStatus;
};
