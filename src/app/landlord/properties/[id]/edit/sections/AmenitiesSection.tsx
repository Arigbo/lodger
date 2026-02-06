import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Wifi } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { EditFormValues } from '../edit-schemas';
import { amenities as allAmenities } from '@/types';
import { cn } from '@/utils';

interface AmenitiesSectionProps {
  form: UseFormReturn<EditFormValues>;
}

export const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({ form }) => {
  return (
    <div className="space-y-10">
      <div className="inline-flex items-center gap-4">
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Wifi className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">System Amenities</h3>
      </div>

      <FormField
        control={form.control}
        name="amenities"
        render={() => (
          <FormItem>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allAmenities.map((amenity) => (
                <FormField
                  key={amenity.id}
                  control={form.control}
                  name="amenities"
                  render={({ field }) => {
                    const isChecked = field.value?.includes(amenity.id);
                    return (
                      <FormItem
                        key={amenity.id}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all cursor-pointer group",
                          isChecked
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/5"
                            : "border-transparent bg-muted/20 hover:bg-muted/30"
                        )}
                        onClick={() => {
                          const current = field.value || [];
                          const updated = isChecked
                            ? current.filter((v) => v !== amenity.id)
                            : [...current, amenity.id];
                          field.onChange(updated);
                        }}
                      >
                        <FormControl>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => {}}
                            className="hidden"
                          />
                        </FormControl>
                        <div className={cn(
                          "h-10 w-10 flex items-center justify-center rounded-2xl transition-colors mb-3",
                          isChecked ? "bg-primary text-black" : "bg-foreground/5 text-muted-foreground group-hover:text-foreground"
                        )}>
                          {React.createElement(amenity.icon, { className: "h-5 w-5" })}
                        </div>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-center cursor-pointer">
                          {amenity.label}
                        </FormLabel>
                      </FormItem>
                    );
                  }}
                />
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
