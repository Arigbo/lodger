"use client";

import { useState, useEffect, useMemo } from "react";
import PropertyCard from "@/components/property-card";
import SearchFilters from "@/components/search-filters";
import type { Property, UserProfile } from "@/types";
import type { FilterState } from "@/components/search-filters";
import {
  Search,
  SlidersHorizontal,
  MapPin as MapPinIcon,
  Home as HomeIcon,
  X,
} from "lucide-react";
import { haversineDistance, cn } from "@/utils";
import { getCurrencyByCountry, convertCurrency } from "@/utils/currencies";
import {
  useUser,
  useFirestore,
  useCollection,
  useDoc,
  useMemoFirebase,
} from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import Loading from "@/app/loading";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  Landmark,
  Sparkles,
  TrendingUp,
  Star,
} from "lucide-react";

function PropertySection({
  title,
  description,
  properties,
  icon: Icon,
  delay = 0,
}: {
  title: string;
  description?: string;
  properties: Property[];
  icon: any;
  delay?: number;
}) {
  if (properties.length === 0) return null;

  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-[10px] md:text-xs">
          <Icon className="h-3.5 w-3.5 md:h-4 w-4" />
          <span>{title}</span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl md:text-3xl font-black tracking-tight leading-tight">
            {description || `Premium ${title}`}
          </h2>
        </div>
      </div>

      {/* Horizontal Scroll Carousel */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-8 pt-2 px-4 sm:px-6 lg:px-8 no-scrollbar scroll-smooth snap-x snap-mandatory">
          {properties.map((property, idx) => (
            <div
              key={property.id}
              className="min-w-[85vw] sm:min-w-[380px] lg:min-w-[420px] snap-start"
            >
              <PropertyCard
                property={property}
                className="h-full shadow-lg shadow-black/[0.03]"
              />
            </div>
          ))}
          {/* Final spacer for edge-to-edge feel */}
          <div className="min-w-[20px] sm:min-w-[40px] shrink-0" />
        </div>
      </div>
    </div>
  );
}

// Mock coordinates for major state centers removed in favor of dynamic property-based detection

export default function PropertiesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [user, firestore],
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  const propertiesQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, "properties"),
        where("status", "==", "available"),
      ),
    [firestore],
  );
  const { data: allProperties, isLoading: arePropertiesLoading } =
    useCollection<Property>(propertiesQuery);

  const [filters, setFilters] = useState<FilterState>({
    useCurrentLocation: false,
  });
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [schoolsInArea, setSchoolsInArea] = useState<string[] | null>(null);
  const [hasAppliedDefaults, setHasAppliedDefaults] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const userCurrency = useMemo(() => {
    if (userProfile?.currency) return userProfile.currency;
    if (userProfile?.country) return getCurrencyByCountry(userProfile.country);
    return "USD";
  }, [userProfile]);

  const availableStates = useMemo(() => {
    if (!allProperties) return [];
    let props = allProperties;
    if (filters.country) {
      props = props.filter((p) => p.location.country === filters.country);
    }
    return [...new Set(props.map((p) => p.location.state))];
  }, [allProperties, filters.country]);

  useEffect(() => {
    if (userProfile && !hasAppliedDefaults) {
      setFilters((prev) => ({
        ...prev,
        country: userProfile.country || prev.country,
        state: userProfile.state || prev.state,
        school: userProfile.school || prev.school,
      }));
      setHasAppliedDefaults(true);
    }
  }, [userProfile, hasAppliedDefaults]);

  useEffect(() => {
    if (!allProperties) return;
    let properties = allProperties;

    // Filter by availability first (already done in the query, but good for safety)
    properties = properties.filter((p) => p.status === "available");

    if (filters.useCurrentLocation && currentLocation) {
      properties = properties.filter((p) => {
        if (p.location.lat && p.location.lng) {
          const distance = haversineDistance(currentLocation, {
            lat: p.location.lat,
            lng: p.location.lng,
          });
          return distance < 10; // 10km radius
        }
        return false;
      });
    } else {
      if (filters.country) {
        properties = properties.filter(
          (p) => p.location.country === filters.country,
        );
      }

      if (filters.state) {
        properties = properties.filter((p) =>
          p.location.state.toLowerCase().includes(filters.state!.toLowerCase()),
        );
      }

      if (filters.city) {
        properties = properties.filter((p) =>
          p.location.city.toLowerCase().includes(filters.city!.toLowerCase()),
        );
      }

      if (filters.school) {
        properties = properties.filter((p) =>
          p.location.school
            ?.toLowerCase()
            .includes(filters.school!.toLowerCase()),
        );
      }
    }

    if (filters.price) {
      properties = properties.filter((p) => {
        const priceInUserCurrency = convertCurrency(
          p.price,
          p.currency,
          userCurrency,
        );
        return priceInUserCurrency <= filters.price!;
      });
    }

    if (filters.propertyType && filters.propertyType !== "any") {
      properties = properties.filter((p) => p.type === filters.propertyType);
    }

    if (filters.bedrooms && filters.bedrooms !== "any") {
      if (filters.bedrooms === "4") {
        properties = properties.filter((p) => p.bedrooms >= 4);
      } else {
        properties = properties.filter(
          (p) => p.bedrooms === parseInt(filters.bedrooms!),
        );
      }
    }

    if (filters.bathrooms && filters.bathrooms !== "any") {
      if (filters.bathrooms === "3") {
        properties = properties.filter((p) => p.bathrooms >= 3);
      } else {
        properties = properties.filter(
          (p) => p.bathrooms === parseInt(filters.bathrooms!),
        );
      }
    }

    if (filters.amenities && filters.amenities.length > 0) {
      properties = properties.filter((p) =>
        filters.amenities!.every((amenity) => p.amenities.includes(amenity)),
      );
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      properties = properties.filter(
        (p) =>
          p.title.toLowerCase().includes(lowerQuery) ||
          p.location.address.toLowerCase().includes(lowerQuery) ||
          p.location.city.toLowerCase().includes(lowerQuery) ||
          p.location.state.toLowerCase().includes(lowerQuery) ||
          p.location.school?.toLowerCase().includes(lowerQuery) ||
          p.type.toLowerCase().includes(lowerQuery),
      );
    }

    // Sorting
    properties.sort((a, b) => {
      const priceA = convertCurrency(a.price, a.currency, userCurrency);
      const priceB = convertCurrency(b.price, b.currency, userCurrency);

      switch (sortBy) {
        case "price-asc":
          return priceA - priceB;
        case "price-desc":
          return priceB - priceA;
        case "bedrooms-desc":
          return b.bedrooms - a.bedrooms;
        case "area-desc":
          return b.area - a.area;
        case "newest":
        default:
          return b.id.localeCompare(a.id); // Fallback to ID for reverse chronological-ish order
      }
    });

    setFilteredProperties(properties);
  }, [
    filters,
    currentLocation,
    allProperties,
    searchQuery,
    sortBy,
    userCurrency,
  ]);

  const sections = useMemo(() => {
    if (!allProperties || allProperties.length === 0) return [];

    const nearSchool = allProperties.filter(
      (p) =>
        userProfile?.school &&
        p.location.school?.toLowerCase() === userProfile.school.toLowerCase(),
    );

    const inCity = allProperties.filter(
      (p) =>
        userProfile?.city &&
        p.location.city?.toLowerCase() === userProfile.city.toLowerCase(),
    );

    const budgetFriendly = [...allProperties].sort((a, b) => {
      const priceA = convertCurrency(a.price, a.currency, userCurrency);
      const priceB = convertCurrency(b.price, b.currency, userCurrency);
      return priceA - priceB;
    });

    // Refined "Highly Recommended" Logic (Multi-factor ranking)
    const highlyRecommended = [...allProperties].sort((a, b) => {
      const getScore = (p: Property) => {
        let score = 0;
        // Amenities count (0-50 points)
        score += Math.min((p.amenities?.length || 0) * 5, 50);

        // Proximity to student's school (50 points)
        if (
          userProfile?.school &&
          p.location.school?.toLowerCase() === userProfile.school.toLowerCase()
        ) {
          score += 50;
        }

        return score;
      };

      const scoreA = getScore(a);
      const scoreB = getScore(b);

      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.id.localeCompare(a.id); // Tie-breaker: Newest first
    });

    const recentlyAdded = [...allProperties].sort((a, b) =>
      b.id.localeCompare(a.id),
    );

    return [
      {
        id: "near-school",
        title: "Near Your School",
        description: `Apartments near ${userProfile?.school || "University"}`,
        icon: GraduationCap,
        properties: nearSchool,
      },
      {
        id: "recommended",
        title: "Highly Recommended",
        description: "Curated premium homes for you",
        icon: Star,
        properties: highlyRecommended,
      },
      {
        id: "in-city",
        title: "In Your City",
        description: `Best listings in ${userProfile?.city || "your area"}`,
        icon: Landmark,
        properties: inCity,
      },
      {
        id: "budget",
        title: "Budget Friendly",
        description: "Premium homes within your reach",
        icon: TrendingUp,
        properties: budgetFriendly,
      },
      {
        id: "recent",
        title: "Recently Added",
        description: "Freshly listed for you",
        icon: Sparkles,
        properties: recentlyAdded,
      },
    ];
  }, [allProperties, userProfile, userCurrency]);

  const isSearching = useMemo(() => {
    if (searchQuery.trim().length > 0) return true;

    // Count non-default filters
    const activeFilterCount = Object.keys(filters).filter((k) => {
      if (k === "useCurrentLocation") return filters[k];
      if (filters[k as keyof FilterState] === undefined) return false;
      if (k === "amenities") return filters[k] && filters[k]!.length > 0;
      // Ignore defaults applied from profile
      if (
        ["country", "state", "school"].includes(k) &&
        filters[k as keyof FilterState] ===
          userProfile?.[k as keyof UserProfile]
      )
        return false;
      return true;
    }).length;

    return activeFilterCount > 0 || sortBy !== "newest";
  }, [filters, searchQuery, sortBy, userProfile]);

  const handleFilterChange = (newFilters: FilterState) => {
    if (newFilters.useCurrentLocation === false) {
      setCurrentLocation(null);
      setSchoolsInArea(null);
    }
    setFilters(newFilters);
  };

  const handleLocationSuccess = (coords: { lat: number; lng: number }) => {
    if (!allProperties || allProperties.length === 0) return;
    setCurrentLocation(coords);

    // Find the closest property to determine the user's current region
    let closestProperty: Property | null = null;
    let minDistance = Infinity;

    for (const property of allProperties) {
      if (property.location.lat && property.location.lng) {
        const distance = haversineDistance(coords, {
          lat: property.location.lat,
          lng: property.location.lng,
        });
        if (distance < minDistance) {
          minDistance = distance;
          closestProperty = property;
        }
      }
    }

    // If we found a property within a reasonable range (e.g. 50km), we assume the user is in that region
    // defaulting to the country/state/city of that property.
    if (closestProperty && minDistance < 50) {
      const regionState = closestProperty.location.state;
      const regionCountry = closestProperty.location.country;

      // Find all schools in this state to populate the dropdown
      const schools = [
        ...new Set(
          allProperties
            .filter(
              (p) => p.location.state === regionState && p.location.school,
            )
            .map((p) => p.location.school!),
        ),
      ];

      setSchoolsInArea(schools);

      setFilters((prev) => ({
        ...prev,
        useCurrentLocation: true,
        country: regionCountry,
        state: regionState,
        // We don't automatically set city as that might be too specific, but we set the broader region
        school: undefined,
      }));
    } else {
      // If no property is close, we still enable location search (filtering by radius)
      // but we don't pre-select filters because we can't determine a supported region.
      setSchoolsInArea([]);
      setFilters((prev) => ({
        ...prev,
        useCurrentLocation: true,
      }));
    }
  };

  const resetFilters = () => {
    // Reset all filters to an empty state
    setFilters({
      country: undefined,
      state: undefined,
      city: undefined,
      school: undefined,
      useCurrentLocation: false,
      price: undefined,
      propertyType: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      amenities: [],
    });
    setCurrentLocation(null);
    setSchoolsInArea(null);
    setSearchQuery("");
    setSortBy("newest");
  };

  const isLoading = isProfileLoading || arePropertiesLoading;

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="w-full py-8 space-y-12 animate-in fade-in duration-700 overflow-x-visible">
      {/* Simple Search & Filter Section */}
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase">
            Find <span className="text-primary">Property.</span>
          </h1>
          <div className="h-1 w-12 bg-primary rounded-full" />
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="relative group flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name, city, or university..."
              className="h-14 pl-14 pr-6 rounded-2xl border-muted/20 bg-white shadow-sm text-lg font-medium placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary/10 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Mobile: Sheet */}
            <div className="lg:hidden w-full">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-14 w-full rounded-2xl px-6 gap-3 border-muted/20 bg-white shadow-sm font-bold hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                    Filters
                    <Badge className="bg-primary/10 text-primary border-none font-black h-5 w-5 p-0 flex items-center justify-center">
                      {
                        Object.keys(filters).filter(
                          (k) =>
                            filters[k as keyof FilterState] !== undefined &&
                            filters[k as keyof FilterState] !== false,
                        ).length
                      }
                    </Badge>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="h-[90vh] p-0 rounded-t-3xl"
                >
                  <div className="bg-muted/30 p-6 border-b flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">
                      Filter Properties
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="text-primary hover:text-primary hover:bg-primary/10 font-bold rounded-xl px-4"
                    >
                      Reset
                    </Button>
                  </div>
                  <div className="h-[calc(90vh-80px)] overflow-y-auto p-6 custom-scrollbar">
                    <SearchFilters
                      onFilterChange={handleFilterChange}
                      onReset={resetFilters}
                      initialFilters={filters}
                      onLocationSuccess={handleLocationSuccess}
                      schoolsInArea={schoolsInArea}
                      availableStates={availableStates}
                      userCurrency={userCurrency}
                      className="border-0 shadow-none p-0"
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop: Popover */}
            <div className="hidden lg:block">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-14 rounded-2xl px-6 gap-3 border-muted/20 bg-white shadow-sm font-bold hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                    Filters
                    <Badge className="bg-primary/10 text-primary border-none font-black h-5 w-5 p-0 flex items-center justify-center">
                      {
                        Object.keys(filters).filter(
                          (k) =>
                            filters[k as keyof FilterState] !== undefined &&
                            filters[k as keyof FilterState] !== false,
                        ).length
                      }
                    </Badge>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[90vw] max-w-[500px] p-0 rounded-3xl overflow-hidden border-none shadow-2xl mt-2"
                  align="end"
                >
                  <div className="bg-muted/30 p-6 border-b flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">
                      Filter Properties
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="text-primary hover:text-primary hover:bg-primary/10 font-bold rounded-xl px-4"
                    >
                      Reset
                    </Button>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto p-6 custom-scrollbar">
                    <SearchFilters
                      onFilterChange={handleFilterChange}
                      onReset={resetFilters}
                      initialFilters={filters}
                      onLocationSuccess={handleLocationSuccess}
                      schoolsInArea={schoolsInArea}
                      availableStates={availableStates}
                      userCurrency={userCurrency}
                      className="border-0 shadow-none p-0"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-14 w-full lg:w-[220px] rounded-2xl border-muted/20 bg-white shadow-sm font-bold px-6 focus:ring-2 focus:ring-primary/10">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-3xl p-2 mt-2">
                <SelectItem
                  value="newest"
                  className="rounded-xl py-2.5 font-bold"
                >
                  Newest First
                </SelectItem>
                <SelectItem
                  value="price-asc"
                  className="rounded-xl py-2.5 font-bold"
                >
                  Price: Low to High
                </SelectItem>
                <SelectItem
                  value="price-desc"
                  className="rounded-xl py-2.5 font-bold"
                >
                  Price: High to Low
                </SelectItem>
                <SelectItem
                  value="bedrooms-desc"
                  className="rounded-xl py-2.5 font-bold"
                >
                  Bedrooms: Most First
                </SelectItem>
                <SelectItem
                  value="area-desc"
                  className="rounded-xl py-2.5 font-bold"
                >
                  Area: Largest First
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-16">
        {!allProperties || allProperties.length === 0 ? (
          /* System Empty State (No properties listed yet) */
          <Card className="overflow-hidden border-none bg-white shadow-xl shadow-black/[0.02]">
            <CardContent className="flex flex-col items-center justify-center py-32 text-center">
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className="relative flex h-40 w-40 items-center justify-center rounded-[3rem] bg-muted/30">
                  <HomeIcon className="h-20 w-20 text-primary opacity-20" />
                </div>
              </div>
              <h3 className="text-4xl font-black tracking-tight">
                Landlords are trying to give you the best
              </h3>
              <p className="mx-auto mt-6 max-w-sm text-xl font-medium text-muted-foreground/80 leading-relaxed">
                Check back soon! We are currently synchronizing with premium
                residences for the modern student.
              </p>
            </CardContent>
          </Card>
        ) : isSearching ? (
          /* Search Results View */
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight">
                {filteredProperties.length} Homes Found
              </h2>
              {searchQuery && (
                <p className="text-muted-foreground font-medium">
                  Showing results for &quot;
                  <span className="text-foreground font-bold">
                    {searchQuery}
                  </span>
                  &quot;
                </p>
              )}
            </div>

            {filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {filteredProperties.map((property, idx) => (
                  <div
                    key={property.id}
                    className="animate-in fade-in slide-in-from-bottom-6 duration-700 hover:-translate-y-2 transition-all"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <PropertyCard property={property} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden border-none bg-white shadow-xl shadow-black/[0.02]">
                <CardContent className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="relative mb-12">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="relative flex h-40 w-40 items-center justify-center rounded-[3rem] bg-muted/30">
                      <Search className="h-20 w-20 text-primary opacity-20" />
                    </div>
                  </div>
                  <h3 className="text-4xl font-black tracking-tight">
                    No homes match your search
                  </h3>
                  <p className="mx-auto mt-6 max-w-sm text-xl font-medium text-muted-foreground/80 leading-relaxed">
                    Try adjusting your filters or search terms to find more
                    accommodations.
                  </p>
                  <Button
                    size="lg"
                    variant="outline"
                    className="mt-12 rounded-2xl px-12 h-14 font-black text-lg border-primary/20 hover:bg-primary/5"
                    onClick={resetFilters}
                  >
                    Reset All Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Curated Sections View */
          <div className="space-y-20">
            {sections.map((section, idx) => (
              <PropertySection
                key={section.id}
                title={section.title}
                description={section.description}
                icon={section.icon}
                properties={section.properties}
                delay={idx * 100}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
