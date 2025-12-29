'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { formatPrice, cn } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  BedDouble,
  Bath,
  Ruler,
  Check,
  Pencil,
  Building,
  MapPin,
  Loader2,
  CheckCircle2,
  MessageSquare,
  DollarSign,
  ChevronLeft,
  Star,
  Wifi,
  Dog,
  Wind,
  Tv,
  ParkingCircle,
  User,
  Users,
  GraduationCap
} from 'lucide-react';
import type { Property, UserProfile, RentalApplication, PropertyReview } from '@/types';
import Link from 'next/link';
import React, { useState, useEffect, useMemo } from 'react';
import LeaseGenerationDialog from '@/components/lease-generation-dialog';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, addDoc, updateDoc, getDocs, documentId } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Loading from '@/app/loading';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

type AggregatedRequest = {
  request: RentalApplication;
  applicant: UserProfile | null;
};

const amenityIcons: { [key: string]: React.ReactNode } = {
  'Furnished': <Tv className="h-5 w-5 text-primary" />,
  'Wi-Fi': <Wifi className="h-5 w-5 text-primary" />,
  'In-unit Laundry': <Wind className="h-5 w-5 text-primary" />,
  'Pet Friendly': <Dog className="h-5 w-5 text-primary" />,
  'Parking Spot': <ParkingCircle className="h-5 w-5 text-primary" />,
};

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

  const [api, setApi] = React.useState<any>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const propertyRef = useMemoFirebase(() => id ? doc(firestore, 'properties', id) : null, [firestore, id]);
  const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);

  const landlordRef = useMemoFirebase(() => property?.landlordId ? doc(firestore, 'users', property.landlordId) : null, [firestore, property]);
  const { data: landlord, isLoading: isLandlordLoading } = useDoc<UserProfile>(landlordRef);

  const tenantRef = useMemoFirebase(() => property?.currentTenantId ? doc(firestore, 'users', property.currentTenantId) : null, [firestore, property]);
  const { data: tenant, isLoading: isTenantLoading } = useDoc<UserProfile>(tenantRef);

  const reviewsQuery = useMemoFirebase(() => id ? query(collection(firestore, 'propertyReviews'), where('propertyId', '==', id)) : null, [firestore, id]);
  const { data: reviews, isLoading: areReviewsLoading } = useCollection<PropertyReview>(reviewsQuery);

  const [aggregatedRequests, setAggregatedRequests] = useState<AggregatedRequest[]>([]);
  const [areRequestsLoading, setAreRequestsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AggregatedRequest | null>(null);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  useEffect(() => {
    if (!id || !firestore || !user) return;

    const fetchRequestsAndApplicants = async () => {
      setAreRequestsLoading(true);
      const requestsQuery = query(collection(firestore, 'rentalApplications'), where('propertyId', '==', id), where('landlordId', '==', user.uid));
      const requestsSnapshot = await getDocs(requestsQuery);
      const rentalRequests: RentalApplication[] = requestsSnapshot.docs.map((d: any) => ({ ...d.data(), id: d.id } as RentalApplication));

      if (rentalRequests.length === 0) {
        setAggregatedRequests([]);
        setAreRequestsLoading(false);
        return;
      }

      const applicantIds = [...new Set(rentalRequests.map(r => r.tenantId))].filter(Boolean);
      const usersMap = new Map<string, UserProfile>();

      if (applicantIds.length > 0) {
        const userChunks = chunkArray(applicantIds, 30);
        for (const chunk of userChunks) {
          const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as UserProfile));
        }
      }

      const finalRequests = rentalRequests.map(request => ({
        request,
        applicant: request.tenantId ? usersMap.get(request.tenantId) || null : null
      }));

      setAggregatedRequests(finalRequests);
      setAreRequestsLoading(false);
    };

    fetchRequestsAndApplicants();
  }, [id, firestore, user]);

  const isLoading = isUserLoading || isPropertyLoading || isLandlordLoading || areReviewsLoading;

  if (isLoading) return <Loading />;

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="rounded-full bg-secondary p-4">
          <Building className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Property Not Found</h1>
        <p className="mt-2 text-muted-foreground">The property you are looking for does not exist or you do not have permission to view it.</p>
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
      const requestRef = doc(firestore, 'rentalApplications', selectedRequest.request.id);
      updateDocumentNonBlocking(requestRef, { status: 'approved' });

      const propRef = doc(firestore, 'properties', property.id);
      const leaseStartDate = new Date().toISOString();
      updateDocumentNonBlocking(propRef, { status: 'occupied', currentTenantId: selectedRequest.request.tenantId, leaseStartDate });

      const leaseCollectionRef = collection(firestore, 'leaseAgreements');
      const leaseDocRef = await addDoc(leaseCollectionRef, {
        propertyId: property.id,
        landlordId: landlord.id,
        tenantId: selectedRequest.request.tenantId,
        leaseText: finalText,
        landlordSigned: true,
        tenantSigned: false,
        startDate: leaseStartDate,
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        currency: property.currency,
        status: 'pending'
      });
      await updateDoc(leaseDocRef, { id: leaseDocRef.id });
    }
  };

  const handleDeclineClick = (requestId: string) => {
    const requestRef = doc(firestore, 'rentalApplications', requestId);
    updateDocumentNonBlocking(requestRef, { status: 'declined' });
  };

  const averageRating = reviews && reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-700">
      {/* Gallery Section */}
      <div className="relative w-full bg-[#0A0A0A] overflow-hidden lg:rounded-b-[3rem] shadow-2xl">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="container mx-auto px-0 lg:px-8 py-0 lg:py-8">
          {property.images && property.images.length > 0 ? (
            <Carousel className="w-full relative group" setApi={setApi}>
              <CarouselContent>
                {property.images.map((url, index) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-[16/10] md:aspect-[21/9] w-full overflow-hidden lg:rounded-3xl">
                      <Image
                        src={url}
                        alt={`${property.title} - Image ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-700 hover:scale-105"
                        priority={index === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CarouselPrevious className="h-12 w-12 bg-white/10 border-white/20 text-white backdrop-blur-xl hover:bg-white/20" />
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CarouselNext className="h-12 w-12 bg-white/10 border-white/20 text-white backdrop-blur-xl hover:bg-white/20" />
              </div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase">
                  {current} <span className="text-white/40">/</span> {count}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-6 left-6 h-10 w-10 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-white/20 transition-all z-20"
                onClick={() => router.back()}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="absolute top-6 right-6 z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-10 w-10 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-white/20 transition-all"
                >
                  <Link href={`/landlord/properties/edit/${property.id}`}>
                    <Pencil className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </Carousel>
          ) : (
            <div className="flex h-[300px] md:h-[500px] w-full items-center justify-center lg:rounded-[3rem] bg-muted/10 border-2 border-dashed border-white/10 text-white/40">
              <Building className="h-16 w-16 opacity-20" />
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-4 py-1 text-xs font-bold uppercase tracking-widest">{property.type}</Badge>
                {property.status === 'occupied' ? (
                  <Badge variant="destructive" className="px-4 py-1 text-xs font-bold uppercase tracking-widest">Occupied</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 px-4 py-1 text-xs font-bold uppercase tracking-widest">Available</Badge>
                )}
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-6xl font-black tracking-tight text-foreground leading-tight uppercase font-headline">
                  {property.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-muted-foreground font-bold">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span>{property.location.address}, {property.location.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <span className="text-foreground">{averageRating.toFixed(1)}</span>
                    <span className="text-sm font-normal">({reviews?.length || 0} reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: BedDouble, label: "Bedrooms", val: property.bedrooms },
                { icon: Bath, label: "Bathrooms", val: property.bathrooms },
                { icon: Ruler, label: "Area (Sq Ft)", val: property.area },
                { icon: Building, label: "Type", val: property.type }
              ].map((spec, i) => (
                <div key={i} className="bg-muted/30 p-6 rounded-3xl border border-border/50 flex flex-col items-center text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                  <spec.icon className="h-8 w-8 text-primary mb-3 transition-transform group-hover:scale-110" />
                  <p className="text-xl font-black">{spec.val}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{spec.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b rounded-none px-0 h-auto gap-8 mb-8">
                <TabsTrigger value="overview" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">Overview</TabsTrigger>
                <TabsTrigger value="amenities" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">Amenities</TabsTrigger>
                <TabsTrigger value="rules" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">House Rules</TabsTrigger>
                <TabsTrigger value="reviews" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">Reviews</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-0 space-y-6">
                <h3 className="text-2xl font-black tracking-tight uppercase">About this property</h3>
                <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                  {property.description}
                </p>
              </TabsContent>
              <TabsContent value="amenities" className="mt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {property.amenities.map(amenity => (
                    <div key={amenity} className="flex items-center gap-3 p-4 rounded-2xl border bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all font-bold">
                      <div className="bg-primary/10 p-2 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        {amenityIcons[amenity] || <CheckCircle2 className="h-5 w-5" />}
                      </div>
                      <span className="text-sm tracking-tight">{amenity}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="rules" className="mt-0">
                <div className="bg-muted/20 p-8 rounded-[2rem] border-2 border-dashed border-border">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.rules.map(rule => (
                      <li key={rule} className="flex items-start gap-3 text-muted-foreground font-bold">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
              <TabsContent value="reviews" className="mt-0 space-y-8">
                <h3 className="text-2xl font-black tracking-tight uppercase">Tenant Reviews</h3>
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map(review => (
                      <div key={review.id} className="p-6 rounded-3xl border bg-card/50 backdrop-blur-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                              <AvatarImage src={review.tenantImageUrl} className="object-cover" />
                              <AvatarFallback className="bg-primary/10 text-primary font-black">{review.tenantName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-black text-lg leading-none">{review.tenantName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={cn("h-3 w-3", i < review.rating ? "text-yellow-500 fill-current" : "text-muted/30")} />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground font-black">{new Date(review.reviewDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed font-bold">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed flex flex-col items-center gap-3">
                    <Star className="h-8 w-8 text-muted/30" />
                    <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-40">No reviews recorded yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Rental Inquiries Table */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black tracking-tight uppercase font-headline">Rental Inquiries</h3>
                <Badge variant="secondary" className="px-3 py-1 bg-primary text-white font-black">{aggregatedRequests.length}</Badge>
              </div>
              <Card className="rounded-[2rem] border-2 border-foreground/5 shadow-xl overflow-hidden bg-white/60 backdrop-blur-xl">
                <div className="bg-white rounded-3xl overflow-hidden border-2 border-foreground/[0.02] shadow-xl">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-foreground/5">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-foreground pl-8">Applicant</TableHead>
                          <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-foreground text-center">Protocol Status</TableHead>
                          <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-foreground text-right pr-8">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aggregatedRequests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-20 text-center">
                              <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">No pending recruitment</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          aggregatedRequests.map(({ request, applicant }) => (
                            <TableRow key={request.id} className="group hover:bg-primary/[0.02] transition-colors border-b-2 border-foreground/[0.02] last:border-0 h-24">
                              <TableCell className="pl-8">
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-12 w-12 border-2 border-white shadow-xl">
                                    <AvatarImage src={applicant?.profileImageUrl} className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary font-black">{applicant?.name?.[0] || 'U'}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-black uppercase tracking-tight text-sm">{applicant?.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest lowercase">{applicant?.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={cn(
                                  "rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest border-none",
                                  request.status === 'approved' ? "bg-green-500/10 text-green-600" :
                                    request.status === 'declined' ? "bg-red-500/10 text-red-600" :
                                      "bg-primary/10 text-primary"
                                )}>
                                  {request.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-8">
                                <div className="flex justify-end gap-2">
                                  {request.status === 'pending' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-10 rounded-xl px-4 border-2 font-black text-[10px] uppercase tracking-widest hover:bg-destructive hover:text-white hover:border-destructive transition-all"
                                        onClick={() => handleDeclineClick(request.id)}
                                      >
                                        Decline
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-10 rounded-xl px-4 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                                        onClick={() => handleAcceptClick({ request, applicant })}
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
              <Card className="border-none bg-background shadow-[0_0_50px_-12px_rgba(0,0,0,0.12)] rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-[#0A0A0A] text-white p-8">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">Monthly Rent</Badge>
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <p className="text-4xl font-black tracking-tight">
                    {formatPrice(property.price, property.currency)}
                    <span className="text-lg font-normal text-white/40 ml-1">/mo</span>
                  </p>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                      <p className="text-sm font-black uppercase tracking-tight">{property.status}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Inquiries</p>
                      <p className="text-sm font-black uppercase tracking-tight">{aggregatedRequests.length}</p>
                    </div>
                  </div>
                  <Button asChild className="w-full h-14 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                    <Link href={`/landlord/properties/edit/${property.id}`}>Edit Inventory</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Tenant Spotlight */}
              {tenant ? (
                <Card className="border-none bg-muted/30 rounded-[2rem] p-8 hover:bg-muted/40 transition-colors group">
                  <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Current Tenant</p>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 shadow-xl border-4 border-white group-hover:scale-105 transition-transform">
                        <AvatarImage src={tenant.profileImageUrl} className="object-cover" />
                        <AvatarFallback className="bg-foreground text-white text-xl font-black">{tenant.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-xl font-black uppercase tracking-tight">{tenant.name}</h4>
                        <p className="text-xs font-bold text-muted-foreground/60 tracking-widest uppercase truncate max-w-[150px]">{tenant.email}</p>
                      </div>
                    </div>
                    <Button asChild variant="outline" className="w-full h-12 rounded-xl border-2 font-black text-xs uppercase tracking-widest">
                      <Link href={`/landlord/messages?contact=${tenant.id}`}>Message Tenant</Link>
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="border-none bg-muted/10 border-2 border-dashed border-muted/20 rounded-[2rem] p-12 text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted shadow-inner mx-auto flex items-center justify-center opacity-20">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-xl font-black uppercase tracking-tighter opacity-20">Inventory Vacant</p>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Awaiting acquisition</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedRequest && landlord && property.leaseTemplate && selectedRequest.applicant && (
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
    </div>
  );
}
