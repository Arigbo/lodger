"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { SchoolCombobox } from "@/components/shared/school-combobox";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { countries } from "@/data/countries";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { getCurrencyByCountry } from "@/lib/currencies";
import type { UserProfile } from "@/types";

const CURRENCIES = [
  ["NGN", "Nigerian naira"],
  ["GHS", "Ghanaian cedi"],
  ["KES", "Kenyan shilling"],
  ["ZAR", "South African rand"],
  ["USD", "US dollar"],
  ["GBP", "British pound"],
  ["EUR", "Euro"],
] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters."),
  legalName: z.string().trim().max(120).optional(),
  phone: z.string().trim().min(7, "Enter a valid phone number.").or(z.literal("")),
  school: z.string().optional(),
  bio: z.string().max(300, "Keep it under 300 characters.").optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  currency: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const toValues = (p: UserProfile): Values => ({
  name: p.name ?? "",
  legalName: p.legalName ?? "",
  phone: p.phone ?? "",
  school: p.school ?? "",
  bio: p.bio ?? "",
  country: p.country ?? "",
  state: p.state ?? "",
  currency: p.currency ?? "",
});

/** Personal details. Keyed by profile ID by the parent, so it resets per user. */
export function ProfileForm({ profile }: { profile: UserProfile }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const form = useForm<Values>({ resolver: zodResolver(schema), values: toValues(profile), resetOptions: { keepDirtyValues: true } });
  const country = form.watch("country");
  const states = countries.find((c) => c.name === country)?.states ?? [];
  const isStudent = profile.role === "student";

  const onSubmit = async (values: Values) => {
    try {
      const update: Partial<UserProfile> = {
        name: values.name,
        legalName: values.legalName || "",
        phone: values.phone,
        country: values.country,
        state: values.state,
        currency: values.currency || "USD",
        ...(isStudent ? { school: values.school } : { bio: values.bio }),
      };
      await updateDoc(doc(firestore, "users", profile.id), update);
      form.reset(values);
      toast({ title: "Profile saved" });
    } catch (error) {
      console.error("Profile update failed:", error);
      toast({ variant: "destructive", title: "Could not save your profile", description: "Please try again." });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="legalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal name</FormLabel>
                <FormControl>
                  <Input placeholder="As on your ID" {...field} />
                </FormControl>
                <FormDescription>Used when you sign a lease.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Email</FormLabel>
            <Input value={profile.email} disabled readOnly />
            <FormDescription>Contact support to change your email.</FormDescription>
          </FormItem>
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" placeholder="+234 800 000 0000" {...field} />
                </FormControl>
                <FormDescription>Shared only with people you rent with.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isStudent ? (
          <FormField
            control={form.control}
            name="school"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>University</FormLabel>
                <FormControl>
                  <SchoolCombobox value={field.value} onChange={field.onChange} placeholder="Select your university" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>About you</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="A line or two students will see on your listings." {...field} />
                </FormControl>
                <FormDescription>{(field.value ?? "").length}/300</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Country</FormLabel>
                <Combobox
                  options={countries.map((c) => ({ label: c.name, value: c.name }))}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    const currency = getCurrencyByCountry(value);
                    if (currency) form.setValue("currency", currency, { shouldDirty: true });
                    form.setValue("state", "", { shouldDirty: true });
                  }}
                  placeholder="Select country"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>State</FormLabel>
                <Combobox
                  options={states.map((s) => ({ label: s.name, value: s.name }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select state"
                  disabled={!country}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCIES.map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {code} · {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-5">
          {form.formState.isDirty && (
            <Button type="button" variant="ghost" className="rounded-lg" onClick={() => form.reset(toValues(profile))}>
              Discard
            </Button>
          )}
          <Button type="submit" className="rounded-lg" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
