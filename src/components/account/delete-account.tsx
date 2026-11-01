"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiPost } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import type { UserRole } from "@/types";

const CONFIRM_WORD = "DELETE";

export function DeleteAccount({ role }: { role: UserRole }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      await apiPost("/api/account/delete", {});
      await signOut(getAuth()).catch(() => undefined);
      toast({ title: "Your account has been deleted" });
      router.replace("/");
    } catch (error) {
      toast({ variant: "destructive", title: "Account not deleted", description: getErrorMessage(error) });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This permanently removes your profile
        {role === "landlord" ? ", listings and drafts" : ", saved homes and rental requests"} and signs you out. Payment records stay
        with the other party. You can&apos;t delete your account while a lease is still open.
      </p>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setTyped("");
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="rounded-lg border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive">
            Delete account…
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone. Type {CONFIRM_WORD} to confirm.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete" className="sr-only">
              Type {CONFIRM_WORD} to confirm
            </Label>
            <Input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" placeholder={CONFIRM_WORD} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" disabled={deleting}>
              Keep my account
            </AlertDialogCancel>
            <Button variant="destructive" className="rounded-lg" disabled={typed !== CONFIRM_WORD || deleting} onClick={remove}>
              {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Delete permanently
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
