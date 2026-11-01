import { cn } from "@/lib/utils";

/** The Lodger mark, inlined so it renders instantly and stays crisp. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden className={cn("h-7 w-7", className)}>
      <rect width="28" height="28" rx="6" className="fill-primary" />
      <path d="M7 6H15.5L20 10.5V13.5L14.5 19L7 13V6Z" fill="white" />
      <path d="M12.5 24L7.5 18.5L13 13L18.5 17.5L22 14.5V22H12.5Z" fill="white" />
    </svg>
  );
}

export default function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      {showText && <span className="font-headline text-xl font-bold tracking-tight text-foreground">Lodger</span>}
    </span>
  );
}
