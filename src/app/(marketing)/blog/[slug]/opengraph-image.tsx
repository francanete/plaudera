import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog";
import { appConfig } from "@/lib/config";

export const runtime = "nodejs";

export const alt = "Blog post";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div style={{ color: "white", fontSize: 48 }}>Post not found</div>
      </div>,
      { ...size }
    );
  }

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0a0a",
        backgroundImage: "linear-gradient(to bottom right, #0a0a0a, #1a1a2e)",
        padding: 60,
      }}
    >
      {post.category && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              backgroundColor: "#6366f1",
              color: "white",
              padding: "8px 16px",
              borderRadius: 20,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {post.category}
          </div>
        </div>
      )}

      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: "white",
          lineHeight: 1.2,
          marginBottom: 30,
          maxWidth: 900,
        }}
      >
        {post.title}
      </div>

      <div
        style={{
          fontSize: 24,
          color: "#a1a1aa",
          lineHeight: 1.5,
          maxWidth: 800,
          marginBottom: "auto",
        }}
      >
        {post.description}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#374151",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            {post.author?.name?.charAt(0) || "S"}
          </div>
          <div style={{ color: "#d1d5db", fontSize: 20 }}>
            {post.author?.name || appConfig.team.name}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {appConfig.name.charAt(0)}
          </div>
          <div style={{ color: "#d1d5db", fontSize: 20, fontWeight: 600 }}>
            {appConfig.name}
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
