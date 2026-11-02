import React from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, X, Loader2, FileVideo } from "lucide-react";
import Image from "next/image";
import { optimizedImageProps } from "@/config/images";
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
    <div className="space-y-8">
      <div className="space-y-6">
        <h3 className="text-sm font-semibold">Photos</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {property.images.map((url) => (
            <div
              key={url}
              className="relative group aspect-square rounded-xl overflow-hidden border border-foreground/5 shadow-inner"
            >
              <Image
                {...optimizedImageProps(url)}
                alt="Property"
                fill
                sizes="(max-width: 768px) 50vw, 20vw"
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

          <label className="relative flex flex-col items-center justify-center aspect-square rounded-xl border border-dashed border-foreground/10 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
            <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="mt-2 text-xs font-semibold text-muted-foreground group-hover:text-primary">
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

      <div className="space-y-6">
        <h3 className="text-sm font-semibold">Video</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {property.videos?.map((url) => (
            <div
              key={url}
              className="relative aspect-video rounded-xl overflow-hidden border border-foreground/5 bg-black group"
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

          <label className="relative flex flex-col items-center justify-center aspect-video rounded-xl border border-dashed border-foreground/10 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
            {isUploading ? (
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            ) : (
              <>
                <FileVideo className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="mt-4 text-xs font-semibold text-muted-foreground group-hover:text-primary px-8 text-center">
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
