"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  Bath,
  BedDouble,
  Building2,
  ChevronLeft,
  GraduationCap,
  Heart,
  Info,
  MapPin,
  MessageSquare,
  Ruler,
  Share2,
  ShieldCheck,
  Star,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { EmptyState } from "@/components/dashboard";
import PropertyCard from "@/components/properties/property-card";
import { PropertyGallery } from "@/components/properties/property-gallery";
import {
  RequestToRent,
  useRentState,
} from "@/components/properties/request-to-rent";
import { ReviewDialog } from "@/components/properties/review-dialog";
import { SharePropertyModal } from "@/components/properties/share-property-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
} from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { AMENITY_ICONS, DEFAULT_ICON } from "@/lib/amenity-icons";
import { convertCurrency, getCurrencyByCountry } from "@/lib/currencies";
import { cn, formatPrice } from "@/lib/utils";
import type { Property, PropertyReview, UserProfile } from "@/types";

const PropertyMap = dynamic(
  () => import("@/components/properties/property-map"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
);

const AMENITIES_PREVIEW = 8;

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("flex", className)} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            "h-3.5 w-3.5",
            i < Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t pt-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-headline text-xl font-bold tracking-tight">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function PropertyDetail({
  initialProperty,
  propertyId,
}: {
  initialProperty: Property | null;
  propertyId: string;
}) {
  const firestore = useFirestore();
  const pathname = usePathname();
  const inDashboard = pathname.startsWith("/student");
  const browseHref = inDashboard ? "/student/properties" : "/properties";

  const propertyRef = useMemoFirebase(
    () => doc(firestore, "properties", propertyId),
    [firestore, propertyId],
  );
  const { data: live, isLoading } = useDoc<Property>(propertyRef);
  const property = live || initialProperty;

  const landlordRef = useMemoFirebase(
    () =>
      property?.landlordId
        ? doc(firestore, "users", property.landlordId)
        : null,
    [firestore, property?.landlordId],
  );
  const { data: landlord } = useDoc<UserProfile>(landlordRef);

  const reviewsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, "propertyReviews"),
        where("propertyId", "==", propertyId),
      ),
    [firestore, propertyId],
  );
  const { data: reviews } = useCollection<PropertyReview>(reviewsQuery);

  const city = property?.location?.city;
  const similarQuery = useMemoFirebase(
    () =>
      city
        ? query(
            collection(firestore, "properties"),
            where("status", "==", "available"),
            where("location.city", "==", city),
            limit(4),
          )
        : null,
    [firestore, city],
  );
  const { data: cityHomes } = useCollection<Property>(similarQuery);

  if (!property && isLoading) {
    return (
      <div
        className={cn(
          "space-y-6",
          !inDashboard && "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8",
        )}
        aria-busy="true"
      >
        <Skeleton className="h-8 w-2/3 rounded-xl" />
        <Skeleton className="aspect-[2/1] w-full rounded-2xl" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    );
  }

  if (!property) {
    return (
      <EmptyState
        className="mx-auto my-16 max-w-xl"
        icon={Building2}
        title="This home isn't available"
        description="It may have been removed by the landlord."
        action={
          <Button asChild className="rounded-xl">
            <Link href={browseHref}>Browse other homes</Link>
          </Button>
        }
      />
    );
  }

  return (
    <PropertyView
      property={property}
      landlord={landlord}
      reviews={reviews ?? []}
      cityHomes={cityHomes ?? []}
      inDashboard={inDashboard}
      browseHref={browseHref}
    />
  );
}

type PropertyViewProps = {
  property: Property;
  landlord: UserProfile | null;
  reviews: PropertyReview[];
  cityHomes: Property[];
  inDashboard: boolean;
  browseHref: string;
};

function PropertyView({
  property,
  landlord,
  reviews,
  cityHomes,
  inDashboard,
  browseHref,
}: PropertyViewProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useUser();
  const [shareOpen, setShareOpen] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const rentState = useRentState(property);
  const isStudent = profile?.role === "student";
  const saved = !!profile?.bookmarkedPropertyIds?.includes(property.id);
  const rating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const viewerCurrency =
    profile?.currency ||
    (profile?.country ? getCurrencyByCountry(profile.country) : undefined);
  const converted =
    viewerCurrency && viewerCurrency !== property.currency
      ? formatPrice(
          convertCurrency(property.price, property.currency, viewerCurrency),
          viewerCurrency,
        )
      : null;
  const address = [
    property.location?.address,
    property.location?.city,
    property.location?.state,
  ]
    .filter(Boolean)
    .join(", ");
  const hasMap = !!(property.location?.lat && property.location?.lng);
  const amenities = Array.isArray(property.amenities) ? property.amenities : [];
  const rules = Array.isArray(property.rules)
    ? property.rules
    : property.rules
      ? [String(property.rules)]
      : [];
  const similar = cityHomes.filter((p) => p.id !== property.id).slice(0, 3);
  const alreadyReviewed =
    !!user && reviews.some((r) => r.tenantId === user.uid);
  const canContact =
    rentState.kind !== "owner" && rentState.kind !== "other-landlord";
  const loginHref = `/auth/login?redirect=${encodeURIComponent(`/student/properties/${property.id}`)}`;

  const toggleSave = async () => {
    if (!user) return router.push(loginHref);
    if (!isStudent)
      return toast({ title: "Saving homes is for student accounts" });
    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        bookmarkedPropertyIds: saved
          ? arrayRemove(property.id)
          : arrayUnion(property.id),
      });
      toast({
        title: saved ? "Removed from saved homes" : "Saved",
        description: saved ? undefined : "Find it any time under Saved homes.",
      });
    } catch (error) {
      console.error("Saving home failed:", error);
      toast({ variant: "destructive", title: "Could not update saved homes" });
    }
  };

  const messageLandlord = () => {
    if (!user) return router.push(loginHref);
    if (landlord)
      router.push(`/student/messages?conversationId=${landlord.id}`);
  };

  const price = (
    <>
      <span className="text-2xl font-bold tracking-tight">
        {formatPrice(property.price, property.currency)}
      </span>
      <span className="text-sm text-muted-foreground"> / month</span>
    </>
  );

  return (
    <div
      className={cn(
        "pb-28 lg:pb-12",
        !inDashboard && "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
      )}
    >
      <Link
        href={browseHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" /> All homes
      </Link>

      {/* Title */}
      <header className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {property.type}
            {property.status !== "available" && (
              <span className="ml-2 text-muted-foreground">
                · Currently let
              </span>
            )}
          </p>
          <h1 className="mt-1 font-headline text-2xl font-bold tracking-tight sm:text-3xl">
            {property.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin aria-hidden className="h-4 w-4" /> {address}
            </span>
            {property.location?.school && (
              <span className="flex items-center gap-1">
                <GraduationCap aria-hidden className="h-4 w-4" /> Near{" "}
                {property.location.school}
              </span>
            )}
            {reviews.length > 0 && (
              <a
                href="#reviews"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Star
                  aria-hidden
                  className="h-4 w-4 fill-amber-400 text-amber-400"
                />
                <span className="font-medium text-foreground">
                  {rating.toFixed(1)}
                </span>{" "}
                ({reviews.length})
              </a>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="mr-1.5 h-4 w-4" /> Share
          </Button>
          {rentState.kind !== "owner" &&
            rentState.kind !== "other-landlord" && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-lg",
                  saved && "border-red-200 text-red-600 hover:text-red-600",
                )}
                onClick={toggleSave}
                aria-pressed={saved}
              >
                <Heart
                  className={cn("mr-1.5 h-4 w-4", saved && "fill-current")}
                />{" "}
                {saved ? "Saved" : "Save"}
              </Button>
            )}
        </div>
      </header>

      <PropertyGallery
        className="mt-6"
        images={property.images ?? []}
        videos={property.videos}
        title={property.title}
      />

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          {/* Key facts */}
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {[
              {
                icon: BedDouble,
                text: `${property.bedrooms} bedroom${property.bedrooms === 1 ? "" : "s"}`,
              },
              {
                icon: Bath,
                text: `${property.bathrooms} bathroom${property.bathrooms === 1 ? "" : "s"}`,
              },
              ...(property.area
                ? [{ icon: Ruler, text: `${property.area} sq ft` }]
                : []),
              { icon: Building2, text: property.type },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <span className="rounded-lg bg-muted p-2">
                  <Icon aria-hidden className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          {property.description && (
            <Section title="About this home">
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                {property.description}
              </p>
            </Section>
          )}

          {amenities.length > 0 && (
            <Section title="What this home offers">
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(showAllAmenities
                  ? amenities
                  : amenities.slice(0, AMENITIES_PREVIEW)
                ).map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity] || DEFAULT_ICON;
                  return (
                    <li
                      key={amenity}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Icon
                        aria-hidden
                        className="h-5 w-5 text-muted-foreground"
                      />{" "}
                      {amenity}
                    </li>
                  );
                })}
              </ul>
              {amenities.length > AMENITIES_PREVIEW && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-lg"
                  onClick={() => setShowAllAmenities((v) => !v)}
                >
                  {showAllAmenities
                    ? "Show fewer"
                    : `Show all ${amenities.length} amenities`}
                </Button>
              )}
            </Section>
          )}

          {rules.length > 0 && (
            <Section title="House rules">
              <ul className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {rules.map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    />{" "}
                    {rule}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Where you'll live">
            {hasMap && (
              <PropertyMap
                lat={Number(property.location.lat)}
                lng={Number(property.location.lng)}
                title={property.title}
                className="relative z-0 h-72 w-full overflow-hidden rounded-2xl border"
              />
            )}
            <p className="mt-3 text-sm">
              {address}
              {property.location?.school && (
                <span className="text-muted-foreground">
                  {" "}
                  · near {property.location.school}
                </span>
              )}
            </p>
          </Section>

          <div id="reviews" className="scroll-mt-24">
            <Section
              title={
                reviews.length
                  ? `${rating.toFixed(1)} · ${reviews.length} review${reviews.length === 1 ? "" : "s"}`
                  : "Reviews"
              }
              action={
                <ReviewDialog
                  propertyId={property.id}
                  alreadyReviewed={alreadyReviewed}
                />
              }
            >
              {reviews.length ? (
                <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {reviews.map((review) => (
                    <li key={review.id} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={review.tenantImageUrl} alt="" />
                          <AvatarFallback>
                            {review.tenantName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {review.tenantName ?? "Former tenant"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.reviewDate).toLocaleDateString(
                              undefined,
                              { month: "long", year: "numeric" },
                            )}
                          </p>
                        </div>
                      </div>
                      <Stars value={review.rating} />
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {review.comment}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reviews yet. Students who rent here can review it
                  afterwards.
                </p>
              )}
            </Section>
          </div>

          {landlord && (
            <Section title="Your landlord">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={landlord.profileImageUrl} alt="" />
                  <AvatarFallback className="text-lg">
                    {landlord.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{landlord.name}</p>
                  {landlord.createdAt && (
                    <p className="text-sm text-muted-foreground">
                      On Lodger since{" "}
                      {new Date(landlord.createdAt).getFullYear()}
                    </p>
                  )}
                  {landlord.bio && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {landlord.bio}
                    </p>
                  )}
                  {canContact && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={messageLandlord}
                      >
                        <MessageSquare className="mr-1.5 h-4 w-4" /> Message{" "}
                        {landlord.name.split(" ")[0]}
                      </Button>
                      {landlord.whatsappUrl && user && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                        >
                          <a
                            href={landlord.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FaWhatsapp className="mr-1.5 h-4 w-4" /> WhatsApp
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-6 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                Keep payments in Lodger. Never send money before you&apos;ve
                signed the lease here.
              </p>
            </Section>
          )}
        </div>

        {/* Booking card */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
            <div>
              <p>{price}</p>
              {converted && (
                <p className="text-xs text-muted-foreground">
                  About {converted} / month
                </p>
              )}
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    property.status === "available"
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/40",
                  )}
                />
                {property.status === "available"
                  ? "Available to rent"
                  : "Currently let"}
              </li>
              <li className="flex items-center gap-2">
                <BedDouble aria-hidden className="h-4 w-4" />{" "}
                {property.bedrooms} bed · {property.bathrooms} bath
              </li>
            </ul>
            <RequestToRent
              property={property}
              landlord={landlord}
              state={rentState}
            />
            {canContact && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={messageLandlord}
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Ask a question
              </Button>
            )}
            {rentState.kind === "open" && (
              <p className="flex gap-2 text-xs text-muted-foreground">
                <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Requesting is free. You only pay after the landlord accepts and
                you sign the lease.
              </p>
            )}
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16 border-t pt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-headline text-xl font-bold tracking-tight">
                More homes in {property.location?.city}
              </h2>
              <p className="text-sm text-muted-foreground">Available now</p>
            </div>
            <Link
              href={browseHref}
              className="text-sm font-medium text-primary hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile action bar */}
      <div
        className={cn(
          "fixed inset-x-0 z-30 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden",
          inDashboard
            ? "bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0"
            : "bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        )}
      >
        <div className="min-w-0">
          <p className="truncate">{price}</p>
          {converted && (
            <p className="truncate text-xs text-muted-foreground">
              About {converted}
            </p>
          )}
        </div>
        <RequestToRent
          property={property}
          landlord={landlord}
          state={rentState}
          compact
        />
      </div>

      <SharePropertyModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        propertyId={property.id}
        propertyTitle={property.title}
      />
    </div>
  );
}
