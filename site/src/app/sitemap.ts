import type { MetadataRoute } from "next";
import { site } from "@/lib/business";
import { cities } from "@/lib/cities";

const routes = [
  "",
  "/services",
  "/zone-intervention",
  ...cities.map((city) => `/zone-intervention/${city.slug}`),
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
