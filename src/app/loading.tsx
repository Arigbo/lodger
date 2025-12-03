
import { cn } from "@/utils";
import Logo from "@/components/logo";

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="relative flex items-center justify-center w-80 h-24">
        {/* Icon slides in and stays */}
        <div className="absolute left-1/2 -translate-x-1/2 animate-slide-in-icon z-10">
          <svg
            width="64"
            height="64"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
          >
            <rect width="28" height="28" rx="4" fill="currentColor" />
            <path d="M7 6H15.5L20 10.5V13.5L14.5 19L7 13V6Z" fill="black" />
            <path d="M12.5 24L7.5 18.5L13 13L18.5 17.5L22 14.5V22H12.5Z" fill="black" />
          </svg>
        </div>
        {/* Text slides from under logo, appears next to it, then slides back */}
        <span
          className="font-headline text-5xl font-bold text-foreground absolute left-1/2 animate-slide-and-fade"
        >
          Lodger
        </span>
      </div>
    </div>
  );
}


