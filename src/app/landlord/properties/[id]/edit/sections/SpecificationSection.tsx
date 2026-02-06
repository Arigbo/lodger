import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Building } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { EditFormValues } from '../edit-schemas';

interface SpecificationSectionProps {
  form: UseFormReturn<EditFormValues>;
}

export const SpecificationSection: React.FC<SpecificationSectionProps> = ({ form }) => {
  return (
    <div className="space-y-10">
      <div className="inline-flex items-center gap-4">
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Building className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Physical Specifications</h3>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <FormField
          control={form.control}
          name="bedrooms"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Sleeping Quarters</FormLabel>
              <FormControl>
                <Input type="number" placeholder="2" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
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
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Washrooms</FormLabel>
              <FormControl>
                <Input type="number" placeholder="1" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="area"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Total Area (SQFT)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="1000" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
