"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, type User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getErrorCode } from "@/lib/errors";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords don't match.", path: ["confirmPassword"] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: "Choose a different password.", path: ["newPassword"] });
type Values = z.infer<typeof schema>;

const AUTH_ERRORS: Record<string, string> = {
  "auth/wrong-password": "Your current password is incorrect.",
  "auth/invalid-credential": "Your current password is incorrect.",
  "auth/weak-password": "That password is too weak. Try a longer one.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/requires-recent-login": "Please sign out and back in, then try again.",
};

export function PasswordForm({ user }: { user: User }) {
  const { toast } = useToast();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const usesPassword = user.providerData.some((p) => p.providerId === "password");

  if (!usesPassword) {
    const provider = user.providerData[0]?.providerId?.replace(".com", "") ?? "another provider";
    return (
      <p className="text-sm text-muted-foreground">
        You sign in with <span className="font-medium capitalize text-foreground">{provider}</span>, so there&apos;s no Lodger password to change.
      </p>
    );
  }

  const onSubmit = async (values: Values) => {
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email!, values.currentPassword));
      await updatePassword(user, values.newPassword);
      form.reset();
      toast({ title: "Password changed", description: "Use your new password next time you sign in." });
    } catch (error) {
      const message = AUTH_ERRORS[getErrorCode(error) ?? ""] ?? "Could not change your password. Please try again.";
      if (message.includes("current password")) form.setError("currentPassword", { message });
      else toast({ variant: "destructive", title: "Password not changed", description: message });
    }
  };

  const field = (name: keyof Values, label: string, autoComplete: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="password" autoComplete={autoComplete} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {field("currentPassword", "Current password", "current-password")}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {field("newPassword", "New password", "new-password")}
          {field("confirmPassword", "Confirm new password", "new-password")}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/auth/forgot-password" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Forgot your current password?
          </Link>
          <Button type="submit" className="rounded-lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Change password
          </Button>
        </div>
      </form>
    </Form>
  );
}
