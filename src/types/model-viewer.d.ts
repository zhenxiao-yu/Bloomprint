import type React from "react";

// Minimal JSX typing for Google's <model-viewer> web component (loaded at runtime via CDN).
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "ar-scale"?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "shadow-intensity"?: string;
        "touch-action"?: string;
        poster?: string;
        alt?: string;
        loading?: string;
        reveal?: string;
      };
    }
  }
}
