import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PropertyDetail from "@/components/properties/property-detail";
import { JsonLd } from "@/components/shared/json-ld";
import { canReadOnServer, getPropertyById } from "@/lib/data/properties";
import { breadcrumbJsonLd, propertyJsonLd, propertyMetadata, propertyPath } from "@/lib/seo";

export const revalidate = 300;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const property = await getPropertyById((await params).id);
  return property ? propertyMetadata(property) : { title: "Property not found", robots: { index: false } };
}

export default async function PublicPropertyPage({ params }: Params) {
  const { id } = await params;
  const property = await getPropertyById(id);
  // Without Admin credentials (e.g. local dev) fall back to client-side loading.
  if (!canReadOnServer()) return <PropertyDetail initialProperty={null} propertyId={id} />;
  if (!property) notFound();

  return (
    <div className="pt-6">
      <JsonLd
        data={[
          propertyJsonLd(property),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Properties", path: "/properties" },
            { name: property.title, path: propertyPath(property.id) },
          ]),
        ]}
      />
      <PropertyDetail initialProperty={property} propertyId={id} />
    </div>
  );
}
