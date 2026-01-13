import { cn } from "@/utils";

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src="/favicon.ico"
        alt="Lodger Logo"
        width={28}
        height={28}
        className="h-7 w-7 object-contain"
      />

      <span className="font-headline text-2xl font-bold text-foreground">
        Lodger
      </span>
    </div>
  );
}


