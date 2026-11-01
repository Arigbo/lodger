import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap, Search, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingHeroProps {
  imageUrl: string;
  title: string;
  /** Words in the title rendered in the brand colour. */
  highlight?: string[];
  description: string;
  /** Shows the property search box (homepage). */
  showSearch?: boolean;
}

const highlights = [
  { icon: ShieldCheck, label: "Verified landlords" },
  { icon: Wallet, label: "Secure online rent" },
  { icon: GraduationCap, label: "Homes near campus" },
];

/** Server-rendered hero. The search form is a plain GET form, so it works without JavaScript. */
export function LandingHero({ imageUrl, title, highlight = [], description, showSearch = false }: LandingHeroProps) {
  return (
    <section className="relative isolate flex min-h-[80vh] items-center overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src={imageUrl} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-background" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-headline text-4xl font-bold leading-[1.05] tracking-tight text-white animate-in fade-in slide-in-from-bottom-6 duration-700 sm:text-6xl md:text-7xl">
          {title.split(" ").map((word, i) => (
            <span key={i} className={highlight.includes(word) ? "text-primary-light" : undefined}>
              {word}{" "}
            </span>
          ))}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80 animate-in fade-in duration-700 sm:text-xl">
          {description}
        </p>

        {showSearch ? (
          <form
            action="/properties"
            method="get"
            role="search"
            className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-700 sm:flex-row"
          >
            <label htmlFor="hero-search" className="sr-only">
              Search by university, city or property name
            </label>
            <div className="relative flex-1">
              <Search aria-hidden className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="hero-search"
                name="q"
                type="search"
                placeholder="University, city or neighbourhood"
                className="h-14 w-full rounded-xl bg-transparent pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <Button type="submit" size="lg" className="h-14 rounded-xl px-8 text-base font-semibold">
              Search homes
            </Button>
          </form>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-14 rounded-xl px-8 text-base font-semibold">
              <Link href="/properties">
                Find your home <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 rounded-xl border-white/30 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur hover:bg-white/20 hover:text-white"
            >
              <Link href="/auth/signup?type=landlord">List a property</Link>
            </Button>
          </div>
        )}

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-white/80">
          {highlights.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon aria-hidden className="h-4 w-4 text-primary-light" /> {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
