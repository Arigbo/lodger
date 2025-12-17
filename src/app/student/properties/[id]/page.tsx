
'use client';

import { notFound, usePathname, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { formatPrice, cn } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Star, BedDouble, Bath, Ruler, MapPin, CheckCircle, Wifi, ParkingCircle, Dog, Wind, Tv, MessageSquare, Phone, Bookmark, Share2, Mail, Twitter, Link as LinkIcon, Facebook, Linkedin, User as UserIcon, Building, Users, GraduationCap } from "lucide-react";
import type { Property, UserProfile, PropertyReview, ImagePlaceholder, RentalApplication } from "@/types";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import Link from "next/link";
import { FaWhatsapp } from 'react-icons/fa';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TenancySkeleton from "@/components/tenancy-skeleton";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, collection, query, where, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import Loading from "@/app/loading";
import type { Metadata } from 'next';
import { sendNotification } from '@/lib/notifications';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
// This function is for generating dynamic metadata and is commented out
// because this is a client component. For SEO on dynamic client-rendered pages,
// you would typically fetch data in a parent Server Component and pass it down,
// or use a client-side solution to update the document head.

// export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
//   if (!adminFirestore) {
//     return { title: "Property Details" };
//   }
//   const propertyRef = doc(adminFirestore, 'properties', params.id);
//   const propertySnap = await getDoc(propertyRef);

//   if (!propertySnap.exists()) {
//     return {
//       title: 'Property Not Found',
//       description: 'The property you are looking for does not exist.',
//     };
//   }

//   const property = propertySnap.data() as Property;

//   return {
//     title: property.title,
//     description: property.description.substring(0, 160),
//     openGraph: {
//       title: property.title,
//       description: property.description.substring(0, 160),
//       images: [
//         {
//           url: property.images[0],
//           width: 1200,
//           height: 630,
//           alt: property.title,
//         },
//       ],
//     },
//     twitter: {
//       card: 'summary_large_image',
//       title: property.title,
//       description: property.description.substring(0, 160),
//       images: [property.images[0]],
//     }
//   };
// }


const amenityIcons: { [key: string]: React.ReactNode } = {
    'Furnished': <Tv className="h-5 w-5 text-primary" />,
    'Wi-Fi': <Wifi className="h-5 w-5 text-primary" />,
    'In-unit Laundry': <Wind className="h-5 w-5 text-primary" />,
    'Pet Friendly': <Dog className="h-5 w-5 text-primary" />,
    'Parking Spot': <ParkingCircle className="h-5 w-5 text-primary" />,
};

export default function PropertyDetailPage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const firestore = useFirestore();
    const pathname = usePathname();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    const [requestMessage, setRequestMessage] = useState("");
    const [isClient, setIsClient] = useState(false);

    const [api, setApi] = React.useState<any>();
    const [current, setCurrent] = React.useState(0);
    const [count, setCount] = React.useState(0);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!api) {
            return;
        }

        setCount(api.scrollSnapList().length);
        setCurrent(api.selectedScrollSnap() + 1);

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1);
        });
    }, [api]);

    const propertyRef = useMemoFirebase(() => id ? doc(firestore, 'properties', id) : null, [firestore, id]);
    const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);

    const landlordRef = useMemoFirebase(() => property ? doc(firestore, 'users', property.landlordId) : null, [firestore, property]);
    const { data: landlord, isLoading: isLandlordLoading } = useDoc<UserProfile>(landlordRef);

    const reviewsQuery = useMemoFirebase(() => id ? query(collection(firestore, 'propertyReviews'), where('propertyId', '==', id)) : null, [firestore, id]);
    const { data: reviews, isLoading: areReviewsLoading } = useCollection<PropertyReview>(reviewsQuery);

    // Fetch current user's profile to get their name for notifications
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);

    // const applicationsQuery = useMemoFirebase(() => id ? query(collection(firestore, 'rentalApplications'), where('propertyId', '==', id), where('status', '==', 'pending')) : null, [firestore, id]);
    // const { data: applications, isLoading: areApplicationsLoading } = useCollection<RentalApplication>(applicationsQuery);
    const applications: RentalApplication[] = []; // Default to empty to prevent UI errors
    const areApplicationsLoading = false;

    // SEO effect for client components
    useEffect(() => {
        if (property) {
            document.title = `${property.title} | Lodger`;
            const descriptionTag = document.querySelector('meta[name="description"]');
            if (descriptionTag) {
                descriptionTag.setAttribute('content', property.description.substring(0, 160));
            }
        }
    }, [property]);

    const isLoading = isPropertyLoading || isLandlordLoading || areReviewsLoading || isUserLoading || areApplicationsLoading || isUserProfileLoading;

    if (isLoading) {
        return <Loading />;
    }

    if (!property) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="rounded-full bg-secondary p-4">
                    <Building className="h-10 w-10 text-muted-foreground" />
                </div>
                <h1 className="mt-6 text-2xl font-bold">Property Not Found</h1>
                <p className="mt-2 text-muted-foreground">The property you are looking for does not exist or is no longer available.</p>
                <Button asChild className="mt-6">
                    <Link href="/student/properties">Browse Other Properties</Link>
                </Button>
            </div>
        );
    }

    const images: ImagePlaceholder[] = property?.images?.map((url, i) => ({
        id: `${property.id}-img-${i}`,
        imageUrl: url,
        description: property.title,
        imageHint: 'apartment interior'
    })) || [];

    const handleMessageLandlord = () => {
        if (!user) {
            toast({
                variant: "destructive",
                title: "Not Logged In",
                description: "You must be logged in to message a landlord.",
            });
            router.push('/auth/login');
            return;
        }
        if (landlord) {
            router.push(`/student/messages?contact=${landlord.id}`);
        }
    };

    const averageRating = reviews && reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

    const propertyUrl = isClient ? `${window.location.origin}${pathname}` : '';

    const handleSendRequest = async () => {
        if (!user || !landlord || !property) {
            toast({
                variant: "destructive",
                title: "Login or Data Missing",
                description: "You must be logged in and property data must be loaded to send a request.",
            });
            if (!user) router.push('/auth/login');
            return;
        }

        const rentalRequestsRef = collection(firestore, 'rentalApplications');
        const applicationData = {
            propertyId: property.id,
            tenantId: user.uid,
            landlordId: property.landlordId, // Ensure landlordId is included
            messageToLandlord: requestMessage,
            applicationDate: new Date().toISOString(),
            status: 'pending' as const,
        };

        try {
            // First, add the rental application
            const newApplicationRef = await addDoc(rentalRequestsRef, applicationData);
            await updateDoc(newApplicationRef, { id: newApplicationRef.id });

            // Then, send a message to initiate the conversation
            const messagesRef = collection(firestore, 'messages');
            await addDoc(messagesRef, {
                text: requestMessage || `Hi, I'm interested in renting ${property.title}.`,
                senderId: user.uid,
                recipientId: landlord.id,
                participantIds: [user.uid, landlord.id].sort(),
                timestamp: serverTimestamp(),
                read: false,
            });

            // Notify Landlord: New Request
            await sendNotification({
                toUserId: landlord.id,
                type: 'NEW_REQUEST',
                firestore: firestore,
                senderName: userProfile?.name || 'A student',
                propertyName: property.title,
                link: `/landlord/requests`
            });

            // Notify Landlord: New Message
            await sendNotification({
                toUserId: landlord.id,
                type: 'NEW_MESSAGE',
                firestore: firestore,
                senderName: userProfile?.name || 'A student',
                customMessage: requestMessage || `Hi, I'm interested in renting ${property.title}.`,
                link: `/landlord/messages?conversationId=${user.uid}`
            });

            toast({
                title: "Request Sent!",
                description: "Your rental request has been sent to the landlord.",
            });

            router.push(`/student/messages?conversationId=${landlord.id}`);

        } catch (error: unknown) {
            console.error("Error sending rental request:", error);
            // This is a good place to use the custom error emitter if a permission error is caught
            if (error instanceof Error && error.message.includes('permission-denied')) {
                const permissionError = new FirestorePermissionError({
                    path: rentalRequestsRef.path,
                    operation: 'create',
                    requestResourceData: applicationData,
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                toast({
                    variant: "destructive",
                    title: "Uh oh! Something went wrong.",
                    description: "Could not send your rental request. Please try again later.",
                });
            }
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(propertyUrl);
        toast({ title: "Link Copied!", description: "Property URL copied to your clipboard." });
    };

    const handleNativeShare = async () => {
        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({
                    title: property.title,
                    text: `Check out this property: ${property.title}`,
                    url: propertyUrl,
                });
            } catch (error: unknown) {
                if ((error as Error).name !== 'AbortError') {
                    console.error("Error sharing:", error);
                }
            }
        } else {
            alert("Web Share API is not supported in your browser. Use the links below to share.");
        }
    };

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": property.title,
        "description": property.description,
        "image": property.images,
        "url": propertyUrl,
        "leaseLength": {
            "@type": "QuantitativeValue",
            "value": 12,
            "unitCode": "MON"
        },
        "floorSize": {
            "@type": "QuantitativeValue",
            "value": property.area,
            "unitCode": "FTS"
        },
        "numberOfBedrooms": property.bedrooms,
        "numberOfBathroomsTotal": property.bathrooms,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": property.location.address,
            "addressLocality": property.location.city,
            "addressRegion": property.location.state,
            "postalCode": property.location.zip,
            "addressCountry": "US" // Assuming US for now
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": property.location.lat,
            "longitude": property.location.lng
        },
        "offers": {
            "@type": "Offer",
            "price": property.price,
            "priceCurrency": "USD"
        },
        "landlord": {
            "@type": "Person",
            "name": landlord?.name,
            "url": isClient ? `${window.location.origin}/landlord/${landlord?.id}` : ''
        }
    };


    return (
        <div className="container mx-auto max-w-7xl px-4 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12">
                <div className="lg:col-span-2">
                    <div className="mb-8">
                        {images.length > 0 ? (
                            <Carousel
                                className="w-full max-w-5xl mx-auto"
                                setApi={setApi} // Capture API to track slides
                            >
                                <CarouselContent>
                                    {images.map((image, index) => (
                                        <CarouselItem key={image.id}>
                                            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                                <Image
                                                    src={image.imageUrl}
                                                    alt={`${property.title} - Image ${index + 1}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <CarouselPrevious className="left-2" />
                                <CarouselNext className="right-2" />
                                <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
                                    {current} / {count}
                                </div>
                            </Carousel>
                        ) : (
                            <div className="flex h-[400px] w-full items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold">No Images Available</h3>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                        <div>
                            <Badge variant="secondary" className="mb-2">{property.type}</Badge>
                            <h1 className="font-headline text-4xl font-bold">{property.title}</h1>
                            <div className="mt-2 flex items-center gap-4 text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{property.location.address}, {property.location.city}</span>
                                </div>
                                {property.location.school && (
                                    <div className="flex items-center gap-1 text-muted-foreground/90">
                                        <GraduationCap className="h-4 w-4" />
                                        <span>Near {property.location.school}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 text-accent fill-current" />
                                    <span>{averageRating.toFixed(1)} ({reviews?.length || 0} reviews)</span>
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
                            <div className="flex items-center justify-between">
                                <h3 className="font-headline text-2xl font-semibold">Comments & Reviews</h3>
                                {/* Only show review button to verified tenants */}
                                <ReviewButton
                                    propertyId={property.id}
                                    userId={user?.uid}
                                    firestore={firestore}
                                    userProfile={userProfile}
                                />
                            </div>

                            {reviews && reviews.map(review => {
                                return (
                                    <div key={review.id} className="flex gap-4 pt-6 border-t">
                                        <Avatar>
                                            <AvatarFallback>
                                                <UserIcon className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold">{review.tenantName || 'Tenant'}</p>
                                                <div className="flex flex-col">
                                                    <p className="text-xs text-muted-foreground">{new Date(review.reviewDate).toLocaleDateString()}</p>
                                                    {review.tenancyStartDate && review.tenancyEndDate && (
                                                        <p className="text-[10px] text-muted-foreground">
                                                            Tenant: {new Date(review.tenancyStartDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} - {new Date(review.tenancyEndDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-0.5 mt-1">
                                                {[...Array(5)].map((_, i) => <Star key={i} className={cn("h-4 w-4", i < review.rating ? "text-accent fill-current" : "text-muted-foreground")} />)}
                                            </div>
                                            <p className="mt-2 text-foreground/80">{review.comment}</p>
                                        </div>
                                    </div>
                                )
                            })}
                            {(!reviews || reviews.length === 0) && <p className="text-muted-foreground pt-6 border-t">No reviews yet.</p>}
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        <Card>
                            <CardContent className="p-4 flex items-center justify-around">
                                <Button variant="ghost" className="flex flex-col h-auto gap-1">
                                    <Bookmark className="h-5 w-5" />
                                    <span className="text-xs">Save</span>
                                </Button>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" className="flex flex-col h-auto gap-1">
                                            <Share2 className="h-5 w-5" />
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
                                        {isClient && typeof navigator.share === 'function' && (
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

                        {applications && applications.length > 0 && (
                            <Card>
                                <CardHeader className="flex-row items-center gap-2 space-y-0">
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                    <CardTitle className="text-base font-semibold">{applications.length} Student{applications.length > 1 ? 's' : ''} on Waitlist</CardTitle>
                                </CardHeader>
                            </Card>
                        )}

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
                                    <Separator className="my-4" />
                                    <div className="flex flex-col gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button className="w-full" disabled={property.status === 'occupied'}>
                                                    Request to Rent
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
                                                            placeholder="Hi, I'm very interested in this property..."
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
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1" onClick={handleMessageLandlord}>
                                                <MessageSquare className="mr-2 h-4 w-4" /> Message
                                            </Button>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="icon">
                                                        <Phone className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-sm">
                                                    <DialogHeader>
                                                        <DialogTitle>Contact {landlord.name}</DialogTitle>
                                                        <DialogDescription>
                                                            Use these methods to get in touch.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <Button variant="outline" className="w-full justify-start" asChild>
                                                            <a href={`mailto:${landlord.email}`}>
                                                                <Mail className="mr-2" /> {landlord.email}
                                                            </a>
                                                        </Button>
                                                        {landlord.phone && (
                                                            <Button variant="outline" className="w-full justify-start" asChild>
                                                                <a href={`tel:${landlord.phone}`}>
                                                                    <Phone className="mr-2" /> {landlord.phone}
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
                                                                    <Twitter className="mr-2" /> View X (Twitter) Profile
                                                                </Link>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
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

function ReviewButton({ propertyId, userId, firestore, userProfile }: { propertyId: string, userId?: string, firestore: any, userProfile?: UserProfile | null }) {
    const [isTenant, setIsTenant] = useState(false);
    const [existingReview, setExistingReview] = useState<any>(null); // Store existing review
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [leaseDates, setLeaseDates] = useState<{ start: string, end: string } | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        if (!userId || !firestore) return;
        const checkTenancy = async () => {
            // Check leases where this user is tenant and property matches
            const q = query(
                collection(firestore, 'leaseAgreements'),
                where('tenantId', '==', userId),
                where('propertyId', '==', propertyId)
            );

            import('firebase/firestore').then(async ({ getDocs }) => {
                try {
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        setIsTenant(true);
                        // Capture lease dates from the first matching lease (assuming most recent or relevant)
                        const leaseData = snap.docs[0].data();
                        if (leaseData.startDate && leaseData.endDate) {
                            setLeaseDates({ start: leaseData.startDate, end: leaseData.endDate });
                        }
                    }
                } catch (e) {
                    console.error("Tenancy check failed", e);
                }
            });
        };

        const checkExistingReview = async () => {
            const q = query(
                collection(firestore, 'propertyReviews'),
                where('propertyId', '==', propertyId),
                where('tenantId', '==', userId)
            );
            import('firebase/firestore').then(async ({ getDocs }) => {
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    setExistingReview({ id: snap.docs[0].id, ...data });
                    setRating(data.rating);
                    setComment(data.comment);
                } else {
                    setExistingReview(null);
                    setRating(5);
                    setComment("");
                }
            });
        }

        checkTenancy();
        checkExistingReview();
    }, [userId, propertyId, firestore]);

    const handleSubmit = async () => {
        if (!comment.trim()) {
            toast({ variant: "destructive", title: "Error", description: "Please write a comment." });
            return;
        }

        try {
            await addDoc(collection(firestore, 'propertyReviews'), {
                propertyId,
                tenantId: userId,
                tenantName: userProfile?.name || "Anonymous",
                rating,
                comment,
                reviewDate: new Date().toISOString(),
                tenancyStartDate: leaseDates?.start,
                tenancyEndDate: leaseDates?.end
            });

            // Notify Landlord
            const propertySnap = await import('firebase/firestore').then(m => m.getDoc(import('firebase/firestore').then(mod => mod.doc(firestore, 'properties', propertyId))));
            // We need to fetch property to get landlordId, but `ReviewButton` prop only has propertyId.
            // Ideally parent passes landlordId. But let's fetch property here or rely on specific prop.
            // Actually, checking how `ReviewButton` is called... it doesn't have landlordId prop.
            // Let's do a quick fetch or update calling component. 
            // Time Constraint: Fetch property here to get landlordId is safest without prop drilling.

            import('firebase/firestore').then(async ({ doc, getDoc }) => {
                const propRef = doc(firestore, 'properties', propertyId);
                const propSnap = await getDoc(propRef);
                if (propSnap.exists()) {
                    const propData = propSnap.data();
                    await import('@/lib/notifications').then(({ sendNotification }) => {
                        sendNotification({
                            toUserId: propData.landlordId,
                            type: 'REVIEW_SUBMITTED',
                            firestore: firestore,
                            propertyName: propData.title,
                            senderName: userProfile?.name || 'A tenant',
                            link: `/landlord/properties/${propertyId}` // Link to property page where reviews are
                        });
                    });
                }
            });

            toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
            setIsOpen(false);
            setComment("");
            setRating(5);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to submit review." });
        }
    }

    const handleDelete = async () => {
        if (!existingReview) return;
        if (!confirm("Are you sure you want to delete your review?")) return;

        try {
            await import('firebase/firestore').then(({ doc, deleteDoc }) =>
                deleteDoc(doc(firestore, 'propertyReviews', existingReview.id))
            );
            toast({ title: "Review Deleted", description: "Your review has been removed." });
            setExistingReview(null);
            setRating(5);
            setComment("");
            setIsOpen(false);
            window.location.reload();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete review." });
        }
    }

    if (!isTenant) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant={existingReview ? "secondary" : "default"}>
                    {existingReview ? "Edit Your Review" : "Write a Review"}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{existingReview ? "Edit Review" : "Rate this Property"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex flex-col gap-2">
                        <Label>Rating</Label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setRating(star)} type="button">
                                    <Star className={cn("h-6 w-6", star <= rating ? "text-accent fill-current" : "text-muted-foreground")} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Comment</Label>
                        <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience..." />
                    </div>
                </div>
                <DialogFooter className="flex justify-between sm:justify-between">
                    {existingReview && (
                        <Button variant="destructive" onClick={handleDelete} type="button">Delete Review</Button>
                    )}
                    <Button onClick={handleSubmit}>{existingReview ? "Update Review" : "Submit Review"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
