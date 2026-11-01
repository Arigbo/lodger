import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { getPropertySitemapEntries } from "@/lib/data/properties";
import { propertyPath } from "@/lib/seo";

export const revalidate = 3600;

const staticRoutes: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/properties", priority: 0.9, changeFrequency: "daily" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/auth/signup", priority: 0.5, changeFrequency: "yearly" },
  { path: "/auth/login", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const properties = await getPropertySitemapEntries();

  return [
    ...staticRoutes.map(({ path, priority, changeFrequency }) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...properties.map(({ id, updatedAt }) => ({
      url: absoluteUrl(propertyPath(id)),
      lastModified: updatedAt ? new Date(updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
