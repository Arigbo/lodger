"use client";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PROPERTY_TYPES } from "@/types/property-types";
import { Info, Building } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface BasicInfoStepProps {
  form: any;
}

export const BasicInfoStep = ({ form }: BasicInfoStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 md:space-y-12"
    >
      {/* Introductory Header for the Step */}
      <div className="space-y-2">
        <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-foreground">
          Core <span className="text-primary">Identity</span>
        </h2>
        <p className="text-[10px] md:text-xs font-bold text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
          Set the foundation of your property listing with essential details and
          pricing.
        </p>
      </div>

      <div className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Property Brand Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., THE SKYLINE PENTHOUSE"
                  {...field}
                  className="h-14 md:h-20 rounded-2xl md:rounded-3xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 focus-visible:bg-white text-base md:text-2xl font-black uppercase tracking-tight transition-all duration-500 shadow-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Asset Configuration
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus:ring-0 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all">
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase shadow-2xl">
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                      className="group py-3"
                    >
                      <div className="flex items-center justify-between w-full gap-8 min-w-[160px]">
                        <span>{type.label}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              role="button"
                              className="p-1.5 hover:bg-primary/10 rounded-full transition-colors opacity-30 group-hover:opacity-100 text-primary"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] font-bold text-[10px] uppercase tracking-widest text-primary p-4 rounded-xl border-2">
                            <p>{type.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 p-6 md:p-8 rounded-[2.5rem] bg-foreground/[0.02] border border-foreground/[0.03]">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Monthly ROI (Rent)
              </FormLabel>
              <FormControl>
                <div className="relative group">
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...field}
                    className="h-14 md:h-16 rounded-2xl bg-white border-2 border-transparent focus-visible:border-primary/20 text-xl md:text-2xl font-black text-primary transition-all pl-10"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 font-black text-lg">
                    $
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Accounting Unit
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-14 md:h-16 rounded-2xl bg-white border-2 border-transparent focus:ring-0 text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm">
                    <SelectValue placeholder="CURRENCY" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase">
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 md:gap-10">
        <FormField
          control={form.control}
          name="bedrooms"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Sleep Areas (Beds)
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 text-sm font-black uppercase tracking-widest"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bathrooms"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Sanitary Units (Baths)
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 text-sm font-black uppercase tracking-widest"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </motion.div>
  );
};
