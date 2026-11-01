import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Lodger to manage your rental requests, messages, leases and payments.",
  alternates: { canonical: "/auth/login" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
