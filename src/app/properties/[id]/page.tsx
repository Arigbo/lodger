import { notFound } from "next/navigation";
import Image from "next/image";
import { getPropertyById, getUserById, getReviewsByPropertyId, getImagesByIds } from "@/lib/data";
import { formatPrice, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Star, BedDouble, Bath, Ruler, MapPin, CheckCircle, Wifi, ParkingCircle, Dog, Wind, Tv, MessageSquare, Phone, Bookmark, Share2 } from "lucide-react";

type amenityIcon = {
    [key: string]: React.ReactNode;
}

const amenityIcons: amenityIcon = {
    'Furnished': <Tv className="h-5 w-5 text-primary" />,
    'Wi-Fi': <Wifi className="h-5 w-5 text-primary" />,
    'In-unit Laundry': <Wind className="h-5 w-5 text-primary" />, // Using Wind as a proxy for laundry/dryer
    'Pet Friendly': <Dog className="h-5 w-5 text-primary" />,
    'Parking Spot': <ParkingCircle className="h-5 w-5 text-primary" />,
}

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = getPropertyById(params.id);

  if (!property) {
    notFound();
  }

  const landlord = getUserById(property.landlordId);
  const reviews = getReviewsByPropertyId(property.id);
  const images = getImagesByIds(property.imageIds);
  const averageRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

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
                {reviews.map(review => {
                    const reviewer = getUserById(review.userId);
                    return (
                        <div key={review.id} className="flex gap-4">
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
                {reviews.length === 0 && <p className="text-muted-foreground">No reviews yet.</p>}
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
                    <Button variant="ghost" className="flex flex-col h-auto gap-1">
                        <Share2 className="h-5 w-5"/>
                        <span className="text-xs">Share</span>
                    </Button>
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
                    <Button className="flex-1" disabled={property.status === 'occupied'}>
                        <MessageSquare className="mr-2 h-4 w-4"/> Request to Rent
                    </Button>
                     <Button variant="outline" size="icon">
                        <Phone className="h-4 w-4"/>
                    </Button>
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
