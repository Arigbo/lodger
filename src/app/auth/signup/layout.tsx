import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Join Lodger as a student to find verified homes near campus, or as a landlord to list your property.",
  alternates: { canonical: "/auth/signup" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
