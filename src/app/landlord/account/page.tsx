import { Suspense } from "react";
import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/account-settings";
import { PageSkeleton } from "@/components/dashboard";

export const metadata: Metadata = { title: "Settings" };

export default function AccountPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="form" />}>
      <AccountSettings />
    </Suspense>
  );
}
