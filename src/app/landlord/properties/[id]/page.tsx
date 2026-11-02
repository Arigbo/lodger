"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Bath,
  BedDouble,
  Building2,
  CheckCircle2,
  ExternalLink,
  Flag,
  Inbox,
  MapPin,
  MessageSquare,
  Pencil,
  Ruler,
  Share2,
  Star,
  UserRound,
  Wallet,
} from "lucide-react";
import { collection, doc, query, where } from "firebase/firestore";
import { EmptyState, PageHeader, PageSkeleton, SectionCard, StatCard, StatGrid, StatusBadge } from "@/components/dashboard";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { SharePropertyModal } from "@/components/properties/share-property-modal";
import { ReportUserDialog } from "@/components/shared/report-user-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { useAsyncResult } from "@/hooks/use-async-result";
import { AMENITY_ICONS, DEFAULT_ICON } from "@/lib/amenity-icons";
import { fetchDocsByIds } from "@/lib/firestore-batch";
import { cn, formatPrice } from "@/lib/utils";
import type { Property, PropertyReview, RentalApplication, UserProfile } from "@/types";

const PropertyMap = dynamic(() => import("@/components/properties/property-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

/** What a listing needs to attract (and be able to accept) tenants. */
function listingChecklist(property: Property) {
  return [
    { label: "At least 5 photos", done: (property.images?.length ?? 0) >= 5, hint: "Listings with more photos get more requests." },
    { label: "Lease template", done: !!property.leaseTemplate?.trim(), hint: "Needed before you can accept a request." },
    { label: "Detailed description", done: (property.description?.length ?? 0) >= 120, hint: "Describe the rooms, area and transport." },
    { label: "Map location", done: !!(property.location?.lat && property.location?.lng), hint: "Helps students judge the commute." },
    { label: "Amenities listed", done: (property.amenities?.length ?? 0) >= 3, hint: "Wi-Fi, water, power and security matter most." },
  ];
}

export default function LandlordPropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  // Freshly created listings land here with ?new=true to prompt sharing.
  const [showShare, setShowShare] = useState(() => searchParams.get("new") === "true");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    // Drop ?new=true so a refresh doesn't reopen the share dialog.
    if (searchParams.get("new") === "true") window.history.replaceState({}, "", window.location.pathname);
  }, [searchParams]);

  const propertyRef = useMemoFirebase(() => (id ? doc(firestore, "properties", id) : null), [firestore, id]);
  const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);
  const tenantRef = useMemoFirebase(
    () => (property?.currentTenantId ? doc(firestore, "users", property.currentTenantId) : null),
    [firestore, property?.currentTenantId],
  );
  const { data: tenant } = useDoc<UserProfile>(tenantRef);

  const reviewsQuery = useMemoFirebase(
    () => (id ? query(collection(firestore, "propertyReviews"), where("propertyId", "==", id)) : null),
    [firestore, id],
  );
  const requestsQuery = useMemoFirebase(
    () =>
      id && user
        ? query(collection(firestore, "rentalApplications"), where("propertyId", "==", id), where("landlordId", "==", user.uid))
        : null,
    [firestore, id, user],
  );
  const { data: reviews } = useCollection<PropertyReview>(reviewsQuery);
  const { data: requests } = useCollection<RentalApplication>(requestsQuery);

  const applicantKey = [...new Set((requests ?? []).map((r) => r.tenantId))].sort().join(",");
  const { data: applicants } = useAsyncResult(
    applicantKey || null,
    (key) => fetchDocsByIds<UserProfile>(firestore, "users", key.split(",")),
    { keepPrevious: true },
  );

  if (isUserLoading || isPropertyLoading) return <PageSkeleton variant="detail" />;

  if (!property || (user && property.landlordId !== user.uid)) {
    return (
      <EmptyState
        className="mx-auto mt-10 max-w-xl"
        icon={Building2}
        title="We couldn't find this property"
        description="It may have been deleted, or it belongs to a different account."
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/landlord/properties">Back to properties</Link>
          </Button>
        }
      />
    );
  }

  const sortedRequests = [...(requests ?? [])].sort((a, b) => b.applicationDate.localeCompare(a.applicationDate));
  const pendingCount = sortedRequests.filter((r) => r.status === "pending").length;
  const rating = reviews?.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
  const checklist = listingChecklist(property);
  const todo = checklist.filter((c) => !c.done);
  const address = [property.location?.address, property.location?.city, property.location?.state].filter(Boolean).join(", ");
  const hasMap = !!(property.location?.lat && property.location?.lng);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/landlord/properties", label: "Properties" }}
        title={property.title}
        description={
          <span className="flex items-center gap-1.5">
            <MapPin aria-hidden className="h-4 w-4 shrink-0" /> {address}
          </span>
        }
        actions={
          <>
            <StatusBadge status={property.status} className="text-sm" />
            <Button variant="outline" className="rounded-xl" onClick={() => setShowShare(true)}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/properties/${property.id}`} target="_blank">
                <ExternalLink className="mr-1.5 h-4 w-4" /> Public page
              </Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link href={`/landlord/properties/${property.id}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit listing
              </Link>
            </Button>
          </>
        }
      />

      <StatGrid>
        <StatCard label="Monthly rent" value={formatPrice(property.price, property.currency)} icon={Wallet} />
        <StatCard
          label="Requests"
          value={pendingCount}
          icon={Inbox}
          tone={pendingCount ? "info" : "default"}
          hint={pendingCount ? "Waiting for your reply" : `${sortedRequests.length} in total`}
          href={pendingCount ? `/landlord/requests?property=${property.id}` : undefined}
        />
        <StatCard
          label="Rating"
          value={rating ? rating.toFixed(1) : "—"}
          icon={Star}
          tone="warning"
          hint={reviews?.length ? `${reviews.length} review${reviews.length === 1 ? "" : "s"}` : "No reviews yet"}
        />
        <StatCard
          label="Listing quality"
          value={`${checklist.length - todo.length}/${checklist.length}`}
          icon={CheckCircle2}
          tone={todo.length ? "warning" : "success"}
          hint={todo.length ? `${todo.length} thing${todo.length === 1 ? "" : "s"} to improve` : "Looking great"}
        />
      </StatGrid>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <SectionCard title="Photos and videos" bodyClassName="p-5">
            {property.images?.length || property.videos?.length ? (
              <PropertyGallery images={property.images} videos={property.videos} title={property.title} />
            ) : (
              <EmptyState
                className="border-none bg-transparent py-8"
                icon={Building2}
                title="No photos yet"
                description="Listings with photos get far more requests."
                action={
                  <Button asChild size="sm" className="rounded-lg">
                    <Link href={`/landlord/properties/${property.id}/edit`}>Add photos</Link>
                  </Button>
                }
              />
            )}
          </SectionCard>

          <SectionCard
            title="Rental requests"
            description={pendingCount ? `${pendingCount} waiting for your reply` : "Students who asked to rent this home"}
            action={sortedRequests.length ? { href: `/landlord/requests?property=${property.id}`, label: "Manage" } : undefined}
          >
            {sortedRequests.length ? (
              <ul className="divide-y">
                {sortedRequests.slice(0, 6).map((r) => {
                  const person = applicants?.get(r.tenantId);
                  return (
                    <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={person?.profileImageUrl} alt="" />
                        <AvatarFallback>{person?.name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{person?.name ?? "Student"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {person?.school ? `${person.school} · ` : ""}
                          {formatDistanceToNow(new Date(r.applicationDate), { addSuffix: true })}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                className="m-5 border-none bg-transparent py-8"
                icon={Inbox}
                title="No requests yet"
                description={property.status === "available" ? "Share your listing to reach more students." : "This home is currently let."}
                action={
                  property.status === "available" ? (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setShowShare(true)}>
                      <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share listing
                    </Button>
                  ) : undefined
                }
              />
            )}
          </SectionCard>

          <SectionCard title="Listing details" bodyClassName="space-y-6 p-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: BedDouble, label: "Bedrooms", value: property.bedrooms },
                { icon: Bath, label: "Bathrooms", value: property.bathrooms },
                { icon: Ruler, label: "Area", value: property.area ? `${property.area} sq ft` : "—" },
                { icon: Building2, label: "Type", value: property.type },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-muted/50 p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon aria-hidden className="h-3.5 w-3.5" /> {label}
                  </dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            {property.description && (
              <div>
                <h3 className="text-sm font-semibold">Description</h3>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{property.description}</p>
              </div>
            )}

            {!!property.amenities?.length && (
              <div>
                <h3 className="text-sm font-semibold">Amenities</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => {
                    const Icon = AMENITY_ICONS[amenity] || DEFAULT_ICON;
                    return (
                      <li key={amenity} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm">
                        <Icon aria-hidden className="h-3.5 w-3.5 text-primary" /> {amenity}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {!!property.rules?.length && (
              <div>
                <h3 className="text-sm font-semibold">House rules</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {property.rules.map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Reviews" description={rating ? `${rating.toFixed(1)} out of 5` : undefined}>
            {reviews?.length ? (
              <ul className="divide-y">
                {reviews.map((review) => (
                  <li key={review.id} className="space-y-2 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={review.tenantImageUrl} alt="" />
                        <AvatarFallback>{review.tenantName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{review.tenantName ?? "Tenant"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.reviewDate).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <span className="flex" aria-label={`${review.rating} out of 5`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} aria-hidden className={cn("h-3.5 w-3.5", i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                        ))}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState className="m-5 border-none bg-transparent py-8" icon={Star} title="No reviews yet" description="Tenants can review the home once their tenancy ends." />
            )}
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-6">
          {tenant ? (
            <SectionCard title="Current tenant" bodyClassName="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={tenant.profileImageUrl} alt="" />
                  <AvatarFallback>{tenant.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{tenant.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{tenant.school || tenant.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-lg">
                  <Link href={`/landlord/messages?conversationId=${tenant.id}`}>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-lg">
                  <Link href={`/landlord/tenants/${tenant.id}`}>Tenancy</Link>
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <Flag aria-hidden className="h-3 w-3" /> Report a problem with this tenant
              </button>
            </SectionCard>
          ) : (
            <section className="rounded-2xl border border-dashed bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-sky-50 p-2.5 text-sky-700">
                  <UserRound aria-hidden className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">No tenant yet</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pendingCount ? `You have ${pendingCount} request${pendingCount === 1 ? "" : "s"} to review.` : "Share the listing to reach students nearby."}
                  </p>
                </div>
              </div>
              {pendingCount ? (
                <Button asChild size="sm" className="mt-4 w-full rounded-lg">
                  <Link href={`/landlord/requests?property=${property.id}`}>Review requests</Link>
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="mt-4 w-full rounded-lg" onClick={() => setShowShare(true)}>
                  <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share listing
                </Button>
              )}
            </section>
          )}

          {todo.length > 0 && (
            <SectionCard title="Improve this listing" bodyClassName="p-2">
              <ul>
                {checklist.map((item) => (
                  <li key={item.label} className="flex gap-3 rounded-xl px-3 py-2.5">
                    {item.done ? (
                      <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <div>
                      <p className={cn("text-sm", item.done ? "text-muted-foreground line-through" : "font-medium")}>{item.label}</p>
                      {!item.done && <p className="text-xs text-muted-foreground">{item.hint}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="sm" className="m-3 mt-1 w-[calc(100%-1.5rem)] rounded-lg">
                <Link href={`/landlord/properties/${property.id}/edit`}>Edit listing</Link>
              </Button>
            </SectionCard>
          )}

          <SectionCard title="Location" bodyClassName="p-0">
            {hasMap ? (
              <PropertyMap
                lat={property.location.lat!}
                lng={property.location.lng!}
                title={property.title}
                className="relative z-0 h-56 w-full overflow-hidden"
              />
            ) : (
              <p className="px-5 pt-4 text-sm text-muted-foreground">No map pin set. Add one in the listing editor.</p>
            )}
            <p className="flex items-start gap-1.5 px-5 py-4 text-sm">
              <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {address}
                {property.location?.school && <span className="block text-xs text-muted-foreground">Near {property.location.school}</span>}
              </span>
            </p>
          </SectionCard>
        </aside>
      </div>

      {tenant && (
        <ReportUserDialog isOpen={reportOpen} onClose={() => setReportOpen(false)} reportedUserId={tenant.id} reportedUserName={tenant.name} />
      )}
      <SharePropertyModal isOpen={showShare} onClose={() => setShowShare(false)} propertyId={property.id} propertyTitle={property.title} />
    </div>
  );
}
