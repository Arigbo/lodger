import React from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, X, Loader2, ImageIcon, FileVideo } from "lucide-react";
import Image from "next/image";
import { Property } from "@/types";

interface MediaSectionProps {
  property: Property;
  isUploading: boolean;
  handleImageUpload: (files: FileList | null) => void;
  handleRemoveImage: (url: string) => void;
  handleVideoUpload: (files: FileList | null) => void;
  handleRemoveVideo: (url: string) => void;
}

export const MediaSection: React.FC<MediaSectionProps> = ({
  property,
  isUploading,
  handleImageUpload,
  handleRemoveImage,
  handleVideoUpload,
  handleRemoveVideo,
}) => {
  return (
    <div className="space-y-12">
      <div className="space-y-10">
        <div className="inline-flex items-center gap-4">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ImageIcon className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">
            Photos
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {property.images.map((url) => (
            <div
              key={url}
              className="relative group aspect-square rounded-[2rem] overflow-hidden border-2 border-foreground/5 shadow-inner"
            >
              <Image
                src={url}
                alt="Property"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemoveImage(url)}
                  className="rounded-full h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <label className="relative flex flex-col items-center justify-center aspect-square rounded-[2rem] border-2 border-dashed border-foreground/10 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
            <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">
              Add Photo
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      <div className="space-y-10">
        <div className="inline-flex items-center gap-4">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <FileVideo className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">
            Video
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {property.videos?.map((url) => (
            <div
              key={url}
              className="relative aspect-video rounded-[2.5rem] overflow-hidden border-2 border-foreground/5 bg-black group"
            >
              <video
                src={url}
                controls
                className="h-full w-full object-cover"
              />
              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemoveVideo(url)}
                  className="rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <label className="relative flex flex-col items-center justify-center aspect-video rounded-[2.5rem] border-2 border-dashed border-foreground/10 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
            {isUploading ? (
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            ) : (
              <>
                <FileVideo className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary px-8 text-center">
                  Upload a Video
                </span>
              </>
            )}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleVideoUpload(e.target.files)}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
