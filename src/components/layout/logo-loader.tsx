import { LogoMark } from "@/components/layout/logo";

/**
 * Branded loader for public routes: a calm, CSS-only mark with an
 * indeterminate progress bar (no animation library, no layout overlay).
 */
export default function LogoLoader() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
      <span className="sr-only">Loading</span>
      <div className="relative">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-xl bg-primary/20 [animation-duration:1.8s]" />
        <LogoMark className="relative h-12 w-12 drop-shadow-sm" />
      </div>
      <div aria-hidden className="h-1 w-32 overflow-hidden rounded-full bg-primary/10">
        <div className="h-full w-1/3 animate-progress-indeterminate rounded-full bg-primary" />
      </div>
    </div>
  );
}
