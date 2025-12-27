'use client';

import { notFound, usePathname, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { formatPrice, cn } from "@/utils";
import { getCurrencyByCountry, convertCurrency } from "@/utils/currencies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Star, BedDouble, Bath, Ruler, MapPin, CheckCircle, Wifi, ParkingCircle, Dog, Wind, Tv, MessageSquare, Phone, Bookmark, Share2, Mail, Twitter, Link as LinkIcon, Facebook, Linkedin, User as UserIcon, Building, Users, GraduationCap, ChevronLeft, Heart } from "lucide-react";
import PropertyCard from "@/components/property-card";
import type { Property, UserProfile, PropertyReview, ImagePlaceholder, RentalApplication } from "@/types";
import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import Link from "next/link";
import { FaWhatsapp } from 'react-icons/fa';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TenancySkeleton from "@/components/tenancy-skeleton";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, collection, query, where, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import Loading from "@/app/loading";
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

    const userCurrency = React.useMemo(() => {
        if (userProfile?.currency) return userProfile.currency;
        if (userProfile?.country) return getCurrencyByCountry(userProfile.country);
        return 'USD';
    }, [userProfile]);

    const allAvailablePropertiesQuery = useMemoFirebase(() => query(collection(firestore, 'properties'), where('status', '==', 'available')), [firestore]);
    const { data: allAvailableProperties } = useCollection<Property>(allAvailablePropertiesQuery);

    const similarProperties = React.useMemo(() => {
        if (!property || !allAvailableProperties) return [];
        return allAvailableProperties
            .filter(p =>
                p.id !== property.id &&
                (p.type === property.type || p.location.city === property.location.city)
            )
            .slice(0, 3);
    }, [property, allAvailableProperties]);

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

    const isBookmarked = React.useMemo(() => {
        if (!userProfile || !property) return false;
        const bookmarkedIds = userProfile.bookmarkedPropertyIds || [];
        return bookmarkedIds.includes(property.id);
    }, [userProfile?.bookmarkedPropertyIds, property?.id]);

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
            "priceCurrency": property.currency || "USD"
        },
        "landlord": {
            "@type": "Person",
            "name": landlord?.name,
            "url": isClient ? `${window.location.origin}/landlord/${landlord?.id}` : ''
        }
    };



    const toggleBookmark = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user || !userProfileRef || !property) {
            toast({
                variant: "destructive",
                title: property ? "Login Required" : "Property Not Found",
                description: property ? "Please log in to bookmark properties" : "Wait for property to load",
            });
            return;
        }

        try {
            if (isBookmarked) {
                await updateDoc(userProfileRef, {
                    bookmarkedPropertyIds: arrayRemove(property.id)
                });
                toast({ title: "Removed from bookmarks" });
            } else {
                await updateDoc(userProfileRef, {
                    bookmarkedPropertyIds: arrayUnion(property.id)
                });
                toast({ title: "Added to bookmarks" });
            }
        } catch (error) {
            console.error("Error toggling bookmark:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update bookmarks. Please try again.",
            });
        }
    };

    return (
        <div className="min-h-screen pb-20">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Gallery Section - Full Width on Mobile, Container on Desktop */}
            <div className="relative w-full bg-[#0A0A0A] overflow-hidden lg:rounded-b-[3rem] shadow-2xl">
                <div className="absolute inset-0 z-0 opacity-10">
                    <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
                </div>

                <div className="container mx-auto px-0 lg:px-8 py-0 lg:py-8">
                    {images.length > 0 ? (
                        <Carousel
                            className="w-full relative group"
                            setApi={setApi}
                        >
                            <CarouselContent>
                                {images.map((image, index) => (
                                    <CarouselItem key={image.id}>
                                        <div className="relative aspect-[16/10] md:aspect-[21/9] w-full overflow-hidden lg:rounded-3xl">
                                            <Image
                                                src={image.imageUrl}
                                                alt={`${property.title} - Image ${index + 1}`}
                                                fill
                                                className="object-cover transition-transform duration-700 hover:scale-105"
                                                priority={index === 0}
                                            />
                                            {/* Gradient Overlay for better text readability and depth */}
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

                            {/* Back Button for Detail Page */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-6 left-6 h-10 w-10 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-white/20 transition-all z-20"
                                onClick={() => router.back()}
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>

                            {/* Action Buttons Top Right */}
                            <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-10 w-10 rounded-full border backdrop-blur-md transition-all",
                                        isBookmarked
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                                    )}
                                    onClick={toggleBookmark}
                                >
                                    <Heart className={cn("h-5 w-5", isBookmarked && "fill-current")} />
                                </Button>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-white/20 transition-all"
                                        >
                                            <Share2 className="h-5 w-5" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Share Property</DialogTitle>
                                            <DialogDescription>
                                                Spread the word about this amazing find!
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="flex items-center space-x-2 mt-4">
                                            <Input value={propertyUrl} readOnly className="bg-muted" />
                                            <Button size="icon" onClick={handleCopyToClipboard}><LinkIcon className="h-4 w-4" /></Button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4 mt-6">
                                            <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-2xl">
                                                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(propertyUrl)}`} target="_blank"><Twitter className="h-5 w-5" /></a>
                                            </Button>
                                            <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-2xl">
                                                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(propertyUrl)}`} target="_blank"><FaWhatsapp className="h-5 w-5" /></a>
                                            </Button>
                                            <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-2xl">
                                                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(propertyUrl)}`} target="_blank"><Facebook className="h-5 w-5" /></a>
                                            </Button>
                                            <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-2xl">
                                                <a href={`https://www.linkedin.com/shareArticle?url=${encodeURIComponent(propertyUrl)}`} target="_blank"><Linkedin className="h-5 w-5" /></a>
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
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
                    {/* Left Column: Property Info */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-4 py-1 text-xs font-bold uppercase tracking-widest">{property.type}</Badge>
                                {property.status === 'occupied' && (
                                    <Badge variant="destructive" className="px-4 py-1 text-xs font-bold uppercase tracking-widest">Occupied</Badge>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                                    {property.title}
                                </h1>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-muted-foreground font-medium">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-primary" />
                                        <span>{property.location.address}, {property.location.city}</span>
                                    </div>
                                    {property.location.school && (
                                        <div className="flex items-center gap-2">
                                            <GraduationCap className="h-5 w-5 text-primary" />
                                            <span>Near {property.location.school}</span>
                                        </div>
                                    )}
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
                            <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 flex flex-col items-center text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                                <BedDouble className="h-8 w-8 text-primary mb-3 transition-transform group-hover:scale-110" />
                                <p className="text-xl font-bold">{property.bedrooms}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bedrooms</p>
                            </div>
                            <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 flex flex-col items-center text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                                <Bath className="h-8 w-8 text-primary mb-3 transition-transform group-hover:scale-110" />
                                <p className="text-xl font-bold">{property.bathrooms}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bathrooms</p>
                            </div>
                            <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 flex flex-col items-center text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                                <Ruler className="h-8 w-8 text-primary mb-3 transition-transform group-hover:scale-110" />
                                <p className="text-xl font-bold">{property.area}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Square Feet</p>
                            </div>
                            <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 flex flex-col items-center text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                                <Building className="h-8 w-8 text-primary mb-3 transition-transform group-hover:scale-110" />
                                <p className="text-xl font-bold whitespace-nowrap">{property.type}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Property Type</p>
                            </div>
                        </div>

                        {/* Tabs Content */}
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="w-full justify-start bg-transparent border-b rounded-none px-0 h-auto gap-8 mb-8">
                                <TabsTrigger value="overview" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">Overview</TabsTrigger>
                                <TabsTrigger value="amenities" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">Amenities</TabsTrigger>
                                <TabsTrigger value="rules" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">House Rules</TabsTrigger>
                                <TabsTrigger value="reviews" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">Reviews</TabsTrigger>
                            </TabsList>
                            <TabsContent value="overview" className="mt-0 space-y-6">
                                <h3 className="text-2xl font-bold tracking-tight">About this property</h3>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    {property.description}
                                </p>
                            </TabsContent>
                            <TabsContent value="amenities" className="mt-0">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {property.amenities.map(amenity => (
                                        <div key={amenity} className="flex items-center gap-3 p-4 rounded-2xl border bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all">
                                            <div className="bg-primary/10 p-2 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                                {amenityIcons[amenity] || <CheckCircle className="h-5 w-5" />}
                                            </div>
                                            <span className="font-bold text-sm tracking-tight">{amenity}</span>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="rules" className="mt-0">
                                <div className="bg-muted/20 p-8 rounded-[2rem] border-2 border-dashed border-border">
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {property.rules.map(rule => (
                                            <li key={rule} className="flex items-start gap-3 text-muted-foreground font-medium">
                                                <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                                {rule}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </TabsContent>
                            <TabsContent value="reviews" className="mt-0 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-bold tracking-tight">Student reviews</h3>
                                        <p className="text-sm text-muted-foreground font-medium">Verified feedback from past tenants</p>
                                    </div>
                                    <ReviewButton
                                        propertyId={property.id}
                                        userId={user?.uid}
                                        firestore={firestore}
                                        userProfile={userProfile}
                                    />
                                </div>

                                {reviews && reviews.length > 0 ? (
                                    <div className="space-y-6">
                                        {reviews.map(review => (
                                            <div key={review.id} className="p-6 rounded-3xl border bg-card/50 backdrop-blur-sm space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                                                            <AvatarImage src={review.tenantImageUrl} className="object-cover" />
                                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{review.tenantName?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-bold text-lg leading-none">{review.tenantName}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className="flex">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <Star key={i} className={cn("h-3 w-3", i < review.rating ? "text-yellow-500 fill-current" : "text-muted/30")} />
                                                                    ))}
                                                                </div>
                                                                <span className="text-xs text-muted-foreground font-bold">{new Date(review.reviewDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-muted-foreground leading-relaxed font-medium">{review.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed flex flex-col items-center gap-3">
                                        <Star className="h-8 w-8 text-muted/30" />
                                        <p className="text-muted-foreground font-bold">No reviews yet for this property.</p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Column: Pricing & Booking */}
                    <div className="space-y-6">
                        <div className="sticky top-12 space-y-6">
                            <Card className="border-none bg-background shadow-[0_0_50px_-12px_rgba(0,0,0,0.12)] rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="bg-[#0A0A0A] text-white p-8">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="secondary" className="bg-white/10 text-white border-white/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest">Pricing</Badge>
                                        <div className="flex items-center gap-1 text-white/60">
                                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                            <span className="text-sm font-bold text-white">{averageRating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                    <p className="text-3xl md:text-4xl font-bold tracking-tight truncate">
                                        {userCurrency && userCurrency !== property.currency
                                            ? formatPrice(convertCurrency(property.price, property.currency, userCurrency), userCurrency)
                                            : formatPrice(property.price, property.currency)}
                                        <span className="text-base md:text-lg font-normal text-white/40 ml-1">/mo</span>
                                    </p>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform" disabled={property.status === 'occupied'}>
                                                    Request to Rent
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-lg rounded-3xl">
                                                <DialogHeader>
                                                    <DialogTitle className="text-2xl font-bold">Application for {property.title}</DialogTitle>
                                                    <DialogDescription className="text-base font-medium">
                                                        Start a conversation with {landlord?.name}. Your request will include a text message.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="py-6 space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="message" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Message</Label>
                                                        <Textarea
                                                            id="message"
                                                            placeholder="Describe yourself and why you're interested..."
                                                            className="min-h-[150px] rounded-2xl border-2 focus:ring-primary focus:border-primary text-base p-4"
                                                            value={requestMessage}
                                                            onChange={(e) => setRequestMessage(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter className="gap-3">
                                                    <DialogClose asChild>
                                                        <Button variant="outline" className="h-12 rounded-xl flex-1 border-2">Cancel</Button>
                                                    </DialogClose>
                                                    <Button onClick={handleSendRequest} className="h-12 rounded-xl flex-1 shadow-lg shadow-primary/20">Send Request</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>

                                        <Button variant="outline" className="w-full h-14 rounded-2xl text-lg font-bold border-2 hover:bg-muted/50 transition-colors" onClick={handleMessageLandlord}>
                                            <MessageSquare className="mr-3 h-5 w-5" /> Message Host
                                        </Button>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-border/50">
                                        <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
                                            <span>Landlord Stats</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-muted-foreground font-medium">Response Rate</span>
                                                <span className="font-bold">100%</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-muted-foreground font-medium">Response Time</span>
                                                <span className="font-bold">Under 1hr</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Landlord Profile Mini Card */}
                            {landlord && (
                                <Card className="border-none bg-muted/30 rounded-[2rem] p-6 hover:bg-muted/40 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-16 w-16 shadow-xl border-2 border-background group-hover:scale-105 transition-transform">
                                            <AvatarImage src={landlord.profileImageUrl} className="object-cover" />
                                            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{landlord.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Meet Your Host</p>
                                            <h4 className="text-xl font-headline font-bold">{landlord.name}</h4>
                                            <div className="flex items-center gap-3 mt-2">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <button className="text-muted-foreground hover:text-primary transition-colors">
                                                            <Phone className="h-4 w-4" />
                                                        </button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-sm rounded-[2rem]">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-2xl font-bold">Contact Details</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <Button variant="outline" className="w-full h-12 rounded-xl justify-start border-2" asChild>
                                                                <a href={`mailto:${landlord.email}`}><Mail className="mr-3 h-4 w-4" /> {landlord.email}</a>
                                                            </Button>
                                                            {landlord.phone && (
                                                                <Button variant="outline" className="w-full h-12 rounded-xl justify-start border-2" asChild>
                                                                    <a href={`tel:${landlord.phone}`}><Phone className="mr-3 h-4 w-4" /> {landlord.phone}</a>
                                                                </Button>
                                                            )}
                                                            {landlord.whatsappUrl && (
                                                                <Button variant="outline" className="w-full h-12 rounded-xl justify-start border-2" asChild>
                                                                    <Link href={landlord.whatsappUrl} target="_blank"><FaWhatsapp className="mr-3 h-5 w-5" /> WhatsApp</Link>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                                <a href={`mailto:${landlord.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                                                    <Mail className="h-4 w-4" />
                                                </a>
                                                {landlord.whatsappUrl && (
                                                    <Link href={landlord.whatsappUrl} target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                                                        <FaWhatsapp className="h-4 w-4" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {landlord.bio && (
                                        <p className="mt-4 text-sm text-muted-foreground line-clamp-3 font-medium leading-relaxed">
                                            "{landlord.bio}"
                                        </p>
                                    )}
                                </Card>
                            )}
                        </div>
                    </div>
                </div>

                {/* Similar Properties Section */}
                {similarProperties.length > 0 && (
                    <div className="mt-20 border-t pt-20">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight">Similar Properties</h2>
                                <p className="text-muted-foreground mt-2">Explore other homes you might be interested in.</p>
                            </div>
                            <Button variant="ghost" className="text-primary font-bold gap-2" asChild>
                                <Link href="/student/properties">
                                    View All Properties
                                    <ChevronLeft className="h-4 w-4 rotate-180" />
                                </Link>
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {similarProperties.map((similarProperty) => (
                                <PropertyCard key={similarProperty.id} property={similarProperty} />
                            ))}
                        </div>
                    </div>
                )}
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
            const { collection, addDoc, doc, getDoc } = await import('firebase/firestore');

            await addDoc(collection(firestore, 'propertyReviews'), {
                propertyId,
                tenantId: userId,
                tenantName: userProfile?.name || "Anonymous",
                tenantImageUrl: userProfile?.profileImageUrl || "",
                rating,
                comment,
                reviewDate: new Date().toISOString(),
                tenancyStartDate: leaseDates?.start,
                tenancyEndDate: leaseDates?.end
            });

            // Notify Landlord
            const propRef = doc(firestore, 'properties', propertyId);
            const propSnap = await getDoc(propRef);

            if (propSnap.exists()) {
                const propData = propSnap.data();
                const { sendNotification } = await import('@/lib/notifications');
                await sendNotification({
                    toUserId: propData.landlordId,
                    type: 'REVIEW_SUBMITTED',
                    firestore: firestore,
                    propertyName: propData.title,
                    senderName: userProfile?.name || 'A tenant',
                    link: `/landlord/properties/${propertyId}`
                });
            }

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
