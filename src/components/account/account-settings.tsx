"use client";

import { LogOut, UserRound } from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { DeleteAccount } from "./delete-account";
import { PasswordForm } from "./password-form";
import { PayoutsCard } from "./payouts-card";
import { ProfileCard } from "./profile-card";
import { ProfileForm } from "./profile-form";
import { SettingsSection } from "./settings-section";

/** The settings page shared by students and landlords. */
export function AccountSettings() {
  const { user, profile, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) return <PageSkeleton variant="form" />;
  if (!user || !profile) return <EmptyState icon={UserRound} title="Sign in to manage your account" />;

  const isLandlord = profile.role === "landlord";
  const sections = [
    { id: "profile", label: "Profile" },
    ...(isLandlord ? [{ id: "payouts", label: "Payouts" }] : []),
    { id: "security", label: "Security" },
    { id: "account", label: "Account" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Your profile, sign-in and account." />

      <nav aria-label="Settings sections" className="-mt-2 flex gap-1 overflow-x-auto border-b">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="whitespace-nowrap border-b-2 border-transparent px-3 pb-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <ProfileCard profile={profile} />

      <SettingsSection
        id="profile"
        title="Personal details"
        description={isLandlord ? "Shown to students on your listings and leases." : "Shared with landlords when you send a request."}
      >
        <ProfileForm key={profile.id} profile={profile} />
      </SettingsSection>

      {isLandlord && (
        <SettingsSection id="payouts" title="Payouts" description="Get rent paid by card straight into your bank account, via Stripe.">
          <PayoutsCard profile={profile} />
        </SettingsSection>
      )}

      <SettingsSection id="security" title="Password" description="Use at least 8 characters. You'll stay signed in on this device.">
        <PasswordForm user={user} />
      </SettingsSection>

      <SettingsSection id="account" title="Sign out" description="Sign out of Lodger on this device.">
        <Button
          variant="outline"
          className="rounded-lg"
          onClick={async () => {
            await signOut(getAuth());
            router.replace("/auth/login");
          }}
        >
          <LogOut className="mr-1.5 h-4 w-4" /> Sign out
        </Button>
      </SettingsSection>

      <SettingsSection id="delete" title="Delete account" tone="danger" description="Permanently remove your Lodger account.">
        <DeleteAccount role={profile.role} />
      </SettingsSection>
    </div>
  );
}
