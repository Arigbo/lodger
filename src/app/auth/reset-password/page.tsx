"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/firebase/provider";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordForm({ oobCode }: { oobCode: string }) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<
    "verifying" | "ready" | "success" | "invalid"
  >("verifying");
  const [email, setEmail] = useState("");

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!auth || !oobCode) {
      setStatus("invalid");
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail);
        setStatus("ready");
      })
      .catch((error) => {
        console.error("Link verification failed:", error);
        setStatus("invalid");
      });
  }, [auth, oobCode]);

  const onSubmit = async (values: ResetFormValues) => {
    if (!auth || !oobCode) return;

    try {
      await confirmPasswordReset(auth, oobCode, values.password);
      setStatus("success");
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now sign in.",
      });
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch (error: any) {
      console.error("Password confirm error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset password. The link may have expired.",
      });
    }
  };

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying your reset link...</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="text-center space-y-4 py-6">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Invalid or Expired Link</h2>
        <p className="text-muted-foreground">
          This password reset link is invalid or has already been used.
        </p>
        <Button asChild className="mt-4">
          <Link href="/auth/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center space-y-4 py-6">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <h2 className="text-xl font-semibold">Password Reset!</h2>
        <p className="text-muted-foreground">
          Your password has been changed successfully. Redirecting you to
          login...
        </p>
        <Button asChild variant="outline">
          <Link href="/auth/login">Go to Login Now</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <p className="text-sm text-center text-muted-foreground mb-4">
          Resetting password for:{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="password">New Password</Label>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <FormControl>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Reset Password
        </Button>
      </form>
    </Form>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">
            Set New Password
          </CardTitle>
          <CardDescription>
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {oobCode ? (
            <ResetPasswordForm oobCode={oobCode} />
          ) : (
            <div className="text-center py-6 space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-muted-foreground">
                No reset code found in URL.
              </p>
              <Button asChild variant="link">
                <Link href="/auth/forgot-password">
                  Back to Forgot Password
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
