
'use client';

import { notFound, usePathname, useParams } from "next/navigation";
import Image from "next/image";
import { formatPrice, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Star, BedDouble, Bath, Ruler, MapPin, CheckCircle, Wifi, ParkingCircle, Dog, Wind, Tv, MessageSquare, Phone, Bookmark, Share2, Mail, Twitter, Link as LinkIcon, Facebook, Linkedin, FileText, RefreshCcw, User as UserIcon, Signature, AlertTriangle } from "lucide-react";
import type { Property, User, Review, ImagePlaceholder, Transaction, LeaseAgreement } from "@/lib/definitions";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import Link from "next/link";
import { FaWhatsapp } from 'react-icons/fa';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { add, format, isPast, isBefore } from 'date-fns';
import PaymentDialog from '@/components/payment-dialog';
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import TenancySkeleton from "@/components/tenancy-skeleton";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, User as FirebaseUser, addDoc } from "firebase/firestore";

function ProspectiveTenantView({
    property,
    landlord,
    reviews: initialReviews,
    images: initialImages
}: {
    property: Property;
    landlord: User | undefined | null;
    reviews: Review[];
    images: ImagePlaceholder[];
}) {
  const pathname = usePathname();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [reviews] = useState(initialReviews);
  const [images] = useState(initialImages);
  const [requestMessage, setRequestMessage] = useState("");
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);


  const averageRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
  
  const propertyUrl = isClient ? `${window.location.origin}${pathname}` : '';

  const handleSendRequest = async () => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Not Logged In",
            description: "You must be logged in to send a rental request.",
        });
        return;
    }
    try {
        const rentalRequestsRef = collection(firestore, 'rentalApplications');
        await addDoc(rentalRequestsRef, {
            propertyId: property.id,
            userId: user.uid,
            messageToLandlord: requestMessage,
            applicationDate: new Date().toISOString(),
            status: 'pending',
        });

        toast({
            title: "Request Sent!",
            description: "Your rental request has been sent to the landlord.",
        });
    } catch (error) {
        console.error("Error sending rental request:", error);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Could not send your rental request. Please try again later.",
        });
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(propertyUrl);
    toast({ title: "Link Copied!", description: "Property URL copied to your clipboard." });
  };
  
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out this property: ${property.title}`,
          url: propertyUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("Error sharing:", error);
        }
      }
    } else {
        alert("Web Share API is not supported in your browser. Use the links below to share.");
    }
  };


  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2">
          {/* Image Gallery */}
          <div className="grid grid-cols-2 grid-rows-2 gap-2 h-[500px] mb-8">
            <div className="col-span-2 row-span-2 relative">
                {images[0] && <Image src={images[0].imageUrl} alt={property.title} fill className="object-cover rounded-lg" data-ai-hint={images[0].imageHint} />}
            </div>
            {images[1] && <div className="hidden md:block relative"><Image src={images[1].imageUrl} alt={property.title} fill className="object-cover rounded-lg" data-ai-hint={images[1].imageHint}/></div>}
            {images[2] && <div className="hidden md:block relative"><Image src={images[2].imageUrl} alt={property.title} fill className="object-cover rounded-lg" data-ai-hint={images[2].imageHint}/></div>}
          </div>

          {/* Title and Meta */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              <Badge variant="secondary" className="mb-2">{property.type}</Badge>
              <h1 className="font-headline text-4xl font-bold">{property.title}</h1>
              <div className="mt-2 flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{property.location.address}, {property.location.city}</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-accent fill-current" />
                      <span>{averageRating.toFixed(1)} ({reviews.length} reviews)</span>
                  </div>
              </div>
            </div>
             <div className="mt-4 md:mt-0 text-right shrink-0">
                <p className="text-3xl font-bold text-primary">{formatPrice(property.price)}<span className="text-base font-normal text-muted-foreground">/month</span></p>
                {property.status === 'occupied' && <Badge variant="destructive" className="mt-1">Occupied</Badge>}
            </div>
          </div>
          
          <Card className="my-8">
              <CardContent className="p-6 flex items-center justify-around">
                  <div className="text-center"><BedDouble className="mx-auto mb-2 h-7 w-7 text-primary" /><p>{property.bedrooms} Beds</p></div>
                  <div className="text-center"><Bath className="mx-auto mb-2 h-7 w-7 text-primary" /><p>{property.bathrooms} Baths</p></div>
                  <div className="text-center"><Ruler className="mx-auto mb-2 h-7 w-7 text-primary" /><p>{property.area} sqft</p></div>
              </CardContent>
          </Card>
          
          <Tabs defaultValue="description" className="w-full">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="py-4 text-foreground/80 leading-relaxed">{property.description}</TabsContent>
            <TabsContent value="amenities" className="py-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.amenities.map(amenity => (
                        <div key={amenity} className="flex items-center gap-3">
                            {amenityIcons[amenity] || <CheckCircle className="h-5 w-5 text-primary" />}
                            <span>{amenity}</span>
                        </div>
                    ))}
                </div>
            </TabsContent>
            <TabsContent value="rules" className="py-4">
                 <ul className="list-disc list-inside space-y-2 text-foreground/80">
                    {property.rules.map(rule => <li key={rule}>{rule}</li>)}
                </ul>
            </TabsContent>
            <TabsContent value="reviews" className="py-4 space-y-6">
                <h3 className="font-headline text-2xl font-semibold">Comments & Reviews</h3>
                {reviews.map(review => {
                    return (
                        <div key={review.id} className="flex gap-4 pt-6 border-t">
                            <Avatar>
                                <AvatarFallback>
                                    <UserIcon className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold">{review.userId}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(review.date).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-0.5 mt-1">
                                    {[...Array(5)].map((_, i) => <Star key={i} className={cn("h-4 w-4", i < review.rating ? "text-accent fill-current" : "text-muted-foreground")} />)}
                                </div>
                                <p className="mt-2 text-foreground/80">{review.comment}</p>
                            </div>
                        </div>
                    )
                })}
                {reviews.length === 0 && <p className="text-muted-foreground pt-6 border-t">No reviews yet.</p>}
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card>
                <CardContent className="p-4 flex items-center justify-around">
                    <Button variant="ghost" className="flex flex-col h-auto gap-1">
                        <Bookmark className="h-5 w-5"/>
                        <span className="text-xs">Save</span>
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="flex flex-col h-auto gap-1">
                                <Share2 className="h-5 w-5"/>
                                <span className="text-xs">Share</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Share this Property</DialogTitle>
                                <DialogDescription>
                                    Share this listing with friends or on social media.
                                </DialogDescription>
                            </DialogHeader>
                            {isClient && navigator.share && (
                                <Button onClick={handleNativeShare} className="w-full">
                                    Share via...
                                </Button>
                            )}
                            <div className="flex items-center space-x-2">
                                <Input value={propertyUrl} readOnly />
                                <Button size="icon" onClick={handleCopyToClipboard}><LinkIcon /></Button>
                            </div>
                            <Separator />
                            <p className="text-sm font-medium text-center text-muted-foreground">Or share on</p>
                            <div className="flex justify-center gap-4">
                                <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-full">
                                    <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(propertyUrl)}&text=${encodeURIComponent(property.title)}`} target="_blank" rel="noopener noreferrer"><Twitter /></a>
                                </Button>
                                <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-full">
                                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(propertyUrl)}`} target="_blank" rel="noopener noreferrer"><Facebook /></a>
                                </Button>
                                <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-full">
                                    <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${property.title}: ${propertyUrl}`)}`} target="_blank" rel="noopener noreferrer"><FaWhatsapp className="text-xl" /></a>
                                </Button>
                                 <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-full">
                                    <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(propertyUrl)}&title=${encodeURIComponent(property.title)}`} target="_blank" rel="noopener noreferrer"><Linkedin /></a>
                                 </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>

            {landlord && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Meet the Landlord</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src={landlord.profileImageUrl} />
                    <AvatarFallback>
                        <UserIcon className="h-12 w-12 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold">{landlord.name}</p>
                  <p className="text-sm text-muted-foreground">Joined {new Date().getFullYear()}</p>
                  <Separator className="my-4"/>
                  <div className="flex gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                             <Button className="flex-1" disabled={property.status === 'occupied'}>
                                <MessageSquare className="mr-2 h-4 w-4"/> Request to Rent
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Request to Rent {property.title}</DialogTitle>
                                <DialogDescription>
                                    Send a message to the landlord, {landlord.name}, with your rental request. You can include any questions or offer a different price.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="message">Your Message</Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Hi, I'm very interested in this property. Would you consider a monthly rent of $1100?"
                                        value={requestMessage}
                                        onChange={(e) => setRequestMessage(e.target.value)}
                                        rows={4}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="ghost">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                    <Button onClick={handleSendRequest}>Send Request</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Phone className="h-4 w-4"/>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                            <DialogHeader>
                                <DialogTitle>Contact {landlord.name}</DialogTitle>
                                <DialogDescription>
                                    Use the methods below to get in touch. In-app messages are available after a request is accepted.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Button variant="outline" className="w-full justify-start" asChild>
                                    <a href={`mailto:${landlord.email}`}>
                                        <Mail className="mr-2"/> {landlord.email}
                                    </a>
                                </Button>
                                {landlord.phone && (
                                     <Button variant="outline" className="w-full justify-start" asChild>
                                        <a href={`tel:${landlord.phone}`}>
                                            <Phone className="mr-2"/> {landlord.phone}
                                        </a>
                                    </Button>
                                )}
                                {landlord.whatsappUrl && (
                                    <Button variant="outline" className="w-full justify-start" asChild>
                                        <Link href={landlord.whatsappUrl} target="_blank">
                                            <FaWhatsapp className="mr-2 text-xl" /> Chat on WhatsApp
                                        </Link>
                                    </Button>
                                )}
                                {landlord.twitterUrl && (
                                    <Button variant="outline" className="w-full justify-start" asChild>
                                        <Link href={landlord.twitterUrl} target="_blank">
                                            <Twitter className="mr-2"/> View X (Twitter) Profile
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </DialogContent>
                     </Dialog>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type amenityIcon = {
    [key: string]: React.ReactNode;
}

const amenityIcons: amenityIcon = {
    'Furnished': <Tv className="h-5 w-5 text-primary" />,
    'Wi-Fi': <Wifi className="h-5 w-5 text-primary" />,
    'In-unit Laundry': <Wind className="h-5 w-5 text-primary" />,
    'Pet Friendly': <Dog className="h-5 w-5 text-primary" />,
    'Parking Spot': <ParkingCircle className="h-5 w-5 text-primary" />,
}

function TenantPropertyView({ property, tenant }: { property: Property, tenant: FirebaseUser }) {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const firestore = useFirestore();
  
  const transactionsQuery = useMemoFirebase(() => query(collection(firestore, 'transactions'), where('tenantId', '==', tenant.uid), where('propertyId', '==', property.id)), [firestore, tenant.uid, property.id]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const leaseQuery = useMemoFirebase(() => query(collection(firestore, 'leaseAgreements'), where('propertyId', '==', property.id), where('tenantId', '==', tenant.uid)), [firestore, property.id, tenant.uid]);
  const { data: leases, isLoading: isLeaseLoading } = useCollection<LeaseAgreement>(leaseQuery);
  const lease = leases?.[0];

  const [tenancyState, setTenancyState] = useState<{
    showPayButton: boolean;
    paymentAmount: number;
    leaseEndDate: Date;
    leaseStartDate: Date;
    isLeaseActive: boolean;
    isLeaseExpired: boolean;
    isRentDue: boolean;
    rentStatusText: string;
    rentDueDateText: string;
  } | null>(null);

  useEffect(() => {
    if (transactions === null || !lease) return;

    const tenantTransactions = transactions || [];
    const today = new Date();
    const leaseStartDate = property.leaseStartDate ? new Date(property.leaseStartDate) : new Date();
    const leaseEndDate = add(leaseStartDate, { years: 1 });
    const lastRentPayment = tenantTransactions
      .filter(t => t.type === 'Rent' && t.status === 'Completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const isLeaseActive = lease.status === 'active';
    const isLeaseExpired = isPast(leaseEndDate);
    
    let nextRentDueDate: Date;
    let isRentDue = false;
    let rentDueDateText = "N/A";
    let rentStatusText: string;

    if (isLeaseActive) {
      if (lastRentPayment) {
        nextRentDueDate = add(new Date(lastRentPayment.date), { months: 1 });
        isRentDue = isPast(nextRentDueDate);
      } else {
        nextRentDueDate = leaseStartDate;
        isRentDue = isPast(leaseStartDate);
      }
      rentDueDateText = format(nextRentDueDate, 'MMMM do, yyyy');
      rentStatusText = isRentDue ? 'Due on' : 'Next due on';
    } else {
      rentStatusText = lease.status === 'pending' ? 'Lease Pending Signature' : 'Lease Inactive';
    }

    const hasPendingPayments = tenantTransactions.some(t => t.status === 'Pending');
    const showPayButton = isLeaseActive && (isRentDue || hasPendingPayments);
    let paymentAmount = 0;
    if (isRentDue) {
        paymentAmount = property.price;
    }


    setTenancyState({
      showPayButton,
      paymentAmount,
      leaseEndDate,
      leaseStartDate,
      isLeaseActive,
      isLeaseExpired,
      isRentDue,
      rentStatusText,
      rentDueDateText,
    });
  }, [transactions, lease, tenant.uid, property.leaseStartDate, property.price]);

  const handlePaymentSuccess = () => {
    console.log("Payment successful!");
    // The useCollection hook will automatically refetch the transactions.
  };
  
  if (!tenancyState || isLeaseLoading) {
    return <TenancySkeleton />;
  }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="font-headline text-3xl font-bold">My Tenancy</h1>
            <p className="text-muted-foreground">Manage your current rental agreement and payments for {property.title}.</p>
        </div>
        <Separator />
        
        {lease?.status === 'pending' && (
            <Card className="border-amber-500/50 bg-amber-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle /> Action Required
                    </CardTitle>
                    <CardDescription>
                        Your lease agreement is ready for review. Please sign the lease to activate your tenancy and enable payments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href={`/student/leases/${lease.id}`}>
                            <Signature className="mr-2 h-4 w-4" /> Review & Sign Lease
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )}

        <Tabs defaultValue="payments" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="lease">Lease Info</TabsTrigger>
            </TabsList>
            <TabsContent value="payments">
                 <Card className="mt-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Payment History</CardTitle>
                            <CardDescription>Review your past transactions.</CardDescription>
                        </div>
                        {tenancyState.showPayButton && tenancyState.paymentAmount > 0 && (
                            <Button onClick={() => setIsPaymentDialogOpen(true)}>Pay Now {formatPrice(tenancyState.paymentAmount)}</Button>
                        )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions && transactions.length > 0 ? transactions.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell>{format(new Date(t.date), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>{t.type}</TableCell>
                                        <TableCell className="text-right">{formatPrice(t.amount)}</TableCell>
                                        <TableCell className="text-center">
                                                <Badge variant={
                                                t.status === 'Completed' ? 'secondary'
                                                : t.status === 'Pending' ? 'default'
                                                : 'destructive'
                                            }>
                                            {t.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No transactions found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                 </Card>
            </TabsContent>
             <TabsContent value="lease">
                <Card className="mt-2">
                    <CardHeader>
                        <CardTitle>Lease Information</CardTitle>
                        <CardDescription>Key dates and details about your tenancy.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="rounded-lg border bg-secondary/50 p-4">
                                <p className="text-sm font-medium text-muted-foreground">{tenancyState.rentStatusText}</p>
                                <p className={cn("text-xl font-bold", tenancyState.isRentDue && tenancyState.isLeaseActive ? "text-destructive" : "text-primary")}>
                                    {tenancyState.rentDueDateText}
                                </p>
                            </div>
                            <div className={cn("rounded-lg border p-4", tenancyState.isLeaseExpired ? "border-destructive/50 bg-destructive/5" : "bg-secondary/50")}>
                                <p className="text-sm font-medium text-muted-foreground">{tenancyState.isLeaseExpired ? "Lease Expired On" : "Lease End Date"}</p>
                                <p className={cn("text-xl font-bold", tenancyState.isLeaseExpired && "text-destructive")}>
                                    {format(tenancyState.leaseEndDate, 'MMMM do, yyyy')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <CardTitle>Lease Started</CardTitle>
                                <CardDescription>{format(tenancyState.leaseStartDate, 'MMMM do, yyyy')}</CardDescription>
                            </div>

                            {lease && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline"><FileText className="mr-2 h-4 w-4"/> View Lease Agreement</Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl">
                                        <DialogHeader>
                                            <DialogTitle>Lease Agreement</DialogTitle>
                                            <DialogDescription>
                                                This is the lease agreement for {property.title}.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <ScrollArea className="max-h-[60vh] rounded-md border p-4">
                                            <div className="prose prose-sm whitespace-pre-wrap">{lease.leaseText}</div>
                                        </ScrollArea>
                                         <DialogFooter>
                                            <DialogClose asChild>
                                                <Button>Close</Button>
                                            </DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        {tenancyState && (
            <PaymentDialog
                isOpen={isPaymentDialogOpen}
                onClose={() => setIsPaymentDialogOpen(false)}
                onPaymentSuccess={handlePaymentSuccess}
                amount={tenancyState.paymentAmount}
                tenantName={tenant.displayName || tenant.email || ''}
                tenantId={tenant.uid}
                landlordId={property.landlordId}
                propertyId={property.id}
            />
        )}
    </div>
  );
}

// This is the Client Component for rendering UI.
export default function PropertyDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const propertyRef = useMemoFirebase(() => doc(firestore, 'properties', id), [firestore, id]);
  const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);
  
  const landlordRef = useMemoFirebase(() => property ? doc(firestore, 'users', property.landlordId) : null, [firestore, property]);
  const { data: landlord } = useDoc<User>(landlordRef);
  
  const reviewsQuery = useMemoFirebase(() => property ? query(collection(firestore, 'reviews'), where('propertyId', '==', property.id)) : null, [firestore, property]);
  const { data: reviews } = useCollection<Review>(reviewsQuery);
  
  const [isDataReady, setIsDataReady] = useState(false);

  useEffect(() => {
    // This effect ensures that we only proceed when all initial loading is complete.
    if (!isPropertyLoading && !isUserLoading) {
      setIsDataReady(true);
      if (!property) {
        // If loading is done and there's no property, then it's a 404.
        notFound();
      }
    }
  }, [isPropertyLoading, isUserLoading, property]);

  if (!isDataReady) {
    return <TenancySkeleton />;
  }

  const isTenant = user?.uid === property?.currentTenantId;

  const images: ImagePlaceholder[] = property?.images?.map((url, i) => ({
      id: `${property.id}-img-${i}`,
      imageUrl: url,
      description: property.title,
      imageHint: 'apartment interior'
  })) || [];

  if (isTenant && user && property) {
      return <TenantPropertyView property={property} tenant={user} />;
  }

  if (property) {
    return <ProspectiveTenantView property={property} landlord={landlord} reviews={reviews || []} images={images} />;
  }
  
  // This part should ideally not be reached if the useEffect logic is correct.
  return <TenancySkeleton />;
}
