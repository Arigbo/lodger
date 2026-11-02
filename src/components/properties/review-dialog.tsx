"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { addDoc, collection, limit, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { LeaseAgreement } from "@/types";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** "Write a review" for students who have rented this home and not reviewed it yet. */
export function ReviewDialog({ propertyId, alreadyReviewed }: { propertyId: string; alreadyReviewed: boolean }) {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const leaseQuery = useMemoFirebase(
    () =>
      user && profile?.role === "student"
        ? query(collection(firestore, "leaseAgreements"), where("tenantId", "==", user.uid), where("propertyId", "==", propertyId), limit(1))
        : null,
    [firestore, user, profile?.role, propertyId],
  );
  const { data: leases } = useCollection<LeaseAgreement>(leaseQuery);
  const lease = leases?.[0];

  if (!user || !profile || alreadyReviewed || !lease || lease.status === "pending") return null;

  const submit = async () => {
    setSaving(true);
    try {
      await addDoc(collection(firestore, "propertyReviews"), {
        propertyId,
        tenantId: user.uid,
        tenantName: profile.name,
        tenantImageUrl: profile.profileImageUrl ?? "",
        rating,
        comment: comment.trim(),
        reviewDate: new Date().toISOString(),
        tenancyStartDate: lease.startDate,
      });
      toast({ title: "Thanks for your review", description: "It helps other students choose well." });
      setOpen(false);
    } catch (error) {
      console.error("Review failed:", error);
      toast({ variant: "destructive", title: "Could not post your review", description: "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const shown = hover || rating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-lg">
          <Star className="mr-1.5 h-3.5 w-3.5" /> Write a review
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How was living here?</DialogTitle>
          <DialogDescription>Your review is shown with your name on the listing.</DialogDescription>
        </DialogHeader>

        <fieldset>
          <legend className="sr-only">Rating</legend>
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}: ${LABELS[n]}`}
                aria-pressed={rating === n}
                className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star className={cn("h-8 w-8 transition-colors", n <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
              </button>
            ))}
            <span className="ml-2 text-sm font-medium text-muted-foreground">{LABELS[shown]}</span>
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="review-comment">Your review</Label>
          <Textarea
            id="review-comment"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Water, power, security, the landlord, the commute… what should the next student know?"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!rating || comment.trim().length < 10 || saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Post review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
