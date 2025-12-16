
'use client';

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";

export function HeaderAndFooterProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Show header and footer only on the exact homepage
    const isHomepage = pathname === '/';

    // Hide header and footer for auth pages only.
    // Dashboard pages (landlord/student) will now have the global header.
    const noHeaderFooter = [
        "/auth",
        "/terms",
        "/privacy",
    ].some(p => pathname.startsWith(p));


    if (noHeaderFooter) {
        return (
            <div className="flex min-h-screen flex-col">
                <main className="flex-grow">{children}</main>
            </div>
        )
    }

    if (isHomepage) {
        return (
            <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-grow">{children}</main>
                <Footer />
            </div>
        )
    }

    // Default for dashboard pages and others
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-grow">{children}</main>
        </div>
    );
}


