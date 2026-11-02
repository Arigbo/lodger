import React from "react";
import { AMENITY_ICONS, DEFAULT_ICON } from "@/lib/amenity-icons";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { EditFormValues } from "@/app/landlord/properties/[id]/edit/edit-schemas";
import { amenities as allAmenities } from "@/types";
import { cn } from "@/lib/utils";

interface AmenitiesSectionProps {
  form: UseFormReturn<EditFormValues>;
}

export const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({ form }) => {
  return (
    <div className="space-y-6">

      <FormField
        control={form.control}
        name="amenities"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allAmenities.map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity] || DEFAULT_ICON;
                  const isChecked = field.value?.includes(amenity);

                  return (
                    <button
                      key={amenity}
                      type="button"
                      className={cn(
                        "relative flex flex-col items-center justify-center p-6 rounded-xl border transition-all cursor-pointer group",
                        isChecked
                          ? "border-primary bg-primary/5 shadow-lg shadow-primary/5"
                          : "border-transparent bg-muted/20 hover:bg-muted/30",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        const current = field.value || [];
                        const updated = isChecked
                          ? current.filter((v: string) => v !== amenity)
                          : [...current, amenity];
                        field.onChange(updated);
                      }}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 flex items-center justify-center rounded-2xl transition-colors mb-3",
                          isChecked
                            ? "bg-primary text-black"
                            : "bg-foreground/5 text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold text-center">
                        {amenity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
