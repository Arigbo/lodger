import PropertyCard from "@/components/property-card";
import SearchFilters from "@/components/search-filters";
import { getProperties } from "@/lib/data";

export default function PropertiesPage() {
  const properties = getProperties();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl font-bold">Find Your Next Home</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Browse through our curated list of student-friendly apartments and houses.</p>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <SearchFilters />
        </aside>
        <main className="lg:col-span-3">
            <div className="mb-4">
                <p className="text-sm text-muted-foreground">{properties.length} properties found</p>
            </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {properties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
