"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, Play, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { optimizedImageProps } from "@/config/images";
import { cn } from "@/lib/utils";

type Media = { type: "image" | "video"; url: string };

interface PropertyGalleryProps {
  images: string[];
  videos?: string[];
  title: string;
  className?: string;
}

function Thumb({ media, title, sizes, priority }: { media: Media; title: string; sizes: string; priority?: boolean }) {
  if (media.type === "video") {
    return (
      <>
        <video src={`${media.url}#t=0.5`} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-foreground shadow">
            <Play aria-hidden className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </span>
      </>
    );
  }
  return (
    <Image
      {...optimizedImageProps(media.url)}
      alt={title}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
}

/** Mosaic of a listing's photos and videos with a full-screen viewer. */
export function PropertyGallery({ images, videos = [], title, className }: PropertyGalleryProps) {
  const media: Media[] = [...images.map((url) => ({ type: "image" as const, url })), ...videos.map((url) => ({ type: "video" as const, url }))];
  const [open, setOpen] = useState<number | null>(null);

  if (!media.length) return null;

  const tiles = media.slice(0, 5);
  const extra = media.length - tiles.length;
  const go = (delta: number) => setOpen((i) => (i === null ? i : (i + delta + media.length) % media.length));
  const current = open === null ? null : media[open];

  return (
    <div className={className}>
      {/* Phones: swipeable strip. Larger screens: mosaic. */}
      <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:hidden">
        {media.map((m, i) => (
          <button
            key={`${m.url}-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden rounded-xl bg-muted"
            aria-label={`Open ${m.type} ${i + 1} of ${media.length}`}
          >
            <Thumb media={m} title={`${title}, ${m.type} ${i + 1}`} sizes="85vw" priority={i === 0} />
          </button>
        ))}
      </div>

      <div
        className={cn(
          "hidden gap-2 sm:grid",
          tiles.length === 1 ? "grid-cols-1" : "grid-cols-4 grid-rows-2",
          tiles.length > 1 && "aspect-[2/1]",
        )}
      >
        {tiles.map((m, i) => (
          <button
            key={`${m.url}-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Open ${m.type} ${i + 1} of ${media.length}`}
            className={cn(
              "group relative overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tiles.length === 1 && "aspect-[16/9]",
              tiles.length > 1 && i === 0 && "col-span-2 row-span-2",
              tiles.length === 2 && i === 1 && "col-span-2 row-span-2",
              tiles.length === 3 && i > 0 && "col-span-2",
              tiles.length === 4 && i === 1 && "col-span-2",
            )}
          >
            <Thumb media={m} title={`${title}, ${m.type} ${i + 1}`} sizes={i === 0 ? "(min-width: 1024px) 40vw, 50vw" : "20vw"} priority={i === 0} />
            {i === tiles.length - 1 && extra > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
                +{extra} more
              </span>
            )}
          </button>
        ))}
      </div>

      {media.length > 1 && (
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Images aria-hidden className="h-4 w-4" /> View all {images.length} photo{images.length === 1 ? "" : "s"}
          {videos.length ? ` and ${videos.length} video${videos.length === 1 ? "" : "s"}` : ""}
        </button>
      )}

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent
          className="h-[100dvh] max-w-none gap-0 rounded-none border-none bg-black p-0 text-white sm:h-[90vh] sm:max-w-6xl sm:rounded-2xl [&>button:last-child]:hidden"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">Use the arrow keys to move between photos.</DialogDescription>
          <div className="flex h-full flex-col">
            <header className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="truncate pr-4 text-white/80">{title}</span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums text-white/70">
                  {(open ?? 0) + 1} / {media.length}
                </span>
                <button type="button" onClick={() => setOpen(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </span>
            </header>

            <div className="relative min-h-0 flex-1">
              {current?.type === "image" && (
                <Image {...optimizedImageProps(current.url)} alt={title} fill sizes="100vw" className="object-contain" />
              )}
              {current?.type === "video" && (
                <video key={current.url} src={current.url} className="h-full w-full object-contain" controls autoPlay playsInline />
              )}
              {media.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 backdrop-blur hover:bg-white/20"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 backdrop-blur hover:bg-white/20"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 py-3">
                {media.map((m, i) => (
                  <button
                    key={`${m.url}-${i}`}
                    type="button"
                    onClick={() => setOpen(i)}
                    aria-label={`Show ${m.type} ${i + 1}`}
                    aria-current={i === open}
                    className={cn(
                      "relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-white/10 opacity-50 transition-opacity hover:opacity-90",
                      i === open && "opacity-100 ring-2 ring-white",
                    )}
                  >
                    <Thumb media={m} title="" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
