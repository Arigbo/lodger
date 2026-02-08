import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Home } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { EditFormValues } from "../edit-schemas";
import { Combobox } from "@/components/ui/combobox";
import { SchoolCombobox } from "@/components/school-combobox";
import { countries } from "@/types/countries";
import dynamic from "next/dynamic";

const LocationPickerMap = dynamic(
  () => import("@/components/LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full rounded-[2rem] bg-muted animate-pulse border-2 border-foreground/5 mb-6" />
    ),
  },
);

interface GeographySectionProps {
  form: UseFormReturn<EditFormValues>;
}

export const GeographySection: React.FC<GeographySectionProps> = ({ form }) => {
  const { toast } = useToast();

  const lat = form.watch("lat");
  const lng = form.watch("lng");

  return (
    <div className="space-y-10">
      <div className="inline-flex items-center gap-4">
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Home className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">
          Geographic Position
        </h3>
      </div>

      <div className="space-y-8">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Street Address
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="123 UNIVERSITY AVE"
                  {...field}
                  className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
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
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
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
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  City
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="URBANVILLE"
                    {...field}
                    className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest"
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
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  ZIP Code
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="90210"
                    {...field}
                    className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest"
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
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Search Institution
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Use the{" "}
              <span className="text-foreground">"Get Accurate Location"</span>{" "}
              button on the map for precision.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <FormField
            control={form.control}
            name="lat"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
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
                    className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest"
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
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
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
                    className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest"
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
