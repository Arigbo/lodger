
'use client';

import { notFound, usePathname } from "next/navigation";
import Image from "next/image";
import { getPropertyById, getUserById, getReviewsByPropertyId, getImagesByIds } from "@/lib/data";
import { formatPrice, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Star, BedDouble, Bath, Ruler, MapPin, CheckCircle, Wifi, ParkingCircle, Dog, Wind, Tv, MessageSquare, Phone, Bookmark, Share2, Mail, Twitter, Link as LinkIcon, Facebook, Linkedin } from "lucide-react";
import type { Property, User, Review, ImagePlaceholder } from "@/lib/definitions";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import Link from "next/link";
import { FaWhatsapp } from 'react-icons/fa';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";


// This is the new Server Component that fetches data.
export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = getPropertyById(params.id);

  if (!property) {
    notFound();
  }
  
  const landlord = getUserById(property.landlordId);
  const reviews = getReviewsByPropertyId(property.id);
  const images = getImagesByIds(property.imageIds);
  
  // A mock user is fetched inside the client component, so we determine `isTenant` there.
  
  return <PropertyDetailView property={property} landlord={landlord} reviews={reviews} images={images} />;
}

// This is the Client Component for rendering UI.
function PropertyDetailView({
    property,
    landlord,
    reviews: initialReviews,
    images: initialImages
}: {
    property: Property;
    landlord: User | undefined;
    reviews: Review[];
    images: ImagePlaceholder[];
}) {
  const pathname = usePathname();
  const { toast } = useToast();
  
  const [reviews] = useState(initialReviews);
  const [images] = useState(initialImages);
  const [requestMessage, setRequestMessage] = useState("");
  const [isClient, setIsClient] = useState(false);
  
  const { user } = useUser();
  const isTenant = user?.id === property.currentTenantId;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const averageRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
  
  const propertyUrl = isClient ? `${window.location.origin}${pathname}` : '';

  const handleSendRequest = () => {
    console.log("Sending request for property", property.id, "with message:", requestMessage);
    toast({
        title: "Request Sent!",
        description: "Your rental request has been sent to the landlord.",
    });
  }

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
          
          {/* Main Info */}
          <Card className="my-8">
              <CardContent className="p-6 flex items-center justify-around">
                  <div className="text-center"><BedDouble className="mx-auto mb-2 h-7 w-7 text-primary" /><p>{property.bedrooms} Beds</p></div>
                  <div className="text-center"><Bath className="mx-auto mb-2 h-7 w-7 text-primary" /><p>{property.bathrooms} Baths</p></div>
                  <div className="text-center"><Ruler className="mx-auto mb-2 h-7 w-7 text-primary" /><p>{property.area} sqft</p></div>
              </CardContent>
          </Card>
          
          {/* Tabs */}
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
                {isTenant && <AddReviewForm />}
                {reviews.map(review => {
                    const reviewer = getUserById(review.userId);
                    return (
                        <div key={review.id} className="flex gap-4 pt-6 border-t">
                            <Avatar>
                                {reviewer && <AvatarImage src={reviewer.avatarUrl} />}
                                <AvatarFallback>{reviewer?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold">{reviewer?.name}</p>
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
        
        {/* Right Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
             {/* Action Buttons */}
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

            {/* Landlord Card */}
            {landlord && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Meet the Landlord</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src={landlord.avatarUrl} />
                    <AvatarFallback>{landlord.name.charAt(0)}</AvatarFallback>
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

// Mock current user - replace with real auth
const useUser = () => {
  // To test a landlord, use 'user-1'. 
  // To test a student tenant, use 'user-3'.
  // To test a student non-tenant, use 'user-2'.
  const user = getUserById('user-2'); 
  return { user };
}

function AddReviewForm() {
    const [rating, setRating] = React.useState(0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Write a Review</CardTitle>
                <CardDescription>Share your experience with this property.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Rating</Label>
                    <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                            <button key={i} onClick={() => setRating(i + 1)}>
                                <Star className={cn("h-6 w-6", i < rating ? "text-accent fill-current" : "text-muted-foreground")}/>
                            </button>
                        ))}
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="comment">Comment</Label>
                    <Textarea id="comment" placeholder="Describe your experience..." />
                </div>
                <Button>Submit Review</Button>
            </CardContent>
        </Card>
    );
}
