
'use client';

import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/types";
import { cn, formatPrice } from "@/utils";
import { getCurrencyByCountry, convertCurrency } from "@/utils/currencies";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BedDouble, Bath, Ruler, MapPin, Building, PlusCircle, Heart, GraduationCap } from "lucide-react";
import { usePathname } from "next/navigation";
import type { UserProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";

type PropertyCardProps = {
  property: Property;
  as?: 'link' | 'div';
  className?: string;
};

export default function PropertyCard({ property, as = 'link', className }: PropertyCardProps) {
  const image = property.images?.[0];
  const pathname = usePathname();
  const { toast } = useToast();

  let linkHref = `/student/properties/${property.id}`;
  if (pathname.startsWith('/landlord')) {
    linkHref = `/landlord/properties/${property.id}`;
  }

  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const isBookmarked = useMemo(() => {
    return userProfile?.bookmarkedPropertyIds?.includes(property.id);
  }, [userProfile, property.id]);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !userDocRef) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please log in to bookmark properties",
      });
      return;
    }

    try {
      if (isBookmarked) {
        await updateDoc(userDocRef, {
          bookmarkedPropertyIds: arrayRemove(property.id)
        });
        toast({
          title: "Removed from bookmarks",
          description: `${property.title} has been removed from your saved properties.`,
        });
      } else {
        await updateDoc(userDocRef, {
          bookmarkedPropertyIds: arrayUnion(property.id)
        });
        toast({
          title: "Added to bookmarks",
          description: `${property.title} has been saved to your bookmarks.`,
        });
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update bookmarks",
      });
    }
  };

  const userCurrency = useMemo(() => {
    if (userProfile?.currency) return userProfile.currency;
    if (userProfile?.country) return getCurrencyByCountry(userProfile.country);
    return null;
  }, [userProfile]);

  const CardContentComponent = (
    <Card className={cn(
      "group h-full overflow-hidden border-none bg-background/50 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 ring-1 ring-border/50 hover:ring-primary/30",
      className
    )}>
      <CardHeader className="p-0">
        <div className="relative h-64 w-full overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={property.title}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-muted/30 text-muted-foreground gap-3">
              <Building className="h-12 w-12 opacity-20" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 font-sans">No Image Preview</span>
            </div>
          )}

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-40" />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <Badge className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
              {property.type}
            </Badge>
            {property.status === 'occupied' && (
              <Badge variant="destructive" className="animate-pulse shadow-lg shadow-destructive/20 border-none px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                Occupied
              </Badge>
            )}
          </div>

          {/* Bookmark Button */}
          {!pathname.startsWith('/landlord') && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-4 right-4 z-20 h-10 w-10 rounded-full border border-white/20 backdrop-blur-md transition-all hover:scale-110",
                isBookmarked ? "bg-primary text-primary-foreground border-primary" : "bg-white/10 text-white hover:bg-white/20"
              )}
              onClick={toggleBookmark}
            >
              <Heart className={cn("h-5 w-5", isBookmarked && "fill-current")} />
            </Button>
          )}

          <div className="absolute bottom-4 right-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-xl shadow-2xl">
              <p className="text-white text-lg font-bold tracking-tight">
                {userCurrency && userCurrency !== property.currency
                  ? formatPrice(convertCurrency(property.price, property.currency, userCurrency), userCurrency)
                  : formatPrice(property.price, property.currency)}
                <span className="text-white/60 text-xs font-normal ml-1">/mo</span>
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1">
            <MapPin className="h-3 w-3" />
            <span>{property.location.city}</span>
          </div>
          {property.location.school && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] mb-1">
              <GraduationCap className="h-3 w-3" />
              <span>Near {property.location.school}</span>
            </div>
          )}
          <h3 className="font-headline text-2xl font-bold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
            {property.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-1 font-medium">
            {property.location.address}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/50">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BedDouble className="h-4 w-4 text-primary/70" />
              <span className="text-sm font-bold text-foreground">{property.bedrooms}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Beds</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Bath className="h-4 w-4 text-primary/70" />
              <span className="text-sm font-bold text-foreground">{property.bathrooms}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Baths</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Ruler className="h-4 w-4 text-primary/70" />
              <span className="text-sm font-bold text-foreground">{property.area}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Sqft</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-6 pb-6 pt-0 flex items-center justify-between">
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-out"
            style={{ width: property.status === 'occupied' ? '100%' : '30%' }}
          />
        </div>
        <div className="ml-4 shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            <PlusCircle className="h-4 w-4" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );

  if (as === 'div') {
    return (
      <div className="group block cursor-pointer">
        {CardContentComponent}
      </div>
    )
  }

  return (
    <Link href={linkHref} className="group block">
      {CardContentComponent}
    </Link>
  );
}
