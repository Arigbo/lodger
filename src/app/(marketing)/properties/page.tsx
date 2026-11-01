import type { Metadata } from "next";
import PropertyBrowser from "@/components/properties/property-browser";
import { JsonLd } from "@/components/shared/json-ld";
import { getAvailableProperties } from "@/lib/data/properties";
import { breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Browse student homes near campus",
  description:
    "Search verified student apartments, rooms and shared houses near your university. Filter by price, bedrooms, amenities and distance to campus.",
  alternates: { canonical: "/properties" },
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, properties] = await Promise.all([searchParams, getAvailableProperties(48)]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Properties", path: "/properties" }])} />
      <PropertyBrowser initialProperties={properties} initialQuery={q ?? ""} />
    </div>
  );
}
