import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, AlertCircle } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { EditFormValues } from '../edit-schemas';

interface IdentitySectionProps {
  form: UseFormReturn<EditFormValues>;
  handleCurrencyChange: (val: string) => void;
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({ form, handleCurrencyChange }) => {
  return (
    <div className="space-y-10">
      <div className="inline-flex items-center gap-4">
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Core Identity</h3>
      </div>

      <div className="grid grid-cols-1 gap-8 md:gap-12">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Asset Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., MODERN DOWNTOWN LOFT" {...field} className="h-16 md:h-20 rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-lg md:text-2xl font-black uppercase tracking-tight" />
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
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Comprehensive Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the essence of your property..." {...field} className="min-h-[150px] md:min-h-[200px] rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs md:text-sm font-medium p-4 md:p-6 italic" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Monthly Evaluation</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="1200" {...field} className="h-16 md:h-20 rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xl md:text-3xl font-black text-primary" />
                </FormControl>
                <div className="mt-2 flex items-start gap-2 text-amber-600 bg-amber-500/10 p-4 rounded-xl border border-amber-500/10">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-[9px] font-bold leading-tight uppercase tracking-tight">
                    Price sync takes effect on the <strong>next cycle</strong> for active residents. New protocols will use updated values.
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
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Currency Protocol</FormLabel>
                  <Select onValueChange={handleCurrencyChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-16 md:h-20 rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus:ring-0 text-sm md:text-base font-black uppercase tracking-widest">
                        <SelectValue placeholder="Protocol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase">
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
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Asset Class</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-16 md:h-20 rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus:ring-0 text-sm md:text-base font-black uppercase tracking-widest">
                        <SelectValue placeholder="Class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase">
                      <SelectItem value="Self Contain">Self Contain</SelectItem>
                      <SelectItem value="Flat">Flat / Apartment</SelectItem>
                      <SelectItem value="BHK">BHK</SelectItem>
                      <SelectItem value="Studio">Studio</SelectItem>
                      <SelectItem value="Duplex">Duplex</SelectItem>
                      <SelectItem value="Bungalow">Bungalow</SelectItem>
                      <SelectItem value="Terrace">Terrace</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                      <SelectItem value="Mansion">Mansion</SelectItem>
                      <SelectItem value="House">House</SelectItem>
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
