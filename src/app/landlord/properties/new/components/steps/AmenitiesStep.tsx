"use client";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { amenities as allAmenities } from "@/types";
import { cn } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Utensils,
  Sofa,
  Bath,
  BedDouble,
  Wifi,
  Car,
  AirVent,
  Dumbbell,
  Waves,
  Layout as LayoutIcon,
} from "lucide-react";

import { AMENITY_ICONS, DEFAULT_ICON } from "@/lib/amenity-icons";

interface AmenitiesStepProps {
  form: any;
}

export const AmenitiesStep = ({ form }: AmenitiesStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-10 md:space-y-14"
    >
      <div className="space-y-2">
        <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-foreground">
          Lifestyle & <span className="text-primary">Facilities</span>
        </h2>
        <p className="text-[10px] md:text-xs font-bold text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
          Select the premium features that define the living experience of your
          property.
        </p>
      </div>

      <FormField
        control={form.control}
        name="amenities"
        render={({ field }) => (
          <FormItem className="space-y-8">
            <div className="flex items-center justify-between">
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Available Amenities
              </FormLabel>
              <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                {field.value?.length || 0} Selected
              </span>
            </div>
            <FormControl>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {allAmenities.map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity] || DEFAULT_ICON;
                  const isSelected = field.value?.includes(amenity);

                  return (
                    <motion.button
                      key={amenity}
                      type="button"
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.preventDefault();
                        const currentValues = field.value || [];
                        const newValue = currentValues.includes(amenity)
                          ? currentValues.filter((v: string) => v !== amenity)
                          : [...currentValues, amenity];
                        field.onChange(newValue);
                      }}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-4 p-6 rounded-[2rem] border-2 transition-all duration-500 overflow-hidden group",
                        isSelected
                          ? "bg-foreground text-white border-foreground shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
                          : "bg-foreground/[0.02] border-transparent hover:border-primary/20 text-muted-foreground hover:bg-white",
                      )}
                    >
                      <div
                        className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors duration-500",
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-muted/10 group-hover:bg-primary/10 group-hover:text-primary",
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {amenity}
                      </span>

                      {/* Selection Indicator */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary"
                          />
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="rules"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              House Protocol (Rules)
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g., No parties after 10PM, Pets allowed with deposit..."
                className="min-h-[120px] rounded-[2rem] bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 font-bold text-sm p-6"
                {...field}
              />
            </FormControl>
            <FormDescription className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-3">
              Clear protocols reduce tenant conflicts by up to 60%.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </motion.div>
  );
};
