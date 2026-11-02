import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import { EditFormValues } from "@/app/landlord/properties/[id]/edit/edit-schemas";

interface RulesSectionProps {
  form: UseFormReturn<EditFormValues>;
}

export const RulesSection: React.FC<RulesSectionProps> = ({ form }) => {
  return (
    <div className="space-y-6">

      <FormField
        control={form.control}
        name="rules"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Property Rules
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="NO SMOKING, NO PETS, QUIET HOURS 10PM-6AM..."
                {...field}
                className="min-h-[120px]"
              />
            </FormControl>
            <FormDescription className="text-xs font-medium tracking-tight text-muted-foreground/40 mt-3 pl-2">
              Separate each rule with a comma.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
