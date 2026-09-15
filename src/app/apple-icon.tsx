import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Icône utilisée quand la fenêtre/l'app est épinglée (barre des tâches,
// Dock macOS, "Ajouter à l'écran d'accueil" iOS) — sans ce fichier, ces
// contextes retombent sur une icône générique du navigateur, pas le "DL".
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f2a43",
          color: "#ffffff",
          fontSize: 84,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        DL
      </div>
    ),
    { ...size },
  );
}
