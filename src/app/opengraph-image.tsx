import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — Find verified student homes near campus`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social share image, generated at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #0b0f19 0%, #2a2a14 60%, #77773c 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 700 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#8f8f4a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            L
          </div>
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Find your perfect student home
          </div>
          <div style={{ fontSize: 32, opacity: 0.8 }}>Verified landlords · Digital leases · Secure rent payments</div>
        </div>
      </div>
    ),
    size,
  );
}
