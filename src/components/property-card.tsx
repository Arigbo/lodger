
'use client';

import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/types";
import { cn, formatPrice } from "@/utils";
import { getCurrencyByCountry, convertCurrency } from "@/utils/currencies";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BedDouble, Bath, Ruler, MapPin, User } from "lucide-react";
import { usePathname } from "next/navigation";
import type { UserProfile } from "@/types";


type PropertyCardProps = {
  property: Property;
  as?: 'link' | 'div';
  className?: string;
};

export default function PropertyCard({ property, as = 'link', className }: PropertyCardProps) {
  const image = property.images?.[0];
  const pathname = usePathname();

  let linkHref = `/student/properties/${property.id}`;
  if (pathname.startsWith('/landlord')) {
    linkHref = `/landlord/properties/${property.id}`;
  }

  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  // Fetch landlord profile
  const landlordDocRef = useMemoFirebase(
    () => property.landlordId ? doc(firestore, 'users', property.landlordId) : null,
    [property.landlordId, firestore]
  );
  const { data: landlordProfile } = useDoc<UserProfile>(landlordDocRef);

  const userCurrency = useMemo(() => {
    if (userProfile?.currency) return userProfile.currency;
    if (userProfile?.country) return getCurrencyByCountry(userProfile.country);
    return null;
  }, [userProfile]);

  const CardContentComponent = (
    <Card className={cn("h-full overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1", className)}>
      <CardHeader className="p-0">
        <div className="relative h-56 w-full bg-muted flex items-center justify-center">
          {image ? (
            <Image
              src={image}
              alt={property.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Building className="h-12 w-12 opacity-20" />
              <span className="text-xs font-medium uppercase tracking-wider opacity-50">No Image Available</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground flex flex-col items-end gap-0.5 px-3 py-1 h-auto">
            {userCurrency && userCurrency !== property.currency ? (
              <>
                <span>{formatPrice(convertCurrency(property.price, property.currency, userCurrency), userCurrency)}/mo</span>
                <span className="text-[10px] opacity-90 font-normal border-t border-primary-foreground/20 pt-0.5">
                  ≈ {formatPrice(property.price, property.currency)}
                </span>
              </>
            ) : (
              <span>{formatPrice(property.price, property.currency)}/mo</span>
            )}
          </Badge>
          {property.status === 'occupied' && (
            <Badge variant="destructive" className="absolute left-3 top-3">Occupied</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Landlord Info */}
        {landlordProfile && (
          <div className="flex items-center gap-2 mb-4 pb-4 border-b">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={landlordProfile.profileImageUrl || ""}
                alt={landlordProfile.name}
                className="object-cover"
              />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{landlordProfile.name}</span>
              <span className="text-xs text-muted-foreground">Landlord</span>
            </div>
          </div>
        )}
        <h3 className="font-headline text-xl font-semibold group-hover:text-primary">
          {property.title}
        </h3>
        <div className="mt-4 flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" />
            <span>{property.bedrooms} {property.bedrooms > 1 ? 'Beds' : 'Bed'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Bath className="h-4 w-4" />
            <span>{property.bathrooms} {property.bathrooms > 1 ? 'Baths' : 'Bath'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            <span>{property.area} sqft</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{property.location.city}, {property.location.state}, {property.location.country}</span>
        </div>
      </CardFooter>
    </Card>
  );

  if (as === 'div') {
    return (
      <div className="group block">
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


