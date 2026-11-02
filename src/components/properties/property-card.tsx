"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, GraduationCap, Heart, MapPin } from "lucide-react";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { optimizedImageProps } from "@/config/images";
import { useFirestore, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn, formatPrice } from "@/lib/utils";
import type { Property } from "@/types";

type PropertyCardProps = {
  property: Property;
  /** "div" renders without a link, for cards wrapped in another link. */
  as?: "link" | "div";
  className?: string;
  /** Load the image eagerly (first cards above the fold). */
  priority?: boolean;
};

export default function PropertyCard({ property, as = "link", className, priority }: PropertyCardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useUser();
  const firestore = useFirestore();

  // Keep people inside their area of the app; everyone else gets the public, indexable URL.
  const href = pathname.startsWith("/landlord")
    ? `/landlord/properties/${property.id}`
    : pathname.startsWith("/student")
      ? `/student/properties/${property.id}`
      : `/properties/${property.id}`;

  const image = property.images?.[0];
  const saved = !!profile?.bookmarkedPropertyIds?.includes(property.id);
  const canSave = !pathname.startsWith("/landlord") && profile?.role !== "landlord";
  const let_ = property.status !== "available";
  const facts = [
    `${property.bedrooms} bed`,
    `${property.bathrooms} bath`,
    property.area ? `${property.area} sq ft` : null,
  ].filter(Boolean);

  const toggleSave = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/student/properties/${property.id}`)}`);
      return;
    }
    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        bookmarkedPropertyIds: saved ? arrayRemove(property.id) : arrayUnion(property.id),
      });
      toast({ title: saved ? "Removed from saved homes" : "Saved to your shortlist" });
    } catch (error) {
      console.error("Saving home failed:", error);
      toast({ variant: "destructive", title: "Could not update saved homes" });
    }
  };

  return (
    <article className={cn("group relative flex h-full flex-col", className)}>
      {as === "link" && (
        <Link href={href} className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <span className="sr-only">{property.title}</span>
        </Link>
      )}

      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {image ? (
          <Image
            {...optimizedImageProps(image)}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className={cn("object-cover transition-transform duration-500 group-hover:scale-[1.04]", let_ && "grayscale-[40%]")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Building2 aria-hidden className="h-10 w-10 opacity-30" />
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
          {let_ ? "Currently let" : property.type}
        </span>

        {canSave && (
          <button
            type="button"
            onClick={toggleSave}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${property.title} from saved homes` : `Save ${property.title}`}
            className="absolute right-3 top-3 z-20 rounded-full bg-background/90 p-2 shadow-sm backdrop-blur transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Heart className={cn("h-4 w-4", saved ? "fill-red-500 text-red-500" : "text-foreground")} />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="line-clamp-1 font-semibold leading-snug group-hover:underline group-hover:underline-offset-2">{property.title}</h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
          {property.location?.school ? (
            <>
              <GraduationCap aria-hidden className="h-3.5 w-3.5 shrink-0" /> Near {property.location.school}
            </>
          ) : (
            <>
              <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" /> {[property.location?.address, property.location?.city].filter(Boolean).join(", ")}
            </>
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{facts.join(" · ")}</p>
        <p className="mt-auto pt-2">
          <span className="font-semibold">{formatPrice(property.price, property.currency)}</span>
          <span className="text-sm text-muted-foreground"> / month</span>
        </p>
      </div>
    </article>
  );
}
