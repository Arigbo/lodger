import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Home } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { EditFormValues } from '../edit-schemas';
import { Combobox } from '@/components/ui/combobox';
import { SchoolCombobox } from '@/components/school-combobox';
import { countries } from '@/types/countries';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface GeographySectionProps {
  form: UseFormReturn<EditFormValues>;
}

export const GeographySection: React.FC<GeographySectionProps> = ({ form }) => {
  return (
    <div className="space-y-10">
      <div className="inline-flex items-center gap-4">
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Home className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Geographic Position</h3>
      </div>

      <div className="space-y-8">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Street Address</FormLabel>
              <FormControl>
                <Input placeholder="123 UNIVERSITY AVE" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Country</FormLabel>
                <FormControl>
                  <Combobox
                    options={countries.map((c) => ({ label: c.name, value: c.name }))}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      form.setValue('state', ''); // Reset state when country changes
                    }}
                    placeholder="SELECT COUNTRY"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">State/Province</FormLabel>
                <FormControl>
                  <Combobox
                    options={
                      countries.find((c) => c.name === form.watch('country'))?.states.map((s) => ({
                        label: s.name,
                        value: s.name,
                      })) || []
                    }
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="SELECT STATE"
                    disabled={!form.watch('country')}
                    emptyText={!form.watch('country') ? "Select a country first" : "No states found"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">City</FormLabel>
                <FormControl>
                  <Input placeholder="URBANVILLE" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="zip"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">ZIP Code</FormLabel>
                <FormControl>
                  <Input placeholder="90210" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 items-end">
          <FormField
            control={form.control}
            name="school"
            render={({ field }) => (
              <FormItem className="md:col-span-1">
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Search Institution</FormLabel>
                <FormControl>
                  <SchoolCombobox
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2 space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Latitude</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any"
                        placeholder="6.5244" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Longitude</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any"
                        placeholder="3.3792" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="p-6 rounded-2xl bg-[#050505] text-white border border-white/5 space-y-4">
               <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Coordinate Protocol Assistance</h4>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Help tenants find your property on the global grid.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            form.setValue('lat', pos.coords.latitude);
                            form.setValue('lng', pos.coords.longitude);
                          });
                        }
                      }}
                      className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/5 text-[9px] font-black uppercase tracking-widest"
                    >
                      Sense Location
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" className="h-10 px-4 rounded-xl bg-primary text-black hover:bg-primary/90 text-[9px] font-black uppercase tracking-widest">
                          Request Coordinates
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[2rem] border-2 p-8 max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Coordinate Protocol Request</DialogTitle>
                          <DialogDescription className="text-xs font-medium mt-2">Follow these protocols to extract exact coordinates from Google Maps.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-6">
                          {[
                            "Open Google Maps on your desktop or mobile device.",
                            "Locate your property and right-click (or long-press) the exact entrance.",
                            "A pop-up will appear displaying the Latitude and Longitude (e.g., 6.52, 3.37).",
                            "Click the coordinates to copy them, or transcribe them into the terminal fields here."
                          ].map((step, i) => (
                            <div key={i} className="flex gap-4">
                              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                              <p className="text-xs font-bold text-muted-foreground uppercase leading-tight tracking-wide">{step}</p>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
