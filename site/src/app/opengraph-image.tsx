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
          gap: 40,
          padding: 96,
          background: "#0f2a43",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 120,
            height: 120,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              background: "#0f2a43",
              border: "2px solid #3e6b8c",
              borderBottom: "none",
              color: "#ffffff",
              fontSize: 56,
              fontWeight: 700,
            }}
          >
            DL
          </div>
          <div style={{ display: "flex", height: 20, background: "#3e6b8c" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#ffffff" }}>
            {business.name}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#12a37a" }}>
            {`Nettoyage professionnel en ${business.serviceArea[0]} · depuis ${business.foundedYear}`}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.65)" }}>
            {site.url.replace("https://", "")}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
