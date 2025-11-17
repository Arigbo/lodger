import { Building } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Building className="h-7 w-7 text-primary" />
      <span className="font-headline text-2xl font-bold text-foreground">
        RentU
      </span>
    </div>
  );
}
