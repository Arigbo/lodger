import Link from "next/link";
import { Github, Twitter, Instagram } from "lucide-react";
import Logo from "./logo";

export default function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground">
              Streamline your workflow and boost your team's productivity.
            </p>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-headline text-lg font-semibold">Product</h4>
            <ul className="mt-4 space-y-2">
              <li><Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link></li>
              <li><Link href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link></li>
              <li><Link href="/integrations" className="text-sm text-muted-foreground hover:text-foreground">Integrations</Link></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-headline text-lg font-semibold">Company</h4>
            <ul className="mt-4 space-y-2">
              <li><Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link></li>
              <li><Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground">Careers</Link></li>
              <li><Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-headline text-lg font-semibold">Legal</h4>
            <ul className="mt-4 space-y-2">
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between border-t pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ProjectFlow. All rights reserved.
          </p>
          <div className="mt-4 flex items-center space-x-4 sm:mt-0">
            <Link href="#" className="text-muted-foreground hover:text-foreground">
              <Twitter className="h-5 w-5" />
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">
              <Github className="h-5 w-5" />
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">
              <Instagram className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
