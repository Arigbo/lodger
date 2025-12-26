

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
import { BedDouble, Bath, Ruler, Check, X, Pencil, User, Users, Building, ImageIcon, MapPin, Loader2, CheckCircle2, MessageSquare, DollarSign } from 'lucide-react';
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

  const handleLeaseSigned = async (finalText: string) => {
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
        leaseText: finalText,
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
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-primary/10 text-primary border-2 border-primary/20 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all hover:bg-primary/20 cursor-default shadow-sm">
                    {property.type}
                  </Badge>
                  <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic border-2 border-foreground/5 shadow-sm">
                    Property ID: {property.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>

                <div className="space-y-6">
                  <h1 className="font-headline text-5xl md:text-8xl font-black tracking-tighter text-foreground leading-[0.95] uppercase">
                    {property.title.split(' ').map((word, i) => (
                      <span key={i} className={cn(i % 2 === 1 && "text-primary italic")}>
                        {word}{' '}
                      </span>
                    ))}
                  </h1>
                  <div className="flex items-center gap-4 font-black group max-w-2xl bg-white/40 backdrop-blur-sm p-4 rounded-3xl border-2 border-foreground/5">
                    <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-foreground text-white group-hover:bg-primary transition-all duration-500 shadow-xl">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <span className="text-xl text-foreground/80 tracking-tight lowercase font-medium">{property.location.address}, {property.location.city}</span>
                  </div>
                </div>
              </div>

              {/* High-End Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                {[
                  { icon: BedDouble, label: "Bedrooms", val: property.bedrooms, color: "bg-blue-500" },
                  { icon: Bath, label: "Bathrooms", val: property.bathrooms, color: "bg-purple-500" },
                  { icon: Ruler, label: "Area (Sq Ft)", val: property.area, color: "bg-amber-500" },
                  { icon: DollarSign, label: "Monthly Rent", val: formatPrice(property.price, property.currency), color: "bg-green-500" }
                ].map((spec, i) => (
                  <div key={i} className="relative group overflow-hidden rounded-[3rem] bg-white p-8 border-2 border-foreground/5 shadow-xl shadow-black/[0.02] hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500">
                    <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-20 transition-opacity", spec.color)} />
                    <div className="relative z-10 flex flex-col items-start text-left">
                      <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-6 transition-all duration-500 group-hover:bg-primary group-hover:text-white group-hover:rotate-12 group-hover:scale-110">
                        <spec.icon className="h-7 w-7" />
                      </div>
                      <p className="text-3xl font-black tracking-tighter">{spec.val}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mt-1 italic">{spec.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-4xl font-black uppercase tracking-tighter">Rental <span className="text-primary italic underline decoration-4 decoration-primary/20 underline-offset-8">Inquiries</span></h3>
                  <p className="text-lg font-medium text-muted-foreground/60 italic font-serif mt-2">Manage prospective scholars for this sanctuary</p>
                </div>
                <div className="bg-primary/5 px-8 py-4 rounded-[2rem] border-2 border-primary/10 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 italic opacity-60">Protocol Queue</p>
                  <p className="text-3xl font-black text-primary leading-none">{aggregatedRequests.length}</p>
                </div>
              </div>

              <Card className="rounded-[4rem] border-2 border-foreground/5 shadow-3xl overflow-hidden bg-white/80 backdrop-blur-xl">
                <Table>
                  <TableHeader className="bg-foreground/5">
                    <TableRow className="hover:bg-transparent border-b-2 border-foreground/5">
                      <TableHead className="h-20 px-12 text-[10px] font-black uppercase tracking-widest text-foreground">Scholar Identity</TableHead>
                      <TableHead className="h-20 px-6 text-[10px] font-black uppercase tracking-widest text-foreground">Inquiry Narrative</TableHead>
                      <TableHead className="h-20 px-6 text-[10px] font-black uppercase tracking-widest text-foreground">Status Protocol</TableHead>
                      <TableHead className="h-20 px-12 text-right text-[10px] font-black uppercase tracking-widest text-foreground">Control Logic</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areRequestsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-32 text-center">
                          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                          <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-20">Synchronizing Data...</p>
                        </TableCell>
                      </TableRow>
                    ) : aggregatedRequests && aggregatedRequests.length > 0 ? (
                      aggregatedRequests.map(({ request, applicant }) => (
                        <TableRow key={request.id} className="group hover:bg-primary/[0.02] transition-colors border-b-2 border-foreground/[0.02] last:border-0">
                          <TableCell className="py-10 px-12">
                            <div className="flex items-center gap-6">
                              <div className="relative">
                                <Avatar className="h-16 w-16 border-4 border-white shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                  <AvatarImage src={applicant?.profileImageUrl} className="object-cover" />
                                  <AvatarFallback className="bg-primary/5 text-primary font-black uppercase text-xl">{applicant?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 border-4 border-white rounded-full shadow-lg" />
                              </div>
                              <div>
                                <p className="font-black text-xl tracking-tight group-hover:text-primary transition-colors">{applicant?.name || 'Anonymous'}</p>
                                <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">{applicant?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-10 px-6 max-w-[300px]">
                            <p className="text-base font-serif italic text-muted-foreground/80 leading-relaxed line-clamp-2 selection:bg-primary/20">
                              &quot;{request.messageToLandlord || 'No introductory narrative provided.'}&quot;
                            </p>
                          </TableCell>
                          <TableCell className="py-10 px-6">
                            <Badge variant={request.status === 'approved' ? 'secondary' : request.status === 'declined' ? 'destructive' : 'outline'} className={cn(
                              "rounded-full px-6 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] border-none shadow-sm",
                              request.status === 'pending' ? "bg-amber-500/10 text-amber-600 animate-pulse" :
                                request.status === 'approved' ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                            )}>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-10 px-12 text-right">
                            {request.status === 'pending' ? (
                              <div className="flex justify-end gap-4">
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="h-14 px-8 rounded-2xl border-2 border-foreground/5 font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-xl hover:shadow-black/20"
                                  onClick={() => handleAcceptClick({ request, applicant })}
                                >
                                  Deploy Lease
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  className="h-14 px-6 rounded-2xl font-black text-xs uppercase tracking-widest text-destructive/30 hover:text-destructive hover:bg-destructive/5 transition-all"
                                  onClick={() => handleDeclineClick(request.id)}
                                >
                                  Archive
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-end items-center gap-3 text-muted-foreground/30">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-black text-[10px] uppercase tracking-[0.3em]">Protocol Executed</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="py-32 text-center">
                          <div className="flex flex-col items-center gap-6 opacity-10">
                            <Building className="h-24 w-24" />
                            <p className="text-4xl font-black italic font-serif">Empty Sanctuary Portfolio</p>
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
          <div className="space-y-12">
            {/* Asset Performance Card */}
            <Card className="rounded-[3.5rem] border-none bg-foreground text-white shadow-3xl overflow-hidden p-12 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32" />
              <CardHeader className="p-0 space-y-2 mb-10 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Intelligence Report</p>
                <CardTitle className="text-5xl font-black tracking-tighter uppercase italic">{property.status}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-10 relative z-10">
                <div className="grid grid-cols-1 gap-6">
                  <div className="p-8 rounded-[2.5rem] bg-white/5 border-2 border-white/5 backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 italic">Economic Yield</p>
                    <p className="text-4xl font-black tracking-tight">{formatPrice(property.price, property.currency)}<span className="text-sm font-medium text-white/20 ml-2">/month</span></p>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-white/5 border-2 border-white/5 backdrop-blur-md flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 italic">Active Inquiries</p>
                      <p className="text-4xl font-black tracking-tight">{aggregatedRequests.length}</p>
                    </div>
                    <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border-2 border-primary/20">
                      <Users className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resident Spotlight Card */}
            <Card className="relative overflow-hidden border-4 border-foreground/[0.02] bg-white/40 backdrop-blur-xl rounded-[4rem] p-12 hover:bg-white/60 transition-all duration-700 group shadow-3xl shadow-black/[0.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 space-y-10">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground italic opacity-40">Verified Resident</p>
                  <div className={cn(
                    "h-12 w-12 flex items-center justify-center rounded-2xl border-2 transition-all duration-500",
                    tenant ? "bg-green-500/10 border-green-500/20 text-green-600 shadow-lg shadow-green-500/10" : "bg-muted/50 border-transparent text-muted-foreground/30"
                  )}>
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>

                {isTenantLoading ? (
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-3xl" />
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </div>
                ) : tenant ? (
                  <div className="space-y-8">
                    <div className="flex items-center gap-8">
                      <div className="relative">
                        <Avatar className="h-28 w-28 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] border-4 border-white transition-all duration-700 group-hover:scale-110 group-hover:rotate-3">
                          <AvatarImage src={tenant.profileImageUrl} className="object-cover" />
                          <AvatarFallback className="bg-foreground text-white font-black text-4xl">{tenant.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-2 -right-2 h-10 w-10 bg-primary text-white rounded-2xl border-4 border-white flex items-center justify-center shadow-xl">
                          <Check className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-3xl font-black tracking-tighter uppercase">{tenant.name}</h4>
                        <p className="text-sm font-bold text-muted-foreground/60 tracking-widest uppercase truncate max-w-[200px]">{tenant.email}</p>
                      </div>
                    </div>

                    <div className="pt-6 border-t-2 border-foreground/[0.05]">
                      <Link href={`/landlord/messages?contact=${tenant.id}`} className="block">
                        <Button className="w-full h-16 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] gap-4 shadow-2xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-500">
                          <MessageSquare className="h-5 w-5" /> Open Channel
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-6">
                    <div className="h-24 w-24 flex items-center justify-center rounded-[2.5rem] bg-foreground/5 shadow-inner mx-auto group-hover:bg-primary/10 transition-colors duration-500">
                      <Building className="h-10 w-10 text-foreground/20 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl font-black uppercase tracking-tighter text-foreground/20">Status: Vacant</p>
                      <p className="text-xs font-bold text-foreground/10 uppercase tracking-[0.2em]">Awaiting Quality Scholar</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Navigation Artifact */}
            <Link href="/landlord/properties" className="block text-center pt-8">
              <Button variant="ghost" className="h-12 px-10 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] hover:tracking-[0.5em] transition-all opacity-20 hover:opacity-100 italic hover:bg-transparent">
                ← ARCHIVE COLLECTION
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Lease Generation Dialogue Context */}
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


