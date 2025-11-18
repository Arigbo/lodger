
'use client';

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";

const nonLandingPages = [
    "/auth/login",
    "/auth/signup",
    "/auth/forgot-password",
    "/landlord",
    "/student",
    "/properties",
    "/terms",
    "/privacy"
]

export function HeaderAndFooterProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Show header and footer only on the exact homepage
    const showHeaderAndFooter = pathname === '/';

    // Show header only on these specific pages
    const showHeaderOnly = [
        "/properties",
        "/terms",
        "/privacy",
    ].some(p => pathname.startsWith(p));

    // Show no header or footer for auth and dashboard pages
    const noHeaderFooter = [
        "/auth",
        "/landlord",
        "/student",
    ].some(p => pathname.startsWith(p));


    if (noHeaderFooter) {
         return (
            <div className="flex min-h-screen flex-col">
                <main className="flex-grow">{children}</main>
            </div>
         )
    }

    if (showHeaderOnly) {
         return (
            <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-grow">{children}</main>
                <Footer />
            </div>
         )
    }
    
    // Default for homepage
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
        </div>
    );
}
