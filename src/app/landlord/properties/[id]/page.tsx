"use client";

import {
  notFound,
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { formatPrice, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import {
  BedDouble,
  Bath,
  Ruler,
  Building,
  MapPin,
  ChevronLeft,
  Star,
  User,
  Flag,
  Share2,
} from "lucide-react";
import type {
  Property,
  UserProfile,
  RentalApplication,
  PropertyReview,
} from "@/types";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import LeaseGenerationDialog from "@/components/leases/lease-generation-dialog";
import { SharePropertyModal } from "@/components/properties/share-property-modal";
import { ReportUserDialog } from "@/components/shared/report-user-dialog";
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import {
  doc,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  getDocs,
  documentId,
} from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { PropertyHeroCarousel } from "@/components/properties/property-hero-carousel";
import dynamic from "next/dynamic";

const PropertyMap = dynamic(() => import("@/components/properties/property-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full rounded-3xl" />,
});

type AggregatedRequest = {
  request: RentalApplication;
  applicant: UserProfile | null;
};

import { AMENITY_ICONS, DEFAULT_ICON } from "@/lib/amenity-icons";

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default function LandlordPropertyDetailPage() {
  const { user, isUserLoading } = useUser();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const firestore = useFirestore();
  const router = useRouter();

  const searchParams = useSearchParams();
  // Freshly created listings land here with ?new=true to prompt sharing.
  const [showShareModal, setShowShareModal] = useState(() => searchParams.get("new") === "true");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  useEffect(() => {
    // Drop ?new=true so a refresh doesn't reopen the share dialog.
    if (searchParams.get("new") === "true") window.history.replaceState({}, "", window.location.pathname);
  }, [searchParams]);

  const propertyRef = useMemoFirebase(
    () => (id ? doc(firestore, "properties", id) : null),
    [firestore, id],
  );
  const { data: property, isLoading: isPropertyLoading } =
    useDoc<Property>(propertyRef);

  const landlordRef = useMemoFirebase(
    () =>
      property?.landlordId
        ? doc(firestore, "users", property.landlordId)
        : null,
    [firestore, property],
  );
  const { data: landlord, isLoading: isLandlordLoading } =
    useDoc<UserProfile>(landlordRef);

  const tenantRef = useMemoFirebase(
    () =>
      property?.currentTenantId
        ? doc(firestore, "users", property.currentTenantId)
        : null,
    [firestore, property],
  );
  const { data: tenant } =
    useDoc<UserProfile>(tenantRef);

  const reviewsQuery = useMemoFirebase(
    () =>
      id
        ? query(
            collection(firestore, "propertyReviews"),
            where("propertyId", "==", id),
          )
        : null,
    [firestore, id],
  );
  const { data: reviews, isLoading: areReviewsLoading } =
    useCollection<PropertyReview>(reviewsQuery);

  const [aggregatedRequests, setAggregatedRequests] = useState<
    AggregatedRequest[]
  >([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<AggregatedRequest | null>(null);

  useEffect(() => {
    if (!id || !firestore || !user) return;

    const fetchRequestsAndApplicants = async () => {
      const requestsQuery = query(
        collection(firestore, "rentalApplications"),
        where("propertyId", "==", id),
        where("landlordId", "==", user.uid),
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const rentalRequests: RentalApplication[] = requestsSnapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as RentalApplication,
      );

      if (rentalRequests.length === 0) {
        setAggregatedRequests([]);
        return;
      }

      const applicantIds = [
        ...new Set(rentalRequests.map((r) => r.tenantId)),
      ].filter(Boolean);
      const usersMap = new Map<string, UserProfile>();

      if (applicantIds.length > 0) {
        const userChunks = chunkArray(applicantIds, 30);
        for (const chunk of userChunks) {
          const usersQuery = query(
            collection(firestore, "users"),
            where(documentId(), "in", chunk),
          );
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach((doc) =>
            usersMap.set(doc.id, { id: doc.id, ...doc.data() } as UserProfile),
          );
        }
      }

      const finalRequests = rentalRequests.map((request) => ({
        request,
        applicant: request.tenantId
          ? usersMap.get(request.tenantId) || null
          : null,
      }));

      setAggregatedRequests(finalRequests);
    };

    fetchRequestsAndApplicants();
  }, [id, firestore, user]);

  const isLoading =
    isUserLoading ||
    isPropertyLoading ||
    isLandlordLoading ||
    areReviewsLoading;

  if (isLoading) return <PageSkeleton variant="detail" />;

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="rounded-full bg-secondary p-4">
          <Building className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Property Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The property you are looking for does not exist or you do not have
          permission to view it.
        </p>
        <Button asChild className="mt-6">
          <Link href="/landlord/properties">Back to My Properties</Link>
        </Button>
      </div>
    );
  }

  if (user && property.landlordId !== user.uid) return notFound();

  const handleAcceptClick = (request: AggregatedRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const handleLeaseSigned = async (finalText: string) => {
    if (selectedRequest?.request && property?.leaseTemplate && landlord) {
      const requestRef = doc(
        firestore,
        "rentalApplications",
        selectedRequest.request.id,
      );
      updateDocumentNonBlocking(requestRef, { status: "approved" });

      const propRef = doc(firestore, "properties", property.id);
      const leaseStartDate = new Date().toISOString();
      updateDocumentNonBlocking(propRef, {
        status: "occupied",
        currentTenantId: selectedRequest.request.tenantId,
        leaseStartDate,
      });

      const leaseCollectionRef = collection(firestore, "leaseAgreements");
      const leaseDocRef = await addDoc(leaseCollectionRef, {
        propertyId: property.id,
        landlordId: landlord.id,
        tenantId: selectedRequest.request.tenantId,
        leaseText: finalText,
        landlordSigned: true,
        tenantSigned: false,
        startDate: leaseStartDate,
        endDate: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1),
        ).toISOString(),
        currency: property.currency,
        status: "pending",
      });
      await updateDoc(leaseDocRef, { id: leaseDocRef.id });
    }
  };

  const handleDeclineClick = (requestId: string) => {
    const requestRef = doc(firestore, "rentalApplications", requestId);
    updateDocumentNonBlocking(requestRef, { status: "declined" });
  };

  const averageRating =
    reviews && reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-700">
      {/* Back Button */}
      <div className="container mx-auto max-w-7xl px-4 lg:px-8 mt-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 hover:gap-3 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Properties
        </Button>
      </div>

      {/* Hero Section - Image Carousel only */}
      <div className="container mx-auto max-w-7xl px-4 lg:px-8 mt-4">
        <PropertyHeroCarousel images={property.images} title={property.title} />
      </div>

      <div className="container mx-auto max-w-7xl px-4 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-none px-4 py-1 text-xs font-bold uppercase tracking-wider"
                >
                  {property.type}
                </Badge>
                {property.status === "occupied" ? (
                  <Badge
                    variant="destructive"
                    className="px-4 py-1 text-xs font-bold uppercase tracking-wider"
                  >
                    Occupied
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-green-500/10 text-green-600 px-4 py-1 text-xs font-bold uppercase tracking-wider"
                  >
                    Available
                  </Badge>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <h1 className="text-3xl md:text-3xl font-bold tracking-tight text-foreground leading-tight font-headline flex-1">
                    {property.title}
                  </h1>
                  <div className="flex items-center gap-3 shrink-0 md:mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-14 w-14 rounded-2xl border bg-card hover:border-primary/20 transition-all hover:scale-105"
                      onClick={() => setShowShareModal(true)}
                    >
                      <Share2 className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-muted-foreground font-bold">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span>
                      {property.location.address}, {property.location.city}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <span className="text-foreground">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm font-normal">
                      ({reviews?.length || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { icon: BedDouble, label: "Bedrooms", val: property.bedrooms },
                { icon: Bath, label: "Bathrooms", val: property.bathrooms },
                { icon: Ruler, label: "Area (Sq Ft)", val: property.area },
                { icon: Building, label: "Type", val: property.type },
              ].map((spec, i) => (
                <div
                  key={i}
                  className="bg-muted/30 p-6 rounded-3xl border border-border/50 flex flex-col items-center text-center group hover:bg-primary/5 hover:border-primary/20 transition-all"
                >
                  <spec.icon className="h-8 w-8 text-primary mb-3 transition-transform group-hover:scale-110" />
                  <p className="text-xl font-bold">{spec.val}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {spec.label}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="bg-foreground/5 h-0.5 rounded-full" />

            {/* Location Section - Always Visible */}
            {property.location.lat && property.location.lng && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold tracking-tight font-headline">
                    Geographic Location
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground/40 tracking-wider">
                    <MapPin className="h-3 w-3 text-primary" />
                    {property.location.lat.toFixed(4)},{" "}
                    {property.location.lng.toFixed(4)}
                  </div>
                </div>
                <div className="rounded-3xl overflow-hidden border border-foreground/[0.02] shadow-sm">
                  <PropertyMap
                    lat={property.location.lat}
                    lng={property.location.lng}
                    title={property.title}
                  />
                </div>
              </div>
            )}

            <Separator className="bg-foreground/5 h-0.5 rounded-full" />

            {/* Tabs Content */}
            <Tabs defaultValue="gallery" className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b rounded-none px-0 h-auto gap-8 mb-8">
                <TabsTrigger
                  value="gallery"
                  className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4"
                >
                  Gallery
                </TabsTrigger>
                <TabsTrigger
                  value="overview"
                  className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="amenities"
                  className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4"
                >
                  Amenities
                </TabsTrigger>
                <TabsTrigger
                  value="rules"
                  className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4"
                >
                  House Rules
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4"
                >
                  Reviews
                </TabsTrigger>
              </TabsList>
              <TabsContent value="gallery" className="mt-0 space-y-6">
                <PropertyGallery
                  images={property.images}
                  videos={property.videos}
                  title={property.title}
                />
              </TabsContent>
              <TabsContent value="overview" className="mt-0 space-y-6">
                <h3 className="text-2xl font-bold tracking-tight">
                  About this property
                </h3>
                <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                  {property.description}
                </p>
              </TabsContent>
              <TabsContent value="amenities" className="mt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {property.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-3 p-4 rounded-2xl border bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all font-bold"
                    >
                      <div className="bg-primary/10 p-2 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        {React.createElement(
                          AMENITY_ICONS[amenity] || DEFAULT_ICON,
                          { className: "h-5 w-5" },
                        )}
                      </div>
                      <span className="text-sm tracking-tight">{amenity}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="rules" className="mt-0">
                <div className="bg-muted/20 p-8 rounded-3xl border border-dashed border-border">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.rules.map((rule) => (
                      <li
                        key={rule}
                        className="flex items-start gap-3 text-muted-foreground font-bold"
                      >
                        <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
              <TabsContent value="reviews" className="mt-0 space-y-8">
                <h3 className="text-2xl font-bold tracking-tight">
                  Tenant Reviews
                </h3>
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-6 rounded-3xl border bg-card/50 backdrop-blur-sm space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border border-background shadow-lg">
                              <AvatarImage
                                src={review.tenantImageUrl}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {review.tenantName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-lg leading-none">
                                {review.tenantName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={cn(
                                        "h-3 w-3",
                                        i < review.rating
                                          ? "text-yellow-500 fill-current"
                                          : "text-muted/30",
                                      )}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground font-semibold">
                                  {new Date(
                                    review.reviewDate,
                                  ).toLocaleDateString(undefined, {
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed font-bold">
                          {review.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed flex flex-col items-center gap-3">
                    <Star className="h-8 w-8 text-muted/30" />
                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs opacity-40">
                      No reviews recorded yet
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Rental Inquiries Table */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight font-headline">
                  Rental Inquiries
                </h3>
                <Badge
                  variant="secondary"
                  className="px-3 py-1 bg-primary text-white font-bold"
                >
                  {aggregatedRequests.length}
                </Badge>
              </div>
              <Card className="rounded-3xl border border-foreground/5 shadow-sm overflow-hidden bg-white/60 backdrop-blur-xl">
                <div className="bg-card rounded-3xl overflow-hidden border border-foreground/[0.02] shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-foreground/5">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-14 font-semibold text-xs uppercase tracking-wider text-foreground pl-8">
                            Applicant
                          </TableHead>
                          <TableHead className="h-14 font-semibold text-xs uppercase tracking-wider text-foreground text-center">
                            Status
                          </TableHead>
                          <TableHead className="h-14 font-semibold text-xs uppercase tracking-wider text-foreground text-right pr-8">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aggregatedRequests.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="py-20 text-center"
                            >
                              <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs">
                                No pending recruitment
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          aggregatedRequests.map(({ request, applicant }) => (
                            <TableRow
                              key={request.id}
                              className="group hover:bg-primary/[0.02] transition-colors border-b-2 border-foreground/[0.02] last:border-0 h-24"
                            >
                              <TableCell className="pl-8">
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-12 w-12 border border-white shadow-sm">
                                    <AvatarImage
                                      src={applicant?.profileImageUrl}
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                      {applicant?.name?.[0] || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-bold uppercase tracking-tight text-sm">
                                      {applicant?.name}
                                    </p>
                                    <p className="text-xs font-bold text-muted-foreground/60 tracking-wider lowercase">
                                      {applicant?.email}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={cn(
                                    "rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wider border-none",
                                    request.status === "approved"
                                      ? "bg-green-500/10 text-green-600"
                                      : request.status === "declined"
                                        ? "bg-red-500/10 text-red-600"
                                        : "bg-primary/10 text-primary",
                                  )}
                                >
                                  {request.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-8">
                                <div className="flex justify-end gap-2">
                                  {request.status === "pending" && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-10 rounded-xl px-4 border font-semibold text-xs uppercase tracking-wider hover:bg-destructive hover:text-white hover:border-destructive transition-all"
                                        onClick={() =>
                                          handleDeclineClick(request.id)
                                        }
                                      >
                                        Decline
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-10 rounded-xl px-4 font-semibold text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all"
                                        onClick={() =>
                                          handleAcceptClick({
                                            request,
                                            applicant,
                                          })
                                        }
                                      >
                                        Accept & Proceed
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="sticky top-12 space-y-6">
              <Card className="border-none bg-background shadow-[0_0_50px_-12px_rgba(0,0,0,0.12)] rounded-3xl overflow-hidden">
                <CardHeader className="bg-[#0A0A0A] text-white p-8">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="secondary"
                      className="bg-white/10 text-white border-white/20 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider"
                    >
                      Monthly Rent
                    </Badge>
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <p className="text-4xl font-bold tracking-tight">
                    {formatPrice(property.price, property.currency)}
                    <span className="text-lg font-normal text-white/40 ml-1">
                      /mo
                    </span>
                  </p>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Status
                      </p>
                      <p className="text-sm font-bold uppercase tracking-tight">
                        {property.status}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Inquiries
                      </p>
                      <p className="text-sm font-bold uppercase tracking-tight">
                        {aggregatedRequests.length}
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    className="w-full h-14 rounded-2xl text-base font-bold uppercase tracking-wider shadow-sm hover:scale-[1.02] transition-transform"
                  >
                    <Link href={`/landlord/properties/${property.id}/edit`}>
                      Edit listing
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Tenant Spotlight */}
              {tenant ? (
                <Card className="border-none bg-muted/30 rounded-3xl p-8 hover:bg-muted/40 transition-colors group">
                  <div className="space-y-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Current Tenant
                    </p>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 shadow-sm border border-white group-hover:scale-105 transition-transform">
                        <AvatarImage
                          src={tenant.profileImageUrl}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-foreground text-white text-xl font-bold">
                          {tenant.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-xl font-bold tracking-tight">
                          {tenant.name}
                        </h4>
                        <p className="text-xs font-bold text-muted-foreground/60 tracking-wider uppercase truncate max-w-[150px]">
                          {tenant.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-12 rounded-xl border font-semibold text-xs uppercase tracking-wider"
                    >
                      <Link href={`/landlord/messages?contact=${tenant.id}`}>
                        Message Tenant
                      </Link>
                    </Button>
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground text-xs uppercase tracking-wider hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setReportDialogOpen(true)}
                      >
                        <Flag className="mr-2 h-3 w-3" /> Report Tenant
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="border-none bg-muted/10 border border-dashed border-muted/20 rounded-3xl p-6 text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted shadow-inner mx-auto flex items-center justify-center opacity-20">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-xl font-bold tracking-tight opacity-20">
                      No tenant
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-20">
                      Awaiting acquisition
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedRequest &&
        landlord &&
        property.leaseTemplate &&
        selectedRequest.applicant && (
          <LeaseGenerationDialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onLeaseSigned={handleLeaseSigned}
            landlord={landlord}
            tenant={selectedRequest.applicant}
            property={property}
            templateText={property.leaseTemplate}
          />
        )}

      {tenant && (
        <ReportUserDialog
          isOpen={reportDialogOpen}
          onClose={() => setReportDialogOpen(false)}
          reportedUserId={tenant.id}
          reportedUserName={tenant.name}
        />
      )}
      <SharePropertyModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        propertyId={(id as string) || ""}
        propertyTitle={property.title}
      />
    </div>
  );
}
