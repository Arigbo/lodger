

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
import { BedDouble, Bath, Ruler, Check, X, Pencil, User, Building, ImageIcon } from 'lucide-react';
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
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="mb-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">{property.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {property.location.address}, {property.location.city}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/landlord/properties/edit/${property.id}`}>
              <Pencil className="mr-2 h-4 w-4" /> Edit Listing
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">


          <Card className="my-6">
            <CardContent className="flex items-center justify-around p-6 text-center">
              <div>
                <BedDouble className="mx-auto mb-2 h-7 w-7 text-primary" />
                <p>{property.bedrooms} Beds</p>
              </div>
              <div>
                <Bath className="mx-auto mb-2 h-7 w-7 text-primary" />
                <p>{property.bathrooms} Baths</p>
              </div>
              <div>
                <Ruler className="mx-auto mb-2 h-7 w-7 text-primary" />
                <p>{property.area} sqft</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{formatPrice(property.price, property.currency)}</p>
                <p className="text-sm text-muted-foreground">/month</p>
              </div>
            </CardContent>
          </Card>

          {/* Property Images */}
          {
            property.images && property.images.length > 0 && (
              <Card className="my-6">
                <CardHeader>
                  <CardTitle>Property Photos</CardTitle>
                  <CardDescription>Images of this property</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.images.map((imageUrl, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden border bg-secondary">
                        <Image
                          src={imageUrl}
                          alt={`${property.title} - Image ${index + 1}`}
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                      </div>
                    ))}
                  </div>
                  {property.images.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No images uploaded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          }

          <Card>
            <CardHeader>
              <CardTitle>Rental Requests</CardTitle>
              <CardDescription>Review and respond to rental applications for this property.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areRequestsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : aggregatedRequests && aggregatedRequests.length > 0 ? (
                      aggregatedRequests.map(({ request, applicant }) => {
                        return (
                          <TableRow key={request.id}>
                            <TableCell className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={applicant?.profileImageUrl} />
                                <AvatarFallback>
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{applicant?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{applicant?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{request.messageToLandlord || 'No message provided.'}</TableCell>
                            <TableCell>{new Date(request.applicationDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              {request.status === 'pending' ? (
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleAcceptClick({ request, applicant })}>
                                    Approve
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeclineClick(request.id)}>
                                    Decline
                                  </Button>
                                </div>
                              ) : (
                                <Badge variant={request.status === 'approved' ? 'secondary' : 'destructive'}>{request.status}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">No pending requests.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

        </div >
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={property.status === 'occupied' ? 'secondary' : 'default'} className="text-base">
                  {property.status}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Tenant</CardTitle>
              </CardHeader>
              <CardContent>
                {isTenantLoading ? <Skeleton className="h-16 w-full" /> : tenant ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={tenant.profileImageUrl} />
                      <AvatarFallback>
                        <User className="h-8 w-8 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">{tenant.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">This property is currently vacant.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {
          selectedRequest && landlord && property.leaseTemplate && (
            <LeaseGenerationDialog
              isOpen={dialogOpen}
              onClose={() => setDialogOpen(false)}
              onLeaseSigned={handleLeaseSigned}
              landlord={landlord}
              leaseText={property.leaseTemplate}
            />
          )}
      </div>
    </div>
  );
}


