"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2, ExternalLink, Loader2, Wand2 } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { SettingsSection } from "@/components/account/settings-section";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { moderateAndUpload } from "@/firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { describeUploadError } from "@/lib/errors";
import { deleteMedia, uploadMedia } from "@/lib/media/upload-media";
import { formatPrice } from "@/lib/utils";
import type { Property } from "@/types";
import { generateLeaseTextForTemplate } from "@/app/landlord/properties/new/utils";
import { DEFAULT_EDIT_VALUES } from "./edit-constants";
import { editFormSchema, type EditFormValues } from "./edit-schemas";
import { convertPrice, parseRules } from "./edit-utils";
import { AmenitiesSection } from "./sections/AmenitiesSection";
import { GeographySection } from "./sections/GeographySection";
import { IdentitySection } from "./sections/IdentitySection";
import { MediaSection } from "./sections/MediaSection";
import { RulesSection } from "./sections/RulesSection";
import { SpecificationSection } from "./sections/SpecificationSection";

const SECTIONS = [
  { id: "basics", label: "Basics" },
  { id: "location", label: "Location" },
  { id: "rooms", label: "Rooms" },
  { id: "media", label: "Photos" },
  { id: "amenities", label: "Amenities" },
  { id: "rules", label: "Rules" },
  { id: "lease", label: "Lease" },
];

const toNumberOrNull = (v: unknown) => (typeof v === "number" ? v : v ? parseFloat(String(v)) : null);

function toFormValues(property: Property): EditFormValues {
  return {
    title: property.title || "",
    description: property.description || "",
    price: property.price || 0,
    currency: property.currency || "USD",
    type: property.type,
    address: property.location?.address || "",
    country: property.location?.country || "",
    city: property.location?.city || "",
    state: property.location?.state || "",
    zip: property.location?.zip || "",
    school: property.location?.school || "",
    lat: property.location?.lat ?? "",
    lng: property.location?.lng ?? "",
    bedrooms: property.bedrooms || 1,
    bathrooms: property.bathrooms || 1,
    area: property.area || 0,
    amenities: property.amenities || [],
    rules: property.rules?.join(", ") || "",
    leaseTemplate: property.leaseTemplate || "",
  } as EditFormValues;
}

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const propertyRef = useMemoFirebase(() => (id ? doc(firestore, "properties", id) : null), [firestore, id]);
  const { data: property, isLoading } = useDoc<Property>(propertyRef);

  const [isUploading, setIsUploading] = useState(false);
  const [currencyChange, setCurrencyChange] = useState<{ from: string; to: string } | null>(null);

  const form = useForm<EditFormValues>({ resolver: zodResolver(editFormSchema), defaultValues: DEFAULT_EDIT_VALUES });
  const { isDirty, isSubmitting } = form.formState;

  // Load the saved listing into the form (and again after it changes elsewhere, unless mid-edit).
  useEffect(() => {
    if (property && !form.formState.isDirty) form.reset(toFormValues(property));
  }, [property, form]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const handleCurrencyChange = (to: string) => {
    const from = form.getValues("currency");
    // Radix Select can emit "" while the form is (re)loading; only react to real picks.
    if (to && from && to !== from) setCurrencyChange({ from, to });
  };

  const applyCurrency = (convert: boolean) => {
    if (!currencyChange) return;
    if (convert) form.setValue("price", convertPrice(form.getValues("price"), currencyChange.from, currencyChange.to), { shouldDirty: true });
    form.setValue("currency", currencyChange.to, { shouldDirty: true });
    setCurrencyChange(null);
  };

  // Photos and videos save immediately; they don't wait for "Save changes".
  async function handleImageUpload(files: FileList | null) {
    if (!files || !property || !propertyRef) return;
    setIsUploading(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const result = await moderateAndUpload(null, `properties/${property.landlordId}/${property.id}/${Date.now()}_${file.name}`, file, {
          allowIrrelevant: true,
        });
        if (result.success && result.downloadURL) added.push(result.downloadURL);
        else if (result.blocked) toast({ variant: "destructive", title: "Photo not allowed", description: `${file.name}: ${result.error}` });
      } catch (error) {
        toast({ variant: "destructive", ...describeUploadError(error) });
      }
    }
    if (added.length) {
      await updateDoc(propertyRef, { images: [...(property.images || []), ...added] });
      toast({ title: `${added.length} photo${added.length === 1 ? "" : "s"} added` });
    }
    setIsUploading(false);
  }

  async function handleRemoveImage(url: string) {
    if (!property || !propertyRef || !window.confirm("Remove this photo from the listing?")) return;
    await updateDoc(propertyRef, { images: property.images.filter((u) => u !== url) });
    void deleteMedia(url);
    toast({ title: "Photo removed" });
  }

  async function handleVideoUpload(files: FileList | null) {
    if (!files?.[0] || !property || !propertyRef) return;
    setIsUploading(true);
    try {
      const url = await uploadMedia(files[0], `properties/${property.landlordId}/${property.id}/video-${Date.now()}`, { raw: true });
      await updateDoc(propertyRef, { videos: [...(property.videos || []), url] });
      toast({ title: "Video added" });
    } catch (error) {
      toast({ variant: "destructive", ...describeUploadError(error) });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveVideo(url: string) {
    if (!property || !propertyRef || !window.confirm("Remove this video from the listing?")) return;
    await updateDoc(propertyRef, { videos: (property.videos || []).filter((u) => u !== url) });
    void deleteMedia(url);
    toast({ title: "Video removed" });
  }

  const generateLease = () => {
    const values = form.getValues();
    if (values.leaseTemplate?.trim() && !window.confirm("Replace your current lease template with a generated one?")) return;
    form.setValue("leaseTemplate", generateLeaseTextForTemplate(values as never), { shouldDirty: true });
  };

  async function onSubmit(values: EditFormValues) {
    if (!propertyRef) return;
    try {
      await updateDoc(propertyRef, {
        title: values.title,
        description: values.description,
        price: values.price,
        currency: values.currency,
        type: values.type,
        location: {
          address: values.address,
          country: values.country,
          city: values.city,
          state: values.state,
          zip: values.zip ?? "",
          school: values.school || null,
          lat: toNumberOrNull(values.lat),
          lng: toNumberOrNull(values.lng),
        },
        bedrooms: values.bedrooms,
        bathrooms: values.bathrooms,
        area: values.area,
        amenities: values.amenities,
        rules: parseRules(values.rules || ""),
        leaseTemplate: values.leaseTemplate ?? "",
      });
      // Existing leases keep the terms they were sent with; changes apply to new ones.
      form.reset(values);
      toast({ title: "Listing updated", description: "Students now see your changes." });
      router.push(`/landlord/properties/${id}`);
    } catch (error) {
      console.error("Saving listing failed:", error);
      toast({ variant: "destructive", title: "Could not save your changes", description: "Please try again." });
    }
  }

  const onInvalid = () => {
    toast({ variant: "destructive", title: "Some details need fixing", description: "Check the highlighted fields." });
    document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (isUserLoading || isLoading) return <PageSkeleton variant="form" />;

  if (!property || (user && property.landlordId !== user.uid)) {
    return (
      <EmptyState
        className="mx-auto mt-10 max-w-xl"
        icon={Building2}
        title="We couldn't find this listing"
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/landlord/properties">Back to properties</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <PageHeader
        back={{ href: `/landlord/properties/${id}`, label: property.title }}
        title="Edit listing"
        description="Changes go live as soon as you save."
        actions={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/properties/${id}`} target="_blank">
              <ExternalLink className="mr-1.5 h-4 w-4" /> View as a student
            </Link>
          </Button>
        }
      />

      <nav aria-label="Listing sections" className="-mt-2 flex gap-1 overflow-x-auto border-b">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="whitespace-nowrap border-b-2 border-transparent px-3 pb-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            {s.label}
          </a>
        ))}
      </nav>

      {property.status === "occupied" && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This home has a tenant. Changes to the price, rules or lease apply to <strong>new</strong> leases only. Your current tenant&apos;s
            lease stays as signed.
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-10">
          <SettingsSection id="basics" title="Basics" description="The title, description, type and monthly rent students see first.">
            <IdentitySection form={form} handleCurrencyChange={handleCurrencyChange} />
          </SettingsSection>

          <SettingsSection id="location" title="Location" description="Where the home is and the nearest campus. Drop a pin so students can judge the commute.">
            <GeographySection form={form} />
          </SettingsSection>

          <SettingsSection id="rooms" title="Rooms and size">
            <SpecificationSection form={form} />
          </SettingsSection>

          <SettingsSection id="media" title="Photos and videos" description="Uploads and removals save straight away. Bright, wide photos of every room work best.">
            <MediaSection
              property={property}
              isUploading={isUploading}
              handleImageUpload={handleImageUpload}
              handleRemoveImage={handleRemoveImage}
              handleVideoUpload={handleVideoUpload}
              handleRemoveVideo={handleRemoveVideo}
            />
          </SettingsSection>

          <SettingsSection id="amenities" title="Amenities" description="Wi-Fi, water, power and security matter most to students.">
            <AmenitiesSection form={form} />
          </SettingsSection>

          <SettingsSection id="rules" title="House rules">
            <RulesSection form={form} />
          </SettingsSection>

          <SettingsSection
            id="lease"
            title="Lease template"
            description="Sent to a student for signing when you accept their request. Words in {{DOUBLE_BRACES}} are filled in automatically."
          >
            <FormField
              control={form.control}
              name="leaseTemplate"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <FormDescription className="m-0">
                      {field.value?.trim() ? `${field.value.trim().split(/\s+/).length} words` : "No template yet. You can't accept requests without one."}
                    </FormDescription>
                    <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-lg" onClick={generateLease}>
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Generate from listing
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={14} className="font-mono text-xs leading-relaxed" placeholder="Paste your lease, or generate one from this listing's details." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsSection>

          {/* Save bar */}
          <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-background/95 backdrop-blur-xl md:bottom-0 md:left-[var(--sidebar-width,0px)]">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <p className="text-sm text-muted-foreground">
                {isDirty ? "You have unsaved changes" : `${formatPrice(form.watch("price") || 0, form.watch("currency"))} / month · all changes saved`}
              </p>
              <div className="flex gap-2">
                {isDirty && (
                  <Button type="button" variant="ghost" onClick={() => form.reset(toFormValues(property))}>
                    Discard
                  </Button>
                )}
                <Button type="submit" disabled={!isDirty || isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save changes
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>

      <Dialog open={!!currencyChange} onOpenChange={(open) => !open && setCurrencyChange(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change currency to {currencyChange?.to}?</DialogTitle>
            <DialogDescription>
              Convert the rent from {currencyChange?.from} at today&apos;s approximate rate, or keep the same number in {currencyChange?.to}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => applyCurrency(false)}>
              Keep the number
            </Button>
            <Button onClick={() => applyCurrency(true)}>Convert the price</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
