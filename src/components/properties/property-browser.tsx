"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Home as HomeIcon, Search, SlidersHorizontal, X } from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import { EmptyState, PageHeader } from "@/components/dashboard";
import PropertyCard from "@/components/properties/property-card";
import SearchFilters, { type FilterState } from "@/components/properties/search-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { convertCurrency, getCurrencyByCountry } from "@/lib/currencies";
import { cn, formatPrice, haversineDistance } from "@/lib/utils";
import type { Property } from "@/types";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "bedrooms-desc", label: "Most bedrooms" },
  { value: "area-desc", label: "Largest" },
] as const;

/** Below this many listings, curated rows just repeat the same homes, so show one grid instead. */
const MIN_FOR_SECTIONS = 7;
const SECTION_SIZE = 8;
const EMPTY_FILTERS: FilterState = { useCurrentLocation: false, amenities: [] };

/** "2", "4+" or "3+" → a predicate on a room count. */
function roomMatcher(value?: string) {
  if (!value || value === "any") return null;
  const n = parseInt(value, 10);
  const atLeast = value.endsWith("+") || value === "4";
  return (count: number) => (atLeast ? count >= n : count === n);
}

type PropertyBrowserProps = {
  /** Server-rendered listings shown until the live query resolves. */
  initialProperties?: Property[];
  /** Pre-fills the search box (e.g. from `?q=`). */
  initialQuery?: string;
};

export default function PropertyBrowser({ initialProperties, initialQuery = "" }: PropertyBrowserProps) {
  const { profile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const inDashboard = usePathname().startsWith("/student");

  const propertiesQuery = useMemoFirebase(() => query(collection(firestore, "properties"), where("status", "==", "available")), [firestore]);
  const { data: liveProperties, isLoading: arePropertiesLoading } = useCollection<Property>(propertiesQuery);
  const allProperties = liveProperties ?? initialProperties ?? null;

  const [filters, setFilters] = useState<FilterState>({ useCurrentLocation: false });
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [schoolsInArea, setSchoolsInArea] = useState<string[] | null>(null);
  const [hasAppliedDefaults, setHasAppliedDefaults] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const userCurrency = profile?.currency || (profile?.country ? getCurrencyByCountry(profile.country) : "USD");

  // Start from the student's own area (state adjusted during render, not in an effect).
  if (profile && !hasAppliedDefaults) {
    setHasAppliedDefaults(true);
    setFilters((prev) => ({ ...prev, country: profile.country || prev.country, state: profile.state || prev.state }));
  }

  const availableStates = useMemo(() => {
    const props = (allProperties ?? []).filter((p) => !filters.country || p.location.country === filters.country);
    return [...new Set(props.map((p) => p.location.state))];
  }, [allProperties, filters.country]);

  const types = useMemo(() => [...new Set((allProperties ?? []).map((p) => p.type))].sort(), [allProperties]);

  const results = useMemo(() => {
    let list = (allProperties ?? []).filter((p) => p.status === "available");

    if (filters.useCurrentLocation && currentLocation) {
      list = list.filter((p) => p.location.lat && p.location.lng && haversineDistance(currentLocation, { lat: p.location.lat, lng: p.location.lng }) < 10);
    } else {
      const has = (value: string | undefined, needle?: string) => !needle || (value ?? "").toLowerCase().includes(needle.toLowerCase());
      list = list.filter(
        (p) =>
          (!filters.country || p.location.country === filters.country) &&
          has(p.location.state, filters.state) &&
          has(p.location.city, filters.city) &&
          has(p.location.school, filters.school),
      );
    }

    if (filters.price) list = list.filter((p) => convertCurrency(p.price, p.currency, userCurrency) <= filters.price!);
    if (filters.propertyType && filters.propertyType !== "any") list = list.filter((p) => p.type === filters.propertyType);
    const beds = roomMatcher(filters.bedrooms);
    if (beds) list = list.filter((p) => beds(p.bedrooms));
    const baths = roomMatcher(filters.bathrooms);
    if (baths) list = list.filter((p) => baths(p.bathrooms));
    if (filters.amenities?.length) list = list.filter((p) => filters.amenities!.every((a) => p.amenities?.includes(a)));

    const term = searchQuery.trim().toLowerCase();
    if (term) {
      list = list.filter((p) =>
        [p.title, p.location.address, p.location.city, p.location.state, p.location.school, p.type].some((v) => v?.toLowerCase().includes(term)),
      );
    }

    const price = (p: Property) => convertCurrency(p.price, p.currency, userCurrency);
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return price(a) - price(b);
        case "price-desc":
          return price(b) - price(a);
        case "bedrooms-desc":
          return b.bedrooms - a.bedrooms;
        case "area-desc":
          return (b.area || 0) - (a.area || 0);
        default:
          return b.id.localeCompare(a.id);
      }
    });
  }, [allProperties, filters, currentLocation, searchQuery, sortBy, userCurrency]);

  // Chips for every filter the student has set, each removable on its own.
  const chips: { key: keyof FilterState | "q"; label: string }[] = [
    ...(searchQuery.trim() ? [{ key: "q" as const, label: `“${searchQuery.trim()}”` }] : []),
    ...(filters.useCurrentLocation ? [{ key: "useCurrentLocation" as const, label: "Within 10 km of you" }] : []),
    ...(filters.school ? [{ key: "school" as const, label: `Near ${filters.school}` }] : []),
    ...(filters.city ? [{ key: "city" as const, label: filters.city }] : []),
    ...(filters.state ? [{ key: "state" as const, label: filters.state }] : []),
    ...(filters.propertyType && filters.propertyType !== "any" ? [{ key: "propertyType" as const, label: filters.propertyType }] : []),
    ...(filters.price ? [{ key: "price" as const, label: `Up to ${formatPrice(filters.price, userCurrency)}` }] : []),
    ...(filters.bedrooms && filters.bedrooms !== "any" ? [{ key: "bedrooms" as const, label: `${filters.bedrooms.replace(/^4$/, "4+")} bed` }] : []),
    ...(filters.bathrooms && filters.bathrooms !== "any" ? [{ key: "bathrooms" as const, label: `${filters.bathrooms} bath` }] : []),
    ...(filters.amenities ?? []).map((a) => ({ key: "amenities" as const, label: a })),
  ];
  // Location defaults from the profile don't count as "searching".
  const userFilterCount = chips.filter((c) => !(c.key === "state" && filters.state === profile?.state)).length;
  const isSearching = userFilterCount > 0 || sortBy !== "newest";

  const removeChip = (chip: (typeof chips)[number]) => {
    if (chip.key === "q") return setSearchQuery("");
    if (chip.key === "amenities") return setFilters((f) => ({ ...f, amenities: (f.amenities ?? []).filter((a) => a !== chip.label) }));
    if (chip.key === "useCurrentLocation") {
      setCurrentLocation(null);
      setSchoolsInArea(null);
      return setFilters((f) => ({ ...f, useCurrentLocation: false }));
    }
    setFilters((f) => ({ ...f, [chip.key]: undefined }));
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setCurrentLocation(null);
    setSchoolsInArea(null);
    setSearchQuery("");
    setSortBy("newest");
  };

  const handleFilterChange = (next: FilterState) => {
    if (next.useCurrentLocation === false) {
      setCurrentLocation(null);
      setSchoolsInArea(null);
    }
    setFilters(next);
  };

  const handleLocationSuccess = (coords: { lat: number; lng: number }) => {
    if (!allProperties?.length) return;
    setCurrentLocation(coords);
    // Use the nearest listing (within 50 km) to work out which region the student is in.
    let closest: Property | null = null;
    let minDistance = Infinity;
    for (const p of allProperties) {
      if (!p.location.lat || !p.location.lng) continue;
      const d = haversineDistance(coords, { lat: p.location.lat, lng: p.location.lng });
      if (d < minDistance) [closest, minDistance] = [p, d];
    }
    if (closest && minDistance < 50) {
      const region = closest.location;
      setSchoolsInArea([...new Set(allProperties.filter((p) => p.location.state === region.state && p.location.school).map((p) => p.location.school!))]);
      setFilters((f) => ({ ...f, useCurrentLocation: true, country: region.country, state: region.state, school: undefined }));
    } else {
      setSchoolsInArea([]);
      setFilters((f) => ({ ...f, useCurrentLocation: true }));
    }
  };

  const school = profile?.school;
  const sections = useMemo(() => {
    const all = allProperties ?? [];
    if (all.length < MIN_FOR_SECTIONS) return [];
    const schoolKey = school?.toLowerCase();
    const prices = all.map((p) => convertCurrency(p.price, p.currency, userCurrency)).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    const candidates = [
      { id: "near-school", title: school ? `Near ${school}` : "", items: schoolKey ? all.filter((p) => p.location.school?.toLowerCase() === schoolKey) : [] },
      { id: "new", title: "Just listed", items: [...all].sort((a, b) => b.id.localeCompare(a.id)) },
      {
        id: "budget",
        title: "Good value",
        items: all.filter((p) => convertCurrency(p.price, p.currency, userCurrency) <= median).sort((a, b) => a.price - b.price),
      },
      { id: "well-equipped", title: "Well equipped", items: all.filter((p) => (p.amenities?.length ?? 0) >= 5) },
    ];
    const seeAll: Record<string, (() => void) | undefined> = {
      "near-school": school ? () => setFilters((f) => ({ ...f, school })) : undefined,
      budget: () => setSortBy("price-asc"),
    };
    return candidates
      .filter((s) => s.title && s.items.length > 0)
      .map((s) => ({ ...s, items: s.items.slice(0, SECTION_SIZE), seeAll: s.items.length > SECTION_SIZE || s.id === "near-school" ? seeAll[s.id] : undefined }));
  }, [allProperties, school, userCurrency]);

  const loading = (isUserLoading || arePropertiesLoading) && !initialProperties;
  if (loading) return <BrowserSkeleton inDashboard={inDashboard} />;

  const total = allProperties?.length ?? 0;

  return (
    <div className={cn("space-y-6", !inDashboard && "py-8")}>
      {inDashboard ? (
        <PageHeader title="Browse homes" description={`${total} home${total === 1 ? "" : "s"} available to rent right now.`} />
      ) : (
        <header>
          <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Find your student home</h1>
          <p className="mt-2 text-muted-foreground">
            {total} home{total === 1 ? "" : "s"} available near campus. Request one in minutes, free.
          </p>
        </header>
      )}

      {/* Toolbar */}
      <div className={cn("space-y-3", !inDashboard && "sticky top-16 z-20 -mx-4 bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0")}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search aria-hidden className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by area, university or name"
              aria-label="Search homes"
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-11 rounded-xl px-3 sm:px-4">
                <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Filters</span>
                {userFilterCount > 0 && (
                  <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
                    {userFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
              <SheetHeader className="border-b p-5 text-left">
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>{results.length} homes match</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5">
                <SearchFilters
                  onFilterChange={handleFilterChange}
                  initialFilters={filters}
                  onLocationSuccess={handleLocationSuccess}
                  schoolsInArea={schoolsInArea}
                  availableStates={availableStates}
                  userCurrency={userCurrency}
                />
              </div>
              <div className="flex gap-2 border-t p-4">
                <Button variant="ghost" className="flex-1" onClick={resetFilters}>
                  Clear all
                </Button>
                <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                  Show {results.length} home{results.length === 1 ? "" : "s"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="hidden h-11 w-44 rounded-xl sm:flex" aria-label="Sort homes">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick type filters */}
        {types.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {[{ value: "any", label: "All types" }, ...types.map((t) => ({ value: t, label: t }))].map((t) => {
              const active = (filters.propertyType || "any") === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilters((f) => ({ ...f, propertyType: t.value === "any" ? undefined : t.value }))}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    active ? "border-foreground bg-foreground text-background" : "hover:bg-accent",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {total === 0 ? (
        <EmptyState icon={HomeIcon} title="No homes listed yet" description="New homes are added every week. Check back soon." />
      ) : isSearching ? (
        <section aria-live="polite" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 text-sm font-medium">
              {results.length} home{results.length === 1 ? "" : "s"}
            </p>
            {chips.map((chip) => (
              <button
                key={`${chip.key}-${chip.label}`}
                type="button"
                onClick={() => removeChip(chip)}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/70"
                aria-label={`Remove filter ${chip.label}`}
              >
                {chip.label} <X aria-hidden className="h-3 w-3" />
              </button>
            ))}
            {chips.length > 1 && (
              <button type="button" onClick={resetFilters} className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
                Clear all
              </button>
            )}
          </div>
          {results.length ? (
            <ResultsGrid properties={results} />
          ) : (
            <EmptyState
              icon={Search}
              title="No homes match"
              description="Try removing a filter or searching a nearby area."
              action={
                <Button variant="outline" className="rounded-xl" onClick={resetFilters}>
                  Clear all filters
                </Button>
              }
            />
          )}
        </section>
      ) : sections.length ? (
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`row-${section.id}`}>
              <div className="mb-3 flex items-end justify-between gap-4">
                <h2 id={`row-${section.id}`} className="font-headline text-lg font-bold tracking-tight sm:text-xl">
                  {section.title}
                </h2>
                {section.seeAll && (
                  <button
                    type="button"
                    onClick={section.seeAll}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    See all <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {section.items.map((p, i) => (
                  <div key={p.id} className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[calc(25%-0.75rem)]">
                    <PropertyCard property={p} priority={i < 2} />
                  </div>
                ))}
              </div>
            </section>
          ))}
          <section aria-labelledby="row-all">
            <h2 id="row-all" className="mb-3 font-headline text-lg font-bold tracking-tight sm:text-xl">
              All homes
            </h2>
            <ResultsGrid properties={results} />
          </section>
        </div>
      ) : (
        <ResultsGrid properties={results} />
      )}
    </div>
  );
}

function ResultsGrid({ properties }: { properties: Property[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {properties.map((p, i) => (
        <li key={p.id}>
          <PropertyCard property={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}

function BrowserSkeleton({ inDashboard }: { inDashboard: boolean }) {
  return (
    <div className={cn("space-y-6", !inDashboard && "py-8")} aria-busy="true" aria-label="Loading homes">
      <Skeleton className="h-9 w-64 rounded-lg" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="aspect-[4/3] rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
