
'use client';

import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/lib/definitions";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Bath, Ruler, MapPin } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";


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

  const CardContentComponent = (
     <Card className={cn("h-full overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1", className)}>
        <CardHeader className="p-0">
          <div className="relative h-56 w-full">
            {image && (
              <Image
                src={image}
                alt={property.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            )}
            <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground">
              {formatPrice(property.price)}/mo
            </Badge>
            {property.status === 'occupied' && (
                <Badge variant="destructive" className="absolute left-3 top-3">Occupied</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
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
                <span>{property.location.city}, {property.location.state}</span>
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
