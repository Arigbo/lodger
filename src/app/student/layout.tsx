import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/shell/dashboard-shell";

export const metadata: Metadata = {
  title: "Student dashboard",
  robots: { index: false, follow: false },
};

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="student">{children}</DashboardShell>;
}
