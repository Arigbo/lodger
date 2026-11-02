import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Info } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { EditFormValues } from "@/app/landlord/properties/[id]/edit/edit-schemas";

import { PROPERTY_TYPES } from "@/types/property-types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IdentitySectionProps {
  form: UseFormReturn<EditFormValues>;
  handleCurrencyChange: (val: string) => void;
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({
  form,
  handleCurrencyChange,
}) => {
  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 gap-8 md:gap-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Property Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., NICE 2-BEDROOM APARTMENT"
                  {...field}
                  
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Description
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write a short description of the property..."
                  {...field}
                  className="min-h-[150px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Price per Month
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="1200"
                    {...field}
                    
                  />
                </FormControl>
                <div className="mt-2 flex items-start gap-2 text-amber-600 bg-amber-500/10 p-4 rounded-xl border border-amber-500/10">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-xs font-bold leading-tight tracking-tight">
                    Price changes apply to <strong>future</strong> tenants.
                    Active tenants won't see new prices until their lease ends.
                  </p>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-8">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Currency
                  </FormLabel>
                  <Select
                    onValueChange={handleCurrencyChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Protocol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="NGN">NGN (₦)</SelectItem>
                      <SelectItem value="GHS">GHS (₵)</SelectItem>
                      <SelectItem value="KES">KES (KSh)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
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
                    Property Type
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-lg">
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
        </div>
      </div>
    </div>
  );
};
