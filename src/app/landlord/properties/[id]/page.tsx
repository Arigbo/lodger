

'use client';

import { notFound, useParams } from 'next/navigation';
import { formatPrice } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { BedDouble, Bath, Ruler, Check, X, Pencil, User, Building, ImageIcon, MapPin, Loader2, CheckCircle2, MessageSquare, DollarSign } from 'lucide-react';
import { cn } from "@/utils";
import type { Property, UserProfile, RentalApplication } from '@/types/';
import Link from 'next/link';
import { useState, useEffect } from 'react';
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

  const propertyRef = useMemoFirebase(() => id ? doc(firestore, 'properties', id) : null, [firestore, id]);
  const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);

  const landlordRef = useMemoFirebase(() => property?.landlordId ? doc(firestore, 'users', property.landlordId) : null, [firestore, property]);
  const { data: landlord, isLoading: isLandlordLoading } = useDoc<UserProfile>(landlordRef);

  const tenantRef = useMemoFirebase(() => property?.currentTenantId ? doc(firestore, 'users', property.currentTenantId) : null, [firestore, property]);
  const { data: tenant, isLoading: isTenantLoading } = useDoc<UserProfile>(tenantRef);

  const [aggregatedRequests, setAggregatedRequests] = useState<AggregatedRequest[]>([]);
  const [areRequestsLoading, setAreRequestsLoading] = useState(true);

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

      const applicantIds = [...new Set(rentalRequests.map(r => r.tenantId))].filter(Boolean); // Filter out any undefined/null IDs
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AggregatedRequest | null>(null);

  const isLoading = isUserLoading || isPropertyLoading || isLandlordLoading;

  if (isLoading) {
    return <Loading />;
  }

  // Authorization Check & Not Found
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

  if (user && property.landlordId !== user.uid) {
    return notFound();
  }

  const handleAcceptClick = (request: AggregatedRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const handleLeaseSigned = async () => {
    if (selectedRequest?.request && property?.leaseTemplate && landlord) {
      // 1. Update the rental request to 'approved'
      const requestRef = doc(firestore, 'rentalApplications', selectedRequest.request.id);
      updateDocumentNonBlocking(requestRef, { status: 'approved' });

      // 2. Update the property to 'occupied' and set the tenant ID
      const propRef = doc(firestore, 'properties', property.id);
      const leaseStartDate = new Date().toISOString();
      updateDocumentNonBlocking(propRef, { status: 'occupied', currentTenantId: selectedRequest.request.tenantId, leaseStartDate });

      // 3. Create a new lease agreement document
      const leaseCollectionRef = collection(firestore, 'leaseAgreements');
      const leaseDocRef = await addDoc(leaseCollectionRef, {
        propertyId: property.id,
        landlordId: landlord.id,
        tenantId: selectedRequest.request.tenantId,
        leaseText: property.leaseTemplate,
        landlordSigned: true,
        tenantSigned: false,
        startDate: leaseStartDate,
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        currency: property.currency,
        status: 'pending' // Pending tenant signature
      });
      // 4. Update the new lease with its own ID
      await updateDoc(leaseDocRef, { id: leaseDocRef.id });
    }
  };

  const handleDeclineClick = (requestId: string) => {
    if (!property) return;
    const requestRef = doc(firestore, 'rentalApplications', requestId);
    updateDocumentNonBlocking(requestRef, { status: 'declined' });
  }

  return (
    <div className="min-h-screen pb-32 animate-in fade-in duration-1000">
      {/* Cinematic Header/Gallery Section */}
      <div className="relative w-full bg-[#050505] overflow-hidden lg:rounded-b-[4rem] shadow-3xl">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#3b82f6_0%,transparent_70%)]" />
          <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="container mx-auto px-0 lg:px-12 py-0 lg:py-12">
          {property.images && property.images.length > 0 ? (
            <div className="relative aspect-[16/10] md:aspect-[21/9] w-full overflow-hidden lg:rounded-[3rem] shadow-2xl group">
              <Image
                src={property.images[0]}
                alt={property.title}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              {/* Status Badge Over Image */}
              <div className="absolute bottom-10 left-10 flex items-center gap-4">
                <div className="bg-white/10 backdrop-blur-2xl border border-white/20 text-white px-6 py-2.5 rounded-2xl text-xs font-black tracking-[0.2em] uppercase shadow-2xl flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", property.status === 'available' ? "bg-green-500 animate-pulse" : "bg-primary")} />
                  {property.status}
                </div>
              </div>

              {/* Edit Button Over Image */}
              <div className="absolute top-10 right-10 z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 text-white backdrop-blur-2xl hover:bg-white/20 hover:scale-110 active:scale-95 transition-all shadow-2xl"
                >
                  <Link href={`/landlord/properties/edit/${property.id}`}>
                    <Pencil className="h-6 w-6" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-[300px] md:h-[500px] w-full items-center justify-center lg:rounded-[3rem] bg-muted/10 border-2 border-dashed border-white/10 text-white/40">
              <Building className="h-20 w-20 opacity-20" />
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 lg:px-12 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
          {/* Left Column: Property Narrative & Requests */}
          <div className="lg:col-span-2 space-y-16">
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-4">
                <Badge className="bg-primary/10 text-primary border-none px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] italic transition-all hover:bg-primary/20 cursor-default">
                  {property.type}
                </Badge>
                <div className="flex items-center gap-2 bg-muted/30 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] italic border-2 border-white/50 shadow-sm">
                  Property ID: {property.id.slice(0, 8).toUpperCase()}
                </div>
              </div>

              <div className="space-y-6">
                <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tight text-foreground leading-[1.05]">
                  {property.title}
                </h1>
                <div className="flex items-center gap-3 font-bold group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/5 text-primary group-hover:scale-110 transition-transform">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="text-lg text-muted-foreground">{property.location.address}, {property.location.city}</span>
                </div>
              </div>
            </div>

            {/* High-End Specs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: BedDouble, label: "Bedrooms", val: property.bedrooms },
                { icon: Bath, label: "Bathrooms", val: property.bathrooms },
                { icon: Ruler, label: "Area (Sq Ft)", val: property.area },
                { icon: DollarSign, label: "Monthly Rent", val: formatPrice(property.price, property.currency) }
              ].map((spec, i) => (
                <div key={i} className="relative group overflow-hidden rounded-[2.5rem] bg-muted/30 p-8 border-2 border-white/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <spec.icon className="h-10 w-10 text-primary mb-5 transition-transform duration-500 group-hover:scale-110" />
                    <p className="text-2xl font-black">{spec.val}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">{spec.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modernized Rental Requests Table */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tight">Rental <span className="text-primary italic">Inquiries</span></h3>
                  <p className="text-lg font-medium text-muted-foreground italic font-serif opacity-60">Manage prospective scholars for this sanctuary</p>
                </div>
                <div className="bg-primary/5 px-6 py-2 rounded-2xl border-2 border-primary/10">
                  <p className="text-xs font-black uppercase tracking-widest text-primary">{aggregatedRequests.length} Total</p>
                </div>
              </div>

              <Card className="rounded-[3rem] border-2 border-foreground/5 shadow-2xl overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b-2 border-muted/20">
                      <TableHead className="h-16 px-10 text-[10px] font-black uppercase tracking-widest">Applicant Profile</TableHead>
                      <TableHead className="h-16 px-6 text-[10px] font-black uppercase tracking-widest">Narrative</TableHead>
                      <TableHead className="h-16 px-6 text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                      <TableHead className="h-16 px-10 text-right text-[10px] font-black uppercase tracking-widest">Orchestration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areRequestsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-20 text-center">
                          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-20" />
                        </TableCell>
                      </TableRow>
                    ) : aggregatedRequests && aggregatedRequests.length > 0 ? (
                      aggregatedRequests.map(({ request, applicant }) => (
                        <TableRow key={request.id} className="group hover:bg-muted/5 transition-colors border-b border-muted/10 last:border-0">
                          <TableCell className="py-8 px-10">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-14 w-14 border-2 border-white shadow-lg group-hover:scale-110 transition-transform">
                                <AvatarImage src={applicant?.profileImageUrl} className="object-cover" />
                                <AvatarFallback className="bg-primary/5 text-primary font-black uppercase">{applicant?.name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-black text-lg group-hover:text-primary transition-colors">{applicant?.name || 'Anonymous'}</p>
                                <p className="text-xs font-medium text-muted-foreground italic">{applicant?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-8 px-6 max-w-[250px]">
                            <p className="text-sm font-serif italic text-muted-foreground leading-relaxed line-clamp-2">
                              &quot;{request.messageToLandlord || 'No introductory narrative provided.'}&quot;
                            </p>
                          </TableCell>
                          <TableCell className="py-8 px-6">
                            <Badge variant={request.status === 'approved' ? 'secondary' : request.status === 'declined' ? 'destructive' : 'outline'} className="rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-8 px-10 text-right">
                            {request.status === 'pending' ? (
                              <div className="flex justify-end gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-10 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all"
                                  onClick={() => handleAcceptClick({ request, applicant })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest text-destructive/40 hover:text-destructive hover:bg-destructive/5 transition-all"
                                  onClick={() => handleDeclineClick(request.id)}
                                >
                                  Decline
                                </Button>
                              </div>
                            ) : (
                              <Button variant="ghost" disabled className="h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest opacity-40">
                                COMPLETED
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-20">
                            <User className="h-12 w-12" />
                            <p className="text-xl font-black italic font-serif">No incoming inquiries found.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>

          {/* Right Column: Status & Current Tenancy */}
          <div className="relative">
            <div className="sticky top-12 space-y-10">
              {/* Asset Performance Card */}
              <Card className="rounded-[2.5rem] border-none bg-[#050505] text-white shadow-3xl overflow-hidden p-10">
                <CardHeader className="p-0 space-y-2 mb-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">Asset Status</p>
                  <CardTitle className="text-4xl font-black tracking-tight uppercase">{property.status}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 italic">Yield</p>
                      <p className="text-2xl font-black">{formatPrice(property.price, property.currency)}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 italic">Inquiries</p>
                      <p className="text-2xl font-black">{aggregatedRequests.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resident Spotlight Card */}
              <Card className="relative overflow-hidden border-2 border-white bg-muted/30 rounded-[3rem] p-10 hover:bg-muted/40 transition-all group shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">Current Resident</p>
                    <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white shadow-sm">
                      <CheckCircle2 className={cn("h-5 w-5", tenant ? "text-green-500" : "text-muted-foreground/30")} />
                    </div>
                  </div>

                  {isTenantLoading ? (
                    <div className="flex items-center gap-6">
                      <Skeleton className="h-20 w-20 rounded-2xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  ) : tenant ? (
                    <div className="flex items-center gap-6">
                      <Avatar className="h-24 w-24 shadow-2xl border-4 border-white transition-transform group-hover:scale-110 duration-500">
                        <AvatarImage src={tenant.profileImageUrl} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-black text-3xl">{tenant.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <h4 className="text-2xl font-black tracking-tight">{tenant.name}</h4>
                        <p className="text-sm font-medium text-muted-foreground italic truncate max-w-[150px]">{tenant.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 text-center space-y-4">
                      <div className="h-20 w-20 flex items-center justify-center rounded-[2rem] bg-white shadow-inner mx-auto opacity-40">
                        <Building className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-black text-muted-foreground/40 italic font-serif">Asset currently vacant</p>
                    </div>
                  )}

                  {tenant && (
                    <div className="pt-8 border-t border-muted-foreground/10">
                      <Link href={`/landlord/messages?contact=${tenant.id}`}>
                        <Button className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all">
                          <MessageSquare className="h-4 w-4" /> Message Scholar
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </Card>

              {/* Navigation Artifact */}
              <Link href="/landlord/properties" className="block text-center">
                <Button variant="ghost" className="font-black text-[10px] uppercase tracking-[0.3em] hover:tracking-[0.4em] transition-all opacity-40 hover:opacity-100 italic">
                  ← BACK TO PROPERTY PORTFOLIO
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lease Generation Dialogue Context */}
      {selectedRequest && landlord && property.leaseTemplate && (
        <LeaseGenerationDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onLeaseSigned={handleLeaseSigned}
          landlord={landlord}
          leaseText={property.leaseTemplate}
        />
      )}
    </div>
  );
}


