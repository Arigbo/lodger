'use client';

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";

export function HeaderAndFooterProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const showHeaderAndFooter = pathname === '/';

    return (
        <div className="flex min-h-screen flex-col">
            {showHeaderAndFooter && <Header />}
            <main className="flex-grow">{children}</main>
            {showHeaderAndFooter && <Footer />}
        </div>
    );
}
