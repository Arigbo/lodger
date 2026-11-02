"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, GraduationCap, Home, Loader2, Phone, Send } from "lucide-react";
import { addDoc, collection, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { sendNotification } from "@/lib/notifications";
import type { Property, RentalApplication, UserProfile } from "@/types";

const PROMPTS = [
  "Hi! I'm a student at {school} looking to move in soon.",
  "Is the home still available from next month?",
  "Could I arrange a viewing this week?",
];

export type RentState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "owner" }
  | { kind: "other-landlord" }
  | { kind: "tenant" }
  | { kind: "let" }
  | { kind: "pending"; request: RentalApplication }
  | { kind: "approved"; request: RentalApplication }
  | { kind: "open" };

/** Works out what the visitor can do with this listing right now. */
export function useRentState(property: Property): RentState {
  const { user, profile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const mineQuery = useMemoFirebase(
    () =>
      user && profile?.role === "student"
        ? query(collection(firestore, "rentalApplications"), where("tenantId", "==", user.uid), where("propertyId", "==", property.id))
        : null,
    [firestore, user, profile?.role, property.id],
  );
  const { data: mine, isLoading } = useCollection<RentalApplication>(mineQuery);

  if (isUserLoading) return { kind: "loading" };
  if (!user) return { kind: "signed-out" };
  if (property.landlordId === user.uid) return { kind: "owner" };
  if (profile && profile.role !== "student") return { kind: "other-landlord" };
  if (property.currentTenantId === user.uid) return { kind: "tenant" };
  if (isLoading) return { kind: "loading" };
  const latest = [...(mine ?? [])].sort((a, b) => b.applicationDate.localeCompare(a.applicationDate))[0];
  if (latest?.status === "approved") return { kind: "approved", request: latest };
  if (latest?.status === "pending") return { kind: "pending", request: latest };
  if (property.status !== "available") return { kind: "let" };
  return { kind: "open" };
}

type RequestToRentProps = {
  property: Property;
  landlord: UserProfile | null;
  state: RentState;
  /** Compact layout for the mobile action bar. */
  compact?: boolean;
};

/** The primary call to action on a listing, for every kind of visitor. */
export function RequestToRent({ property, landlord, state, compact }: RequestToRentProps) {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const loginHref = `/auth/login?redirect=${encodeURIComponent(`/student/properties/${property.id}`)}`;
  const size = compact ? "default" : "lg";
  const full = compact ? "" : "w-full";

  const send = async () => {
    if (!user || !landlord) return;
    setSending(true);
    const text = message.trim() || `Hi, I'm interested in renting ${property.title}.`;
    try {
      const ref = await addDoc(collection(firestore, "rentalApplications"), {
        propertyId: property.id,
        tenantId: user.uid,
        landlordId: property.landlordId,
        messageToLandlord: text,
        applicationDate: new Date().toISOString(),
        status: "pending" as const,
      });
      await updateDoc(ref, { id: ref.id });
      await addDoc(collection(firestore, "messages"), {
        text,
        senderId: user.uid,
        recipientId: landlord.id,
        participantIds: [user.uid, landlord.id].sort(),
        timestamp: serverTimestamp(),
        read: false,
      });
      await sendNotification({
        toUserId: landlord.id,
        type: "NEW_REQUEST",
        firestore,
        senderName: profile?.name || "A student",
        propertyName: property.title,
        link: "/landlord/requests",
      });
      toast({ title: "Request sent", description: `${landlord.name.split(" ")[0]} usually replies within a few days. We'll notify you.` });
      setOpen(false);
      setMessage("");
    } catch (error) {
      console.error("Sending rental request failed:", error);
      toast({ variant: "destructive", title: "Could not send your request", description: "Please try again." });
    } finally {
      setSending(false);
    }
  };

  switch (state.kind) {
    case "loading":
      return <Button size={size} className={full} disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading</Button>;
    case "signed-out":
      return (
        <Button asChild size={size} className={full}>
          <Link href={loginHref}>Sign in to request</Link>
        </Button>
      );
    case "owner":
      return (
        <Button asChild size={size} variant="outline" className={full}>
          <Link href={`/landlord/properties/${property.id}`}>Manage your listing</Link>
        </Button>
      );
    case "other-landlord":
      return compact ? null : <p className="text-center text-sm text-muted-foreground">Sign in with a student account to request this home.</p>;
    case "tenant":
      return (
        <Button asChild size={size} className={full}>
          <Link href={`/student/tenancy/${property.id}`}>
            <Home className="mr-2 h-4 w-4" /> Your home · manage
          </Link>
        </Button>
      );
    case "let":
      return <Button size={size} className={full} disabled>Currently let</Button>;
    case "approved":
      return (
        <Button asChild size={size} className={full}>
          <Link href="/student/leases">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Accepted · review lease
          </Link>
        </Button>
      );
    case "pending":
      return compact ? (
        <Button asChild size={size} variant="outline">
          <Link href="/student/requests">
            <Clock className="mr-2 h-4 w-4" /> Requested
          </Link>
        </Button>
      ) : (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <Clock aria-hidden className="h-4 w-4" /> Request sent {formatDistanceToNow(new Date(state.request.applicationDate), { addSuffix: true })}
          </p>
          <p className="mt-1 text-amber-900/80">The landlord will accept or decline. You&apos;ll get a notification either way.</p>
          <Link href="/student/requests" className="mt-2 inline-block font-medium underline underline-offset-2">
            Track your requests
          </Link>
        </div>
      );
    case "open":
      break;
  }

  return (
    <>
      <Button size={size} className={full} onClick={() => setOpen(true)} disabled={!landlord}>
        <Send className="mr-2 h-4 w-4" /> Request to rent
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request to rent</DialogTitle>
            <DialogDescription>
              {property.title}. {landlord ? `${landlord.name} will see your request and profile.` : ""}
            </DialogDescription>
          </DialogHeader>

          {profile && (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.profileImageUrl} alt="" />
                <AvatarFallback>{profile.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{profile.name}</p>
                <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GraduationCap aria-hidden className="h-3 w-3" /> {profile.school || "No university added"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone aria-hidden className="h-3 w-3" /> {profile.phone || "No phone added"}
                  </span>
                </p>
              </div>
              {(!profile.school || !profile.phone) && (
                <Link href="/student/account" className="shrink-0 text-xs font-medium text-primary hover:underline">
                  Complete
                </Link>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="request-message">Message to the landlord</Label>
            <Textarea
              id="request-message"
              rows={5}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself: what you study, when you'd like to move in and how long you'll stay."
            />
            <div className="flex flex-wrap gap-1.5">
              {PROMPTS.map((p) => {
                const text = p.replace("{school}", profile?.school || "university");
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setMessage((m) => (m ? `${m} ${text}` : text))}
                    className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={send} disabled={sending}>
              {sending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
