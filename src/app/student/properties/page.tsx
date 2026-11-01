import type { Metadata } from "next";
import PropertyBrowser from "@/components/properties/property-browser";

export const metadata: Metadata = {
  title: "Find a property",
  alternates: { canonical: "/properties" },
};

export default function StudentPropertiesPage() {
  return <PropertyBrowser />;
}
