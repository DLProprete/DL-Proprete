import { ImageResponse } from "next/og";
import { brandSvgDataUri } from "@/lib/brand-asset";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Icône utilisée quand la fenêtre/l'app est épinglée (barre des tâches,
// Dock macOS, "Ajouter à l'écran d'accueil" iOS). Fond marine plein : iOS
// arrondit lui-même les coins, le carré du monogramme s'y fond.
export default async function AppleIcon() {
  const src = await brandSvgDataUri("dl-proprete-monogramme-web.svg");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#243746" }}>
        <img src={src} width={180} height={180} alt="" />
      </div>
    ),
    { ...size },
  );
}
