"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertOctagon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/firebase/provider";
import { signOut } from "firebase/auth";
import { SupportBubble } from "@/components/support-bubble";

export default function BannedPage() {
  const auth = useAuth();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      window.location.href = "/auth/login";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg border-2 border-destructive/20 shadow-2xl shadow-destructive/5 rounded-[3rem] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-destructive" />
        <CardHeader className="text-center pt-12 pb-8">
          <div className="mx-auto mb-6 h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center">
            <AlertOctagon className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="font-headline text-4xl uppercase tracking-tighter">
            Account <span className="text-destructive">Restricted</span>
          </CardTitle>
          <CardDescription className="text-lg font-medium mt-4 px-6">
            Your account has been closed by our team for not following our
            rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center px-10 pb-10 space-y-6">
          <div className="p-6 rounded-2xl bg-muted/50 border border-muted text-sm font-medium leading-relaxed">
            If you think this is a mistake, please use the chat bubble at the
            bottom of the screen to talk to us.
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4 pb-12">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Sign out
          </Button>
        </CardFooter>
      </Card>
      <SupportBubble />
    </div>
  );
}
