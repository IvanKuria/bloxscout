import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name} — ${site.tagline}`;

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#FFFFFF",
          padding: "80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "16px",
              height: "16px",
              backgroundColor: "#E2231A",
              borderRadius: "99px",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: "32px",
              fontFamily: "monospace",
              color: "#0A0A0A",
            }}
          >
            {site.name}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "88px",
            fontWeight: 500,
            letterSpacing: "-0.04em",
            color: "#0A0A0A",
            maxWidth: "900px",
            lineHeight: 1.05,
          }}
        >
          {site.tagline}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            fontSize: "24px",
            fontFamily: "monospace",
            color: "#6B7280",
          }}
        >
          Live Roblox data · refreshed every ~30 min
        </div>
      </div>
    ),
    { ...size },
  );
}
