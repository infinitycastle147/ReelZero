export const VIDEO_RESOLUTION_WIDTH = 1080 as const;
export const VIDEO_RESOLUTION_HEIGHT = 1920 as const;
export const VIDEO_FRAME_RATE = 30 as const;
export const VIDEO_DURATION_RANGE = Object.freeze({
  min: 50,
  max: 60,
} as const);
export const MAX_SCENES = 12 as const;
export const MIN_SCENES = 3 as const;
export const VIDEO_CODEC = "H.264" as const;
export const VIDEO_CONTAINER = "MP4" as const;
export const VIDEO_ASPECT_RATIO = "9:16" as const;
