import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

const VALID_SIZES = [192, 512] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const dimension = Number(size);
  if (!VALID_SIZES.includes(dimension as (typeof VALID_SIZES)[number])) {
    notFound();
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f766e",
          color: "white",
          fontSize: dimension * 0.4,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        DL
      </div>
    ),
    { width: dimension, height: dimension },
  );
}
