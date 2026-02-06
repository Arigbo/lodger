import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { EditFormValues } from '../edit-schemas';

interface RulesSectionProps {
  form: UseFormReturn<EditFormValues>;
}

export const RulesSection: React.FC<RulesSectionProps> = ({ form }) => {
  return (
    <div className="space-y-10">
      <div className="inline-flex items-center gap-4">
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <ShieldCheck className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Operational Protocols</h3>
      </div>

      <FormField
        control={form.control}
        name="rules"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property Rules</FormLabel>
            <FormControl>
              <Textarea
                placeholder="NO SMOKING, NO PETS, QUIET HOURS 10PM-6AM..."
                {...field}
                className="min-h-[120px] rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest p-6"
              />
            </FormControl>
            <FormDescription className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground/40 mt-3 pl-2">
              Separate distinct rules with commas for system parsing.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
