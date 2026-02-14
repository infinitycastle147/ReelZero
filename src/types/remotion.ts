import type { RenderScene } from "@/types/render";
import type { CaptionStyle, TransitionType } from "@/types/scene";

/** Props passed to the Remotion VideoComposition component */
export type VideoCompositionProps = {
  audioUrl: string;
  scenes: RenderScene[];
  captionStyle: CaptionStyle;
  transitionType: TransitionType;
  showWatermark: boolean;
};
