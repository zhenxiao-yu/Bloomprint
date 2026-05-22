"use client";

import { useEffect } from "react";

const SCRIPT_SRC = "https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js";

// A representative model so the 3D/AR flow works end-to-end. Swap to real per-plant models by
// setting NEXT_PUBLIC_AR_MODEL_URL. (Per-plant 3D assets are a content task, not a code one.)
const DEFAULT_MODEL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb";

export function ArView() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (customElements.get("model-viewer")) return;
    if (document.querySelector("script[data-model-viewer]")) return;
    const s = document.createElement("script");
    s.type = "module";
    s.src = SCRIPT_SRC;
    s.dataset.modelViewer = "1";
    document.head.appendChild(s);
  }, []);

  const modelUrl = process.env.NEXT_PUBLIC_AR_MODEL_URL || DEFAULT_MODEL;

  return (
    <div className="mt-3">
      <model-viewer
        src={modelUrl}
        ar
        ar-modes="webxr scene-viewer quick-look"
        camera-controls
        auto-rotate
        touch-action="pan-y"
        shadow-intensity="1"
        alt="3D model preview for AR"
        style={{ width: "100%", height: "320px", background: "var(--brand-soft)", borderRadius: "0.75rem" }}
      />
      <p className="mt-1 text-xs text-muted">
        Drag to rotate. On a phone, tap the AR icon to place it in your space. This is a{" "}
        <span className="font-medium">representative 3D model</span> for scale — not your exact plants.
      </p>
    </div>
  );
}
