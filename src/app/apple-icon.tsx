import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#244735",
        color: "#fff8ef",
        fontSize: "64px",
        fontWeight: 800,
        borderRadius: "40px",
        fontFamily: "sans-serif",
      }}
    >
      BP
    </div>,
    { ...size },
  );
}
