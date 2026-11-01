import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/student/", "/landlord/", "/auth/banned", "/auth/reset-password"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
