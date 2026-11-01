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
import { PROPERTY_TYPES } from "@/types/property-types";
import { Info } from "lucide-react";
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
      className="space-y-8 md:space-y-8"
    >
      {/* Introductory Header for the Step */}
      <div className="space-y-2">
        <h2 className="text-xl md:text-3xl font-bold tracking-tight text-foreground">
          Basic details
        </h2>
        <p className="text-xs md:text-xs font-bold text-muted-foreground/60 uppercase tracking-wider leading-relaxed">
          Give your listing a name, choose the property type and set the rent.
        </p>
      </div>

      <div className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Listing title
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Bright self-contain near UNILAG gate"
                  {...field}
                  className="h-14 md:h-20 rounded-2xl md:rounded-3xl bg-foreground/[0.02] border border-transparent focus-visible:border-primary/20 focus-visible:bg-card text-base md:text-2xl font-bold tracking-tight transition-all duration-500 shadow-sm"
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
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Property type
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border border-transparent focus:ring-0 text-xs md:text-xs font-semibold uppercase tracking-wider transition-all">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-2xl border font-semibold text-xs uppercase shadow-sm">
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
                          <TooltipContent className="max-w-[200px] font-bold text-xs uppercase tracking-wider text-primary p-4 rounded-xl border">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-6 p-6 md:p-8 rounded-3xl bg-foreground/[0.02] border border-foreground/[0.03]">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Monthly rent
              </FormLabel>
              <FormControl>
                <div className="relative group">
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...field}
                    className="h-14 md:h-16 rounded-2xl bg-card border border-transparent focus-visible:border-primary/20 text-xl md:text-2xl font-bold text-primary transition-all pl-10"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 font-bold text-lg">
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
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Currency
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-14 md:h-16 rounded-2xl bg-card border border-transparent focus:ring-0 text-xs md:text-xs font-semibold uppercase tracking-wider shadow-sm">
                    <SelectValue placeholder="CURRENCY" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-2xl border font-semibold text-xs uppercase">
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

      <div className="grid grid-cols-2 gap-6 md:gap-6">
        <FormField
          control={form.control}
          name="bedrooms"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Sleep Areas (Beds)
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border border-transparent focus-visible:border-primary/20 text-sm font-bold uppercase tracking-wider"
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
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Sanitary Units (Baths)
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border border-transparent focus-visible:border-primary/20 text-sm font-bold uppercase tracking-wider"
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
