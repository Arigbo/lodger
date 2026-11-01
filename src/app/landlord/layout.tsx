import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/shell/dashboard-shell";

export const metadata: Metadata = {
  title: "Landlord dashboard",
  robots: { index: false, follow: false },
};

export default function LandlordLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="landlord">{children}</DashboardShell>;
}
