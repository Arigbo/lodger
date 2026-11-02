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
import { currencySymbols } from '@/lib/currencies';
import { motion } from "framer-motion";
import type { PropertyForm } from "../../types";

interface BasicInfoStepProps {
  form: PropertyForm;
}

export const BasicInfoStep = ({ form }: BasicInfoStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      {/* Introductory Header for the Step */}
      <div className="space-y-2">
        <h2 className="font-headline text-xl font-bold tracking-tight sm:text-2xl">
          Basic details
        </h2>
        <p className="text-sm text-muted-foreground">
          Give your listing a name, choose the property type and set the rent.
        </p>
      </div>

      <div className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Listing title
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Bright self-contain near UNILAG gate"
                  {...field}
                  className="h-11 text-base"
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
              <FormLabel>
                Property type
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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
                          <TooltipContent className="max-w-[220px] text-xs">
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

      <div className="grid grid-cols-1 gap-5 rounded-xl border bg-muted/30 p-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Monthly rent
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {currencySymbols[form.watch("currency")] ?? form.watch("currency")}
                  </span>
                  <Input type="number" inputMode="decimal" min={0} placeholder="0" {...field} className="h-11 bg-background pl-10 text-base font-semibold" />
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
              <FormLabel>
                Currency
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-lg">
                  {["NGN", "GHS", "KES", "ZAR", "USD", "GBP", "EUR"].map((code) => (
                    <SelectItem key={code} value={code}>
                      {code} ({currencySymbols[code] ?? code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <FormField
          control={form.control}
          name="bedrooms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Bedrooms
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="1"
                  min={1}
                  {...field}
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
              <FormLabel>
                Bathrooms
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="1"
                  min={1}
                  {...field}
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
