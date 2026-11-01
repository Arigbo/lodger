import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PropertyDetail from "@/components/properties/property-detail";
import { canReadOnServer, getPropertyById } from "@/lib/data/properties";
import { propertyMetadata } from "@/lib/seo";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const property = await getPropertyById((await params).id);
  // Canonical points at the public listing; dashboard copies stay out of the index.
  return property ? { ...propertyMetadata(property), robots: { index: false, follow: true } } : { title: "Property not found" };
}

export default async function StudentPropertyPage({ params }: Params) {
  const { id } = await params;
  const property = await getPropertyById(id);
  // Without Admin credentials (e.g. local dev) fall back to client-side loading.
  if (!canReadOnServer()) return <PropertyDetail initialProperty={null} propertyId={id} />;
  if (!property) notFound();
  return <PropertyDetail initialProperty={property} propertyId={id} />;
}
