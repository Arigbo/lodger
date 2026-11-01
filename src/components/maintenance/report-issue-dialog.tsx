"use client";

import { useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { addDoc, collection } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { sendNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { MaintenanceRequest } from "@/types";

const CATEGORIES: MaintenanceRequest["category"][] = ["Plumbing", "Electrical", "Appliance", "General", "Other"];
const PRIORITIES: { value: MaintenanceRequest["priority"]; label: string; hint: string }[] = [
  { value: "Low", label: "Low", hint: "Can wait a week or two" },
  { value: "Medium", label: "Medium", hint: "Needs fixing soon" },
  { value: "High", label: "Urgent", hint: "Unsafe or no water/power" },
];

type ReportIssueDialogProps = {
  propertyId: string;
  propertyTitle: string;
  landlordId: string;
  tenantId: string;
  tenantName: string;
  trigger?: React.ReactNode;
};

/** Lets a tenant report a repair; the landlord sees it on their maintenance board. */
export function ReportIssueDialog({ propertyId, propertyTitle, landlordId, tenantId, tenantName, trigger }: ReportIssueDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MaintenanceRequest["category"]>("General");
  const [priority, setPriority] = useState<MaintenanceRequest["priority"]>("Medium");

  const reset = () => {
    setTitle("");
    setDescription("");
    setCategory("General");
    setPriority("Medium");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const request: Omit<MaintenanceRequest, "id"> = {
        propertyId,
        landlordId,
        tenantId,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: "Pending",
        requestDate: new Date().toISOString(),
        completedDate: null,
      };
      await addDoc(collection(firestore, "maintenanceRequests"), request);
      await sendNotification({
        toUserId: landlordId,
        type: "MAINTENANCE_REQUEST",
        firestore,
        tenantName,
        propertyTitle,
        link: "/landlord/maintenance",
      });
      toast({ title: "Issue reported", description: "Your landlord has been notified. You can follow progress here." });
      reset();
      setOpen(false);
    } catch (error) {
      console.error("Report issue failed:", error);
      toast({ variant: "destructive", title: "Could not send your report", description: "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="rounded-lg">
            <Wrench className="mr-1.5 h-3.5 w-3.5" /> Report an issue
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>Tell your landlord what needs fixing at {propertyTitle}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="issue-title">What&apos;s wrong?</Label>
            <Input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kitchen tap is leaking"
              maxLength={80}
              required
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as MaintenanceRequest["category"])}>
              <SelectTrigger id="issue-category" className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">How urgent is it?</legend>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={priority === p.value}
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    priority === p.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent/50",
                  )}
                >
                  <span className="block text-sm font-medium">{p.label}</span>
                  <span className="block text-xs text-muted-foreground">{p.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="issue-description">Details</Label>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Where is it, when did it start, and anything you've already tried."
              rows={4}
              maxLength={1000}
              required
              className="rounded-lg"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" className="rounded-lg" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-lg" disabled={saving || !title.trim() || !description.trim()}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Send report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
