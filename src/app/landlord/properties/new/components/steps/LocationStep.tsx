'use client';

import { 
    FormField, 
    FormItem, 
    FormLabel, 
    FormControl, 
    FormMessage,
    FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { SchoolCombobox } from '@/components/school-combobox';
import { countries } from '@/types/countries';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

interface LocationStepProps {
    form: any;
}

export const LocationStep = ({ form }: LocationStepProps) => {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 md:space-y-12"
        >
            <div className="space-y-2">
                <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-foreground">
                    Geography & <span className="text-primary">Proximity</span>
                </h2>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
                    Precisely locate your property and highlight its institutional relevance.
                </p>
            </div>

            <div className="space-y-8">
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Street Address</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="Enter full physical address" 
                                    {...field} 
                                    className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 font-bold text-sm tracking-tight" 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                    <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nation</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus:ring-0 text-[10px] md:text-xs font-black uppercase tracking-widest">
                                            <SelectValue placeholder="Select Country" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase">
                                        {countries.map((country) => (
                                            <SelectItem key={country.iso2} value={country.name}>{country.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Province / State</FormLabel>
                                <FormControl>
                                    <Input placeholder="Region name" {...field} className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 font-bold text-sm" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                    <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Municipality (City)</FormLabel>
                                <FormControl>
                                    <Input placeholder="City name" {...field} className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 font-bold text-sm" />
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
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Registry (Postal Code)</FormLabel>
                                <FormControl>
                                    <Input placeholder="ZIP code" {...field} className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 font-bold text-sm" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <MapPin className="h-20 w-20 text-primary" />
                </div>
                
                <FormField
                    control={form.control}
                    name="school"
                    render={({ field }) => (
                        <FormItem className="relative z-10">
                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Academic Proximity</FormLabel>
                            <FormControl>
                                <div className="mt-4">
                                    <SchoolCombobox 
                                        value={field.value} 
                                        onChange={field.onChange} 
                                    />
                                </div>
                            </FormControl>
                            <FormDescription className="text-[9px] font-bold text-primary/40 uppercase tracking-widest mt-4">
                                Strategic placement near educational hubs increases conversion by 40%.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <FormField
                    control={form.control}
                    name="lat"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Latitude</FormLabel>
                            <FormControl>
                                <Input type="number" step="any" placeholder="6.5244" {...field} className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 font-bold text-sm" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lng"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Longitude</FormLabel>
                            <FormControl>
                                <Input type="number" step="any" placeholder="3.3792" {...field} className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 font-bold text-sm" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </motion.div>
    );
};
