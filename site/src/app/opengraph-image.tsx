import { ImageResponse } from "next/og";
import { business, site } from "@/lib/business";

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
          background: "#0f2a43",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 14,
            background: "#ffffff",
            color: "#0f2a43",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          DL
        </div>
        <div style={{ marginTop: 40, fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>
          {business.name}
        </div>
        <div style={{ marginTop: 16, fontSize: 28, color: "#12a37a" }}>
          {`Nettoyage professionnel en ${business.serviceArea[0]} · depuis ${business.foundedYear}`}
        </div>
        <div style={{ marginTop: 24, fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
          {site.url.replace("https://", "")}
        </div>
      </div>
    ),
    size,
  );
}
