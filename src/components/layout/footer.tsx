import Link from "next/link";
import Logo from "@/components/layout/logo";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export default function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {siteConfig.tagline}. Verified homes near campus, transparent leases and secure rent payments.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {footerNav.map((section) => (
              <div key={section.title}>
                <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
                <ul className="mt-4 space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <a href={`mailto:${siteConfig.supportEmail}`} className="transition-colors hover:text-foreground">
            {siteConfig.supportEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
