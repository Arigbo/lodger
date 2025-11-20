
'use client';

import { notFound, useParams } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
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
import { BedDouble, Bath, Ruler, Check, X, Pencil, User } from 'lucide-react';
import type { Property, UserProfile, RentalRequest } from '@/lib/definitions';
import Link from 'next/link';
import { useState } from 'react';
import LeaseGenerationDialog from '@/components/lease-generation-dialog';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { addDoc } from 'firebase/firestore';
import Loading from '@/app/loading';


export default function LandlordPropertyDetailPage() {
  const { user, isUserLoading } = useUser();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const firestore = useFirestore();

  const propertyQuery = useMemoFirebase(() => id ? query(collection(firestore, 'properties'), where('propertyId', '==', id)) : null, [firestore, id]);
  const { data: properties, isLoading: isPropertyLoading } = useCollection<Property>(propertyQuery);
  const property = properties?.[0];
  
  const landlordRef = useMemoFirebase(() => property?.landlordId ? doc(firestore, 'users', property.landlordId) : null, [firestore, property]);
  const { data: landlord, isLoading: isLandlordLoading } = useDoc<UserProfile>(landlordRef);

  const tenantRef = useMemoFirebase(() => property?.currentTenantId ? doc(firestore, 'users', property.currentTenantId) : null, [firestore, property]);
  const { data: tenant, isLoading: isTenantLoading } = useDoc<UserProfile>(tenantRef);

  const rentalRequestsQuery = useMemoFirebase(() => id ? query(collection(firestore, 'rentalApplications'), where('propertyId', '==', id)) : null, [firestore, id]);
  const { data: rentalRequests, isLoading: areRequestsLoading } = useCollection<RentalRequest>(rentalRequestsQuery);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);

  const isLoading = isUserLoading || isPropertyLoading || isLandlordLoading || isTenantLoading || areRequestsLoading;

  if (isLoading) {
    return <Loading />;
  }

  if (!property || !user || property.landlordId !== user.uid) {
    notFound();
  }

  const handleAcceptClick = (request: RentalRequest) => {
      setSelectedRequest(request);
      setDialogOpen(true);
  };

  const handleLeaseSigned = async () => {
      if(selectedRequest && property.leaseTemplate && landlord) {
        // Here you would:
        // 1. Update the rental request to 'approved'
        const requestRef = doc(firestore, 'rentalApplications', selectedRequest.id);
        updateDocumentNonBlocking(requestRef, { status: 'approved' });
        
        // 2. Update the property to 'occupied' and set the tenant ID
        const propRef = doc(firestore, 'properties', property.id);
        const leaseStartDate = new Date().toISOString();
        updateDocumentNonBlocking(propRef, { status: 'occupied', currentTenantId: selectedRequest.userId, leaseStartDate });

        // 3. Create a new lease agreement document
        const leaseCollectionRef = collection(firestore, 'leaseAgreements');
        await addDoc(leaseCollectionRef, {
            propertyId: property.id,
            landlordId: landlord.id,
            tenantId: selectedRequest.userId,
            leaseText: property.leaseTemplate,
            landlordSigned: true,
            tenantSigned: false,
            startDate: leaseStartDate,
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
            status: 'pending' // Pending tenant signature
        });
      }
  };

  const handleDeclineClick = (requestId: string) => {
     const requestRef = doc(firestore, 'rentalApplications', requestId);
     updateDocumentNonBlocking(requestRef, { status: 'declined' });
  }
  
  const applicantForDialog = selectedRequest ? rentalRequests?.find(r => r.id === selectedRequest.id) : null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="font-headline text-3xl font-bold">{property.title}</h1>
                <p className="mt-1 text-muted-foreground">
                {property.location.address}, {property.location.city}
                </p>
            </div>
            <Button variant="outline" asChild>
                <Link href={`/landlord/properties/edit/${property.id}`}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit Listing
                </Link>
            </Button>
        </div>


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
              <p className="text-2xl font-bold text-primary">{formatPrice(property.price)}</p>
              <p className="text-sm text-muted-foreground">/month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Rental Requests</CardTitle>
                <CardDescription>Review and respond to rental applications for this property.</CardDescription>
            </CardHeader>
            <CardContent>
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
                        {rentalRequests && rentalRequests.length > 0 ? (
                            rentalRequests.map(request => {
                                // Can't show applicant name without another query, so just showing ID for now
                                return (
                                    <TableRow key={request.id}>
                                        <TableCell className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>
                                                    <User className="h-4 w-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className='font-medium'>{request.userId.substring(0, 8)}...</span>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-muted-foreground">{request.messageToLandlord}</TableCell>
                                        <TableCell>{new Date(request.applicationDate).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            {request.status === 'pending' ? (
                                                <div className='flex justify-end gap-2'>
                                                    <Button size="sm" variant="outline" onClick={() => handleAcceptClick(request)}><Check className='h-4 w-4'/></Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleDeclineClick(request.id)}><X className='h-4 w-4'/></Button>
                                                </div>
                                            ): (
                                                <Badge variant={request.status === 'approved' ? 'secondary' : 'destructive'}>{request.status}</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">No pending requests.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

      </div>
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
                {tenant ? (
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
                ): (
                    <p className="text-muted-foreground">This property is currently vacant.</p>
                )}
             </CardContent>
          </Card>
        </div>
      </div>
      {selectedRequest && applicantForDialog && landlord && property.leaseTemplate && (
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
