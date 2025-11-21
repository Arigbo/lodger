

'use client';

import { notFound, usePathname, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { formatPrice, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Star, BedDouble, Bath, Ruler, MapPin, CheckCircle, Wifi, ParkingCircle, Dog, Wind, Tv, MessageSquare, Phone, Bookmark, Share2, Mail, Twitter, Link as LinkIcon, Facebook, Linkedin, User as UserIcon, Building } from "lucide-react";
import type { Property, UserProfile, PropertyReview, ImagePlaceholder } from "@/lib/definitions";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import Link from "next/link";
import { FaWhatsapp } from 'react-icons/fa';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TenancySkeleton from "@/components/tenancy-skeleton";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, User as FirebaseUser, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import Loading from "@/app/loading";

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

    useEffect(() => {
        setIsClient(true);
    }, []);

    const propertyRef = useMemoFirebase(() => id ? doc(firestore, 'properties', id) : null, [firestore, id]);
    const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);
    
    const landlordRef = useMemoFirebase(() => property ? doc(firestore, 'users', property.landlordId) : null, [firestore, property]);
    const { data: landlord, isLoading: isLandlordLoading } = useDoc<UserProfile>(landlordRef);

    const reviewsQuery = useMemoFirebase(() => id ? query(collection(firestore, 'propertyReviews'), where('propertyId', '==', id)) : null, [firestore, id]);
    const { data: reviews, isLoading: areReviewsLoading } = useCollection<PropertyReview>(reviewsQuery);
    
    const isLoading = isPropertyLoading || isLandlordLoading || areReviewsLoading || isUserLoading;

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
        if (!user || !landlord) {
            toast({
                variant: "destructive",
                title: "Not Logged In",
                description: "You must be logged in to send a rental request.",
            });
            router.push('/auth/login');
            return;
        }
        try {
            const rentalRequestsRef = collection(firestore, 'rentalApplications');
            const newApplicationRef = await addDoc(rentalRequestsRef, {
                propertyId: property.id,
                tenantId: user.uid,
                messageToLandlord: requestMessage,
                applicationDate: new Date().toISOString(),
                status: 'pending',
            });

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

            toast({
                title: "Request Sent!",
                description: "Your rental request has been sent to the landlord.",
            });
            
            router.push(`/student/messages?conversationId=${landlord.id}`);

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
            <div className="grid grid-cols-2 grid-rows-2 gap-2 h-[500px] mb-8">
                <div className="col-span-2 row-span-2 relative">
                    {images[0] && <Image src={images[0].imageUrl} alt={property.title} fill className="object-cover rounded-lg" data-ai-hint={images[0].imageHint} />}
                </div>
                {images[1] && <div className="hidden md:block relative"><Image src={images[1].imageUrl} alt={property.title} fill className="object-cover rounded-lg" data-ai-hint={images[1].imageHint}/></div>}
                {images[2] && <div className="hidden md:block relative"><Image src={images[2].imageUrl} alt={property.title} fill className="object-cover rounded-lg" data-ai-hint={images[2].imageHint}/></div>}
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
                    <h3 className="font-headline text-2xl font-semibold">Comments & Reviews</h3>
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
                                        <p className="font-semibold">{review.tenantId}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(review.reviewDate).toLocaleDateString()}</p>
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
                                <MessageSquare className="mr-2 h-4 w-4"/> Message
                            </Button>
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
                                            Use these methods to get in touch.
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

    