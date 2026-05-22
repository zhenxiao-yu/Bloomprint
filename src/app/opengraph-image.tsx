import { ImageResponse } from "next/og";

// Branded social card (Warm Blueprint palette). English-safe text so it renders
// crisply for both locales without bundling a CJK font into the edge image.
export const alt = "Bloomprint — buildable yard plans for real homes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #f8f3ea 0%, #dde8d2 100%)",
          color: "#18231d",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "9999px",
              background: "#244735",
              color: "#f8f3ea",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "34px",
              fontWeight: 700,
            }}
          >
            BP
          </div>
          <div style={{ fontSize: "30px", fontWeight: 600, color: "#244735" }}>Bloomprint</div>
        </div>
        <div style={{ marginTop: "36px", fontSize: "68px", fontWeight: 700, lineHeight: 1.05, maxWidth: "900px" }}>
          Buildable yard plans for real homes.
        </div>
        <div style={{ marginTop: "28px", fontSize: "30px", color: "#6f6a5f", maxWidth: "880px" }}>
          Plants, materials, budget, labor, risks, and a shopping list — facts first, AI second.
        </div>
      </div>
    ),
    { ...size },
  );
}
