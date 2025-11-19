import { cn } from "@/lib/utils";

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7 text-primary"
      >
        <rect width="28" height="28" rx="4" fill="currentColor"/>
        <path d="M7 6H15.5L20 10.5V13.5L14.5 19L7 13V6Z" fill="black"/>
        <path d="M12.5 24L7.5 18.5L13 13L18.5 17.5L22 14.5V22H12.5Z" fill="black"/>
      </svg>

      <span className="font-headline text-2xl font-bold text-foreground">
        Lodger
      </span>
    </div>
  );
}
