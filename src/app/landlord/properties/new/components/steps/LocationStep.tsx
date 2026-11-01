"use client";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchoolCombobox } from "@/components/shared/school-combobox";
import { countries } from "@/data/countries";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import type { PropertyForm } from "../../types";

const LocationPickerMap = dynamic(
  () => import("@/components/properties/location-picker-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full rounded-3xl bg-muted animate-pulse border border-foreground/5" />
    ),
  },
);

interface LocationStepProps {
  form: PropertyForm;
}

export const LocationStep = ({ form }: LocationStepProps) => {

  const lat = form.watch("lat");
  const lng = form.watch("lng");

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 md:space-y-8"
    >
      <div className="space-y-2">
        <h2 className="text-xl md:text-3xl font-bold tracking-tight text-foreground">
          Location
        </h2>
        <p className="text-xs md:text-xs font-bold text-muted-foreground/60 uppercase tracking-wider leading-relaxed">
          Pin your property on the map and tell students which campus it is near.
        </p>
      </div>

      <div className="space-y-8">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Street Address
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter full physical address"
                  {...field}
                  className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border border-transparent focus-visible:border-primary/20 font-bold text-sm tracking-tight"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-6">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Nation
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border border-transparent focus:ring-0 text-xs md:text-xs font-semibold uppercase tracking-wider">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-2xl border font-semibold text-xs uppercase">
                    {countries.map((country) => (
                      <SelectItem key={country.iso2} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Province / State
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Region name"
                    {...field}
                    className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border border-transparent focus-visible:border-primary/20 font-bold text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-6">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Municipality (City)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="City name"
                    {...field}
                    className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border border-transparent focus-visible:border-primary/20 font-bold text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="zip"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Registry (Postal Code)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="ZIP code"
                    {...field}
                    className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border border-transparent focus-visible:border-primary/20 font-bold text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <MapPin className="h-20 w-20 text-primary" />
        </div>

        <FormField
          control={form.control}
          name="school"
          render={({ field }) => (
            <FormItem className="relative z-10">
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-primary">
                Academic Proximity
              </FormLabel>
              <FormControl>
                <div className="mt-4">
                  <SchoolCombobox
                    value={field.value}
                    onChange={field.onChange}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs font-bold text-primary/40 uppercase tracking-wider mt-4">
                Strategic placement near educational hubs increases conversion
                by 40%.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-6">
        <LocationPickerMap
          lat={Number(lat) || 0}
          lng={Number(lng) || 0}
          onChange={(newLat, newLng) => {
            form.setValue("lat", newLat);
            form.setValue("lng", newLng);
          }}
        />

        {/* Simplified Instructions */}
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-muted/30 border border-border/50">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Use the{" "}
            <span className="text-foreground">"Get Accurate Location"</span>{" "}
            button on the map for precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-6">
          <FormField
            control={form.control}
            name="lat"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Latitude
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="6.5244"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border border-transparent focus-visible:border-primary/20 font-bold text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lng"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Longitude
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="3.3792"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border border-transparent focus-visible:border-primary/20 font-bold text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </motion.div>
  );
};
