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
import { Star, BedDouble, Bath, Ruler, MapPin, CheckCircle, Wifi, ParkingCircle, Dog, Wind, Tv, MessageSquare, Phone, Bookmark, Share2, Mail, Twitter, Link as LinkIcon, Facebook, Linkedin, User as UserIcon, Building, Users, GraduationCap, ChevronLeft, Heart, Video, Maximize2 } from "lucide-react";
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
import { PropertyGallery } from "@/components/property-gallery";
import { PropertyHeroCarousel } from "@/components/property-hero-carousel";
import { SharePropertyModal } from "@/components/share-property-modal";
import dynamic from 'next/dynamic';

const PropertyMap = dynamic(() => import('@/components/PropertyMap'), { 
    ssr: false,
    loading: () => <div className="h-[400px] w-full rounded-[2rem] bg-muted animate-pulse" />
});

const amenityIcons: { [key: string]: React.ReactNode } = {
    'Furnished': <Tv className="h-5 w-5 text-primary" />,
    'Wi-Fi': <Wifi className="h-5 w-5 text-primary" />,
    'In-unit Laundry': <Wind className="h-5 w-5 text-primary" />,
    'Pet Friendly': <Dog className="h-5 w-5 text-primary" />,
    'Parking Spot': <ParkingCircle className="h-5 w-5 text-primary" />,
};

export default function PropertyDetailClient({ initialProperty, propertyId }: { initialProperty: Property, propertyId: string }) {
    const params = useParams();
    const id = propertyId;
    const firestore = useFirestore();
    const pathname = usePathname();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    const [requestMessage, setRequestMessage] = useState("");
    const [isClient, setIsClient] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const propertyRef = useMemoFirebase(() => id ? doc(firestore, 'properties', id) : null, [firestore, id]);
    const { data: propertyData, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);
    
    // Use initial property if real-time data hasn't loaded yet
    const property = propertyData || initialProperty;

    const landlordRef = useMemoFirebase(() => property ? doc(firestore, 'users', property.landlordId) : null, [firestore, property]);
    const { data: landlord, isLoading: isLandlordLoading } = useDoc<UserProfile>(landlordRef);

    const reviewsQuery = useMemoFirebase(() => id ? query(collection(firestore, 'propertyReviews'), where('propertyId', '==', id)) : null, [firestore, id]);
    const { data: reviews, isLoading: areReviewsLoading } = useCollection<PropertyReview>(reviewsQuery);

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const applications: RentalApplication[] = [];
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

    const isBookmarked = React.useMemo(() => {
        if (!userProfile || !property) return false;
        const bookmarkedIds = userProfile.bookmarkedPropertyIds || [];
        return bookmarkedIds.includes(property.id);
    }, [userProfile?.bookmarkedPropertyIds, property?.id]);

    const isLoading = isLandlordLoading || areReviewsLoading || isUserLoading || areApplicationsLoading || isUserProfileLoading;

    if (!property && !isLoading) {
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

    const averageRating = reviews && reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
    const propertyUrl = isClient ? `${window.location.origin}${pathname}` : '';

    const handleMessageLandlord = () => {
        if (!user) {
            toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to message a landlord." });
            router.push('/auth/login');
            return;
        }
        if (landlord) {
            router.push(`/student/messages?contact=${landlord.id}`);
        }
    };

    const handleSendRequest = async () => {
        if (!user || !landlord || !property) {
            toast({ variant: "destructive", title: "Login or Data Missing", description: "You must be logged in and property data must be loaded to send a request." });
            if (!user) router.push('/auth/login');
            return;
        }

        const rentalRequestsRef = collection(firestore, 'rentalApplications');
        const applicationData = {
            propertyId: property.id,
            tenantId: user.uid,
            landlordId: property.landlordId,
            messageToLandlord: requestMessage,
            applicationDate: new Date().toISOString(),
            status: 'pending' as const,
        };

        try {
            const newApplicationRef = await addDoc(rentalRequestsRef, applicationData);
            await updateDoc(newApplicationRef, { id: newApplicationRef.id });

            const messagesRef = collection(firestore, 'messages');
            await addDoc(messagesRef, {
                text: requestMessage || `Hi, I'm interested in renting ${property.title}.`,
                senderId: user.uid,
                recipientId: landlord.id,
                participantIds: [user.uid, landlord.id].sort(),
                timestamp: serverTimestamp(),
                read: false,
            });

            await sendNotification({
                toUserId: landlord.id,
                type: 'NEW_REQUEST',
                firestore: firestore,
                senderName: userProfile?.name || 'A student',
                propertyName: property.title,
                link: `/landlord/requests`
            });

            toast({ title: "Request Sent!", description: "Your rental request has been sent to the landlord." });
            router.push(`/student/messages?conversationId=${landlord.id}`);
        } catch (error: any) {
            console.error("Error sending rental request:", error);
            toast({ variant: "destructive", title: "Uh oh! Something went wrong.", description: "Could not send your rental request. Please try again later." });
        }
    };

    const toggleBookmark = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!user || !userProfileRef || !property) {
            toast({ variant: "destructive", title: "Login Required", description: "Please log in to bookmark properties" });
            return;
        }
        try {
            if (isBookmarked) {
                await updateDoc(userProfileRef, { bookmarkedPropertyIds: arrayRemove(property.id) });
                toast({ title: "Removed from bookmarks" });
            } else {
                await updateDoc(userProfileRef, { bookmarkedPropertyIds: arrayUnion(property.id) });
                toast({ title: "Added to bookmarks" });
            }
        } catch (error) {
            console.error("Error toggling bookmark:", error);
        }
    };

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": property.title,
        "description": property.description,
        "image": property.images,
        "url": propertyUrl,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": property?.location?.address || '',
            "addressLocality": property?.location?.city || '',
            "addressRegion": property?.location?.state || '',
        },
        "offers": {
            "@type": "Offer",
            "price": property?.price || 0,
            "priceCurrency": property?.currency || "USD"
        }
    };

    return (
        <div className="min-h-screen pb-20">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <div className="container mx-auto max-w-7xl px-4 lg:px-8 mt-0">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 hover:gap-3 transition-all">
                    <ChevronLeft className="h-4 w-4" /> Back to Properties
                </Button>
            </div>

            <div className="container mx-auto max-w-7xl px-4 lg:px-8 mt-4">
                <PropertyHeroCarousel images={property.images} title={property.title} />
            </div>

            <div className="container mx-auto max-w-7xl px-4 lg:px-8 mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-12">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-4 py-1 text-xs font-bold uppercase tracking-widest">{property.type}</Badge>
                                {property.status === 'occupied' && (
                                    <Badge variant="destructive" className="px-4 py-1 text-xs font-bold uppercase tracking-widest">Occupied</Badge>
                                )}
                            </div>
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1] flex-1 uppercase">{property.title}</h1>
                                <div className="flex items-center gap-3 shrink-0 md:mt-2">
                                    <Button variant="outline" size="icon" className={cn("h-14 w-14 rounded-2xl border-2 transition-all hover:scale-105", isBookmarked ? "bg-red-50 border-red-100 text-red-500 hover:bg-red-100" : "bg-white hover:border-primary/20")} onClick={toggleBookmark}>
                                        <Heart className={cn("h-6 w-6", isBookmarked && "fill-current")} />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-2 bg-white hover:border-primary/20 transition-all hover:scale-105" onClick={() => setIsShareModalOpen(true)}>
                                        <Share2 className="h-6 w-6" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-muted-foreground font-medium">
                                <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><span>{property.location?.address}, {property.location?.city}</span></div>
                                {property.location?.school && (<div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /><span>Near {property.location?.school}</span></div>)}
                                <div className="flex items-center gap-2">
                                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                                    <span className="text-foreground">{averageRating.toFixed(1)}</span>
                                    <span className="text-sm font-normal">({reviews?.length || 0} reviews)</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 flex flex-col items-center text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                                <BedDouble className="h-8 w-8 text-primary mb-3 transition-transform group-hover:scale-110" /><p className="text-xl font-bold">{property.bedrooms}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bedrooms</p>
                            </div>
                            <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 flex flex-col items-center text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                                <Bath className="h-8 w-8 text-primary mb-3 transition-transform group-hover:scale-110" /><p className="text-xl font-bold">{property.bathrooms}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bathrooms</p>
                            </div>
                            <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 flex flex-col items-center text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                                <Ruler className="h-8 w-8 text-primary mb-3 transition-transform group-hover:scale-110" /><p className="text-xl font-bold">{property.area}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Square Feet</p>
                            </div>
                            <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 flex flex-col items-center text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                                <Building className="h-8 w-8 text-primary mb-3 transition-transform group-hover:scale-110" /><p className="text-xl font-bold whitespace-nowrap">{property.type}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Property Type</p>
                            </div>
                        </div>

                        <Separator className="bg-foreground/5 h-0.5 rounded-full" />

                        {/* Location Section - Always Visible */}
                        {property.location?.lat && property.location?.lng && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold tracking-tight uppercase">Location</h3>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground/40 tracking-widest">
                                        <MapPin className="h-3 w-3 text-primary" />
                                        {Number(property.location.lat).toFixed(4)}, {Number(property.location.lng).toFixed(4)}
                                    </div>
                                </div>
                                <div className="rounded-[2.5rem] overflow-hidden border-2 border-foreground/[0.02] shadow-2xl">
                                    <PropertyMap 
                                        lat={Number(property.location.lat)} 
                                        lng={Number(property.location.lng)} 
                                        title={property.title} 
                                    />
                                </div>
                            </div>
                        )}

                        <Separator className="bg-foreground/5 h-0.5 rounded-full" />

                        <Tabs defaultValue="gallery" className="w-full">
                            <TabsList className="w-full justify-start bg-transparent border-b rounded-none px-0 h-auto gap-8 mb-8">
                                <TabsTrigger value="gallery" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">Gallery</TabsTrigger>
                                <TabsTrigger value="overview" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">Overview</TabsTrigger>
                                <TabsTrigger value="amenities" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">Amenities</TabsTrigger>
                                <TabsTrigger value="rules" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">House Rules</TabsTrigger>
                                <TabsTrigger value="reviews" className="text-base font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4">Reviews</TabsTrigger>
                            </TabsList>
                            <TabsContent value="gallery" className="mt-0 space-y-6">
                                <PropertyGallery images={property.images} videos={property.videos} title={property.title} />
                            </TabsContent>
                            <TabsContent value="overview" className="mt-0 space-y-6">
                                <h3 className="text-2xl font-bold tracking-tight">About this property</h3>
                                <p className="text-lg text-muted-foreground leading-relaxed">{property.description}</p>
                            </TabsContent>
                            <TabsContent value="amenities" className="mt-0">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {Array.isArray(property.amenities) && property.amenities.map(amenity => (
                                        <div key={amenity} className="flex items-center gap-3 p-4 rounded-2xl border bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all">
                                            <div className="bg-primary/10 p-2 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all">{amenityIcons[amenity] || <CheckCircle className="h-5 w-5" />}</div>
                                            <span className="font-bold text-sm tracking-tight">{amenity}</span>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="rules" className="mt-0">
                                <div className="bg-muted/20 p-8 rounded-[2rem] border-2 border-dashed border-border">
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Array.isArray(property.rules) ? property.rules.map(rule => (
                                            <li key={rule} className="flex items-start gap-3 text-muted-foreground font-medium"><div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />{rule}</li>
                                        )) : (
                                            <li className="flex items-start gap-3 text-muted-foreground font-medium"><div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />{property.rules}</li>
                                        )}
                                    </ul>
                                </div>
                            </TabsContent>
                            <TabsContent value="reviews" className="mt-0 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold tracking-tight">Student reviews</h3>
                                    <ReviewButton propertyId={property.id} userId={user?.uid} firestore={firestore} userProfile={userProfile} />
                                </div>
                                {reviews && reviews.length > 0 ? (
                                    <div className="space-y-6">
                                        {reviews.map(review => (
                                            <div key={review.id} className="p-6 rounded-3xl border bg-card/50 backdrop-blur-sm space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                                                        <AvatarImage src={review.tenantImageUrl} className="object-cover" />
                                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{review.tenantName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-bold text-lg leading-none">{review.tenantName}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex italic">{[...Array(5)].map((_, i) => (<Star key={i} className={cn("h-3 w-3", i < review.rating ? "text-yellow-500 fill-current" : "text-muted/30")} />))}</div>
                                                            <span className="text-xs text-muted-foreground font-bold">{new Date(review.reviewDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-muted-foreground leading-relaxed font-medium">{review.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed flex flex-col items-center gap-3"><Star className="h-8 w-8 text-muted/30" /><p className="text-muted-foreground font-bold">No reviews yet for this property.</p></div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="space-y-6">
                        <div className="sticky top-12 space-y-6">
                            <Card className="border-none bg-background shadow-[0_0_50px_-12px_rgba(0,0,0,0.12)] rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="bg-[#0A0A0A] text-white p-8">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="secondary" className="bg-white/10 text-white border-white/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest">Pricing</Badge>
                                        <div className="flex items-center gap-1 text-white/60"><Star className="h-4 w-4 text-yellow-500 fill-current" /><span className="text-sm font-bold text-white">{averageRating.toFixed(1)}</span></div>
                                    </div>
                                    <p className="text-3xl md:text-4xl font-bold tracking-tight truncate">
                                        {userCurrency && userCurrency !== property.currency ? formatPrice(convertCurrency(property.price, property.currency, userCurrency), userCurrency) : formatPrice(property.price, property.currency)}
                                        <span className="text-base md:text-lg font-normal text-white/40 ml-1">/mo</span>
                                    </p>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <Dialog>
                                            <DialogTrigger asChild><Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20" disabled={property.status === 'occupied'}>Request to Rent</Button></DialogTrigger>
                                            <DialogContent className="sm:max-w-lg rounded-3xl">
                                                <DialogHeader><DialogTitle className="text-2xl font-bold uppercase">Application for {property.title}</DialogTitle><DialogDescription className="text-base font-medium">Start a conversation with {landlord?.name}. Your request will include a text message.</DialogDescription></DialogHeader>
                                                <div className="py-6 space-y-4"><div className="space-y-2"><Label htmlFor="message">Your Message</Label><Textarea id="message" placeholder="Describe yourself..." className="min-h-[150px] active:ring-primary" value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} /></div></div>
                                                <DialogFooter className="gap-3"><DialogClose asChild><Button variant="outline" className="h-12 rounded-xl flex-1 border-2">Cancel</Button></DialogClose><Button onClick={handleSendRequest} className="h-12 rounded-xl flex-1">Send Request</Button></DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                        <Button variant="outline" className="w-full h-14 rounded-2xl text-lg font-bold border-2 hover:bg-muted/50" onClick={handleMessageLandlord}><MessageSquare className="mr-3 h-5 w-5" /> Message Host</Button>
                                    </div>
                                    <div className="space-y-4 pt-4 border-t border-border/50">
                                        <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-muted-foreground/60"><span>Landlord Stats</span></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1"><span className="text-xs text-muted-foreground font-medium">Response Rate</span><span className="font-bold">100%</span></div>
                                            <div className="flex flex-col gap-1"><span className="text-xs text-muted-foreground font-medium">Response Time</span><span className="font-bold">Under 1hr</span></div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {landlord && (
                                <Card className="border-none bg-muted/30 rounded-[2rem] p-6 hover:bg-muted/40 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-16 w-16 shadow-xl border-2 border-background group-hover:scale-105 transition-transform"><AvatarImage src={landlord.profileImageUrl} className="object-cover" /><AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{landlord.name[0]}</AvatarFallback></Avatar>
                                        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Meet Your Host</p><h4 className="text-xl font-headline font-bold">{landlord.name}</h4><div className="flex items-center gap-3 mt-2"><a href={`mailto:${landlord.email}`} className="text-muted-foreground hover:text-primary"><Mail className="h-4 w-4" /></a>{landlord.whatsappUrl && (<Link href={landlord.whatsappUrl} target="_blank" className="text-muted-foreground hover:text-primary"><FaWhatsapp className="h-4 w-4" /></Link>)}</div></div>
                                    </div>
                                    {landlord.bio && (<p className="mt-4 text-sm text-muted-foreground line-clamp-3 font-medium leading-relaxed">"{landlord.bio}"</p>)}
                                </Card>
                            )}
                        </div>
                    </div>
                </div>

                {similarProperties.length > 0 && (
                    <div className="mt-20 border-t pt-20">
                        <div className="flex items-center justify-between mb-8"><div><h2 className="text-3xl font-bold tracking-tight">Similar Properties</h2><p className="text-muted-foreground mt-2">Explore other homes.</p></div><Button variant="ghost" className="text-primary font-bold gap-2" asChild><Link href="/student/properties">View All <ChevronLeft className="h-4 w-4 rotate-180" /></Link></Button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{similarProperties.map((similarProperty) => (<PropertyCard key={similarProperty.id} property={similarProperty} />))}</div>
                    </div>
                )}
                <SharePropertyModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} propertyId={property.id} propertyTitle={property.title} />
            </div>
        </div>
    );
}

function ReviewButton({ propertyId, userId, firestore, userProfile }: { propertyId: string, userId?: string, firestore: any, userProfile?: UserProfile | null }) {
    const [isTenant, setIsTenant] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const { toast } = useToast();

    React.useEffect(() => {
        if (!userId || !firestore) return;
        const checkTenancy = async () => {
            const q = query(collection(firestore, 'leaseAgreements'), where('tenantId', '==', userId), where('propertyId', '==', propertyId));
            const { getDocs } = await import('firebase/firestore');
            const snap = await getDocs(q);
            if (!snap.empty) setIsTenant(true);
        };
        checkTenancy();
    }, [userId, propertyId, firestore]);

    const handleSubmit = async () => {
        if (!userId || !userProfile) return;
        try {
            await addDoc(collection(firestore, 'propertyReviews'), {
                propertyId,
                tenantId: userId,
                tenantName: userProfile.name,
                tenantImageUrl: userProfile.profileImageUrl,
                rating,
                comment,
                reviewDate: new Date().toISOString()
            });
            toast({ title: "Review Submitted!" });
            setIsOpen(false);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not submit review." });
        }
    };

    if (!isTenant) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button variant="outline" className="rounded-xl border-primary text-primary hover:bg-primary hover:text-white font-bold h-10 px-6">Leave a Review</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2.5rem]"><DialogHeader><DialogTitle className="text-2xl font-bold uppercase">Rate your stay</DialogTitle></DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="flex justify-center gap-2">{[1, 2, 3, 4, 5].map(s => (<button key={s} onClick={() => setRating(s)} className={cn("h-10 w-10 rounded-xl transition-all", rating >= s ? "bg-yellow-100 text-yellow-600 scale-110 shadow-lg" : "bg-muted/30 text-muted/40 hover:bg-muted")}>{s}</button>))}</div>
                    <div className="space-y-2"><Label className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground pl-1">Your experience</Label><Textarea placeholder="What was it like living here?" className="min-h-[120px] rounded-2xl bg-muted/20 border-border/50 focus:ring-primary p-4" value={comment} onChange={(e) => setComment(e.target.value)} /></div>
                </div>
                <DialogFooter><Button onClick={handleSubmit} className="w-full h-12 rounded-xl text-lg font-bold">Post Review</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
