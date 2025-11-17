
'use client';

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";

const nonLandingPages = [
    "/auth/login",
    "/auth/signup",
    "/auth/forgot-password",
    "/landlord",
    "/landlord/properties",
    "/landlord/account",
    "/landlord/properties/new",
    "/properties",
    "/terms",
    "/privacy"
]

export function HeaderAndFooterProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const showHeaderAndFooter = !nonLandingPages.some(p => pathname.startsWith(p)) && pathname === '/';


    const showHeaderOnly = [
        "/properties",
        "/terms",
        "/privacy",
    ].some(p => pathname.startsWith(p));


    if (pathname.startsWith('/auth') || pathname.startsWith('/landlord')) {
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
    

    return (
        <div className="flex min-h-screen flex-col">
            {showHeaderAndFooter && <Header />}
            <main className="flex-grow">{children}</main>
            {showHeaderAndFooter && <Footer />}
        </div>
    );
}
