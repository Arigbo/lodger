import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { EditFormValues } from "@/app/landlord/properties/[id]/edit/edit-schemas";
import { Combobox } from "@/components/ui/combobox";
import { SchoolCombobox } from "@/components/shared/school-combobox";
import { countries } from "@/data/countries";
import dynamic from "next/dynamic";

const LocationPickerMap = dynamic(
  () => import("@/components/properties/location-picker-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full rounded-xl bg-muted animate-pulse border border-foreground/5 mb-6" />
    ),
  },
);

interface GeographySectionProps {
  form: UseFormReturn<EditFormValues>;
}

export const GeographySection: React.FC<GeographySectionProps> = ({ form }) => {

  const lat = form.watch("lat");
  const lng = form.watch("lng");

  return (
    <div className="space-y-6">

      <div className="space-y-8">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Street Address
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="123 UNIVERSITY AVE"
                  {...field}
                 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Country
                </FormLabel>
                <FormControl>
                  <Combobox
                    options={countries.map((c) => ({
                      label: c.name,
                      value: c.name,
                    }))}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      form.setValue("state", ""); // Reset state when country changes
                    }}
                    placeholder="SELECT COUNTRY"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  State/Province
                </FormLabel>
                <FormControl>
                  <Combobox
                    options={
                      countries
                        .find((c) => c.name === form.watch("country"))
                        ?.states.map((s) => ({
                          label: s.name,
                          value: s.name,
                        })) || []
                    }
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="SELECT STATE"
                    disabled={!form.watch("country")}
                    emptyText={
                      !form.watch("country")
                        ? "Select a country first"
                        : "No states found"
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  City
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="URBANVILLE"
                    {...field}
                   
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
                <FormLabel>
                  ZIP Code
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="90210"
                    {...field}
                   
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6">
          <LocationPickerMap
            lat={Number(lat)}
            lng={Number(lng)}
            onChange={(newLat, newLng) => {
              form.setValue("lat", newLat);
              form.setValue("lng", newLng);
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-end">
          <FormField
            control={form.control}
            name="school"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nearby School/University
                </FormLabel>
                <FormControl>
                  <SchoolCombobox
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-muted/30 border border-border/50">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-sm font-medium">
              Click the{" "}
              <span className="text-foreground">&ldquo;Use my location&rdquo;</span>{" "}
              button on the map for better accuracy.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="lat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Latitude
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="6.5244"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                   
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
                <FormLabel>
                  Longitude
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="3.3792"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                   
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};
