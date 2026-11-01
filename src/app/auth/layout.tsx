import type { ReactNode } from "react";

/** Authentication pages render full-bleed without the site chrome. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main id="main-content" className="min-h-screen">{children}</main>;
}
