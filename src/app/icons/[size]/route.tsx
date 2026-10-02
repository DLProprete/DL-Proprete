import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { brandSvgDataUri } from "@/lib/brand-asset";

const VALID_SIZES = [192, 512] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const dimension = Number(size);
  if (!VALID_SIZES.includes(dimension as (typeof VALID_SIZES)[number])) {
    notFound();
  }

  const src = await brandSvgDataUri("dl-proprete-monogramme-web.svg");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#243746" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendu next/og, pas du DOM */}
        <img src={src} width={dimension} height={dimension} alt="" />
      </div>
    ),
    { width: dimension, height: dimension },
  );
}
