"use client";

import { useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFirestore } from "@/firebase";
import { uploadProfileImage } from "@/firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { describeUploadError } from "@/lib/errors";
import type { UserProfile } from "@/types";

/** Fields that make a profile trustworthy to the other side of a rental. */
function profileChecklist(profile: UserProfile) {
  const items = [
    { label: "Profile photo", done: !!profile.profileImageUrl },
    { label: "Phone number", done: !!profile.phone },
    { label: "Legal name for leases", done: !!profile.legalName },
    { label: "Location", done: !!profile.country },
  ];
  if (profile.role === "student") items.push({ label: "University", done: !!profile.school });
  if (profile.role === "landlord") items.push({ label: "Short bio", done: !!profile.bio });
  return items;
}

export function ProfileCard({ profile }: { profile: UserProfile }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const checklist = profileChecklist(profile);
  const done = checklist.filter((i) => i.done).length;
  const percent = Math.round((done / checklist.length) * 100);
  const missing = checklist.filter((i) => !i.done);

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProfileImage(null, profile.id, file);
      await updateDoc(doc(firestore, "users", profile.id), { profileImageUrl: url });
      toast({ title: "Photo updated" });
    } catch (error) {
      console.error("Profile photo upload failed:", error);
      toast({ variant: "destructive", ...describeUploadError(error) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="flex flex-col gap-6 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
      <div className="relative w-fit shrink-0">
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
          <AvatarImage src={profile.profileImageUrl} alt="" className="object-cover" />
          <AvatarFallback className="text-2xl">{profile.name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <Button
          type="button"
          size="icon"
          className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full border-2 border-card"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change profile photo"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold">{profile.name}</p>
        <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-primary">{profile.role}</p>
      </div>

      <div className="w-full sm:w-64">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Profile {percent}% complete</span>
          {percent === 100 && <CheckCircle2 aria-hidden className="h-4 w-4 text-emerald-600" />}
        </div>
        <Progress value={percent} className="mt-2 h-1.5" aria-label={`Profile ${percent}% complete`} />
        <p className="mt-2 text-xs text-muted-foreground">
          {missing.length
            ? `Add: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.`
            : profile.role === "student"
              ? "Your profile is complete. Landlords see everything they need."
              : "Your profile is complete. Students see everything they need."}
        </p>
      </div>
    </section>
  );
}
