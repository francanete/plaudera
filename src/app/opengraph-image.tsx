import { ImageResponse } from "next/og";
import { appConfig } from "@/lib/config";

export const runtime = "edge";

export const alt = appConfig.seo.title.default;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        backgroundImage: "linear-gradient(to bottom right, #0a0a0a, #1a1a2e)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            backgroundColor: "#6366f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            fontWeight: 700,
            color: "white",
          }}
        >
          {appConfig.name.charAt(0)}
        </div>
      </div>

      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          marginBottom: 20,
          maxWidth: 900,
          lineHeight: 1.2,
        }}
      >
        {appConfig.name}
      </div>

      <div
        style={{
          fontSize: 28,
          color: "#a1a1aa",
          textAlign: "center",
          maxWidth: 700,
        }}
      >
        {appConfig.description}
      </div>
    </div>,
    {
      ...size,
    }
  );
}
