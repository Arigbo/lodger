import type { ReactNode } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

/** Public, indexable pages: marketing header + footer. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="marketing" />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
