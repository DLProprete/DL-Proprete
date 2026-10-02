import { ImageResponse } from "next/og";
import { brandSvgDataUri } from "@/lib/brand-asset";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Charte v1.0 : version blanche officielle, seule, sur fond marine. Pas de
// texte ajouté (next/og n'embarque pas Inter, seule police de la marque).
export default async function OpengraphImage() {
  const src = await brandSvgDataUri("dl-proprete-logo-blanc-web.svg");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#243746",
        }}
      >
        <img src={src} width={729} height={117} alt="" />
      </div>
    ),
    size,
  );
}
