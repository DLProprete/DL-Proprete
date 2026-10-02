import { ImageResponse } from "next/og";
import { brandSvgDataUri } from "@/lib/brand-asset";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const src = await brandSvgDataUri("dl-proprete-monogramme-web.svg");
  return new ImageResponse(<img src={src} width={32} height={32} alt="" />, size);
}
