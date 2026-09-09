import type { MetadataRoute } from "next";
import { site, services } from "@/lib/business";
import { cities } from "@/lib/cities";
import { posts } from "@/lib/blog";

const routes = [
  "",
  "/services",
  "/zone-intervention",
  "/a-propos",
  ...cities.map((city) => `/zone-intervention/${city.slug}`),
  ...cities.flatMap((city) =>
    services.map((service) => `/zone-intervention/${city.slug}/${service.slug}`),
  ),
  "/blog",
  ...posts.map((post) => `/blog/${post.slug}`),
  "/contact",
  "/politique-confidentialite",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
