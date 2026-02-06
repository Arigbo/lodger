'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
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
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface LocationStepProps {
    form: any;
}

export const LocationStep = ({ form }: LocationStepProps) => {
    const [isSensing, setIsSensing] = useState(false);
    const { toast } = useToast();

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

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                    <FormField
                        control={form.control}
                        name="lat"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Latitude</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="number" 
                                        step="any" 
                                        placeholder="6.5244" 
                                        {...field} 
                                        onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 font-bold text-sm" 
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
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Longitude</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="number" 
                                        step="any" 
                                        placeholder="3.3792" 
                                        {...field} 
                                        onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="h-14 md:h-16 rounded-2xl bg-foreground/[0.02] border-2 border-transparent focus-visible:border-primary/20 font-bold text-sm" 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="p-8 rounded-[2.5rem] bg-[#050505] text-white border border-white/5 space-y-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2 text-center md:text-left">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Location Protocol</h4>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                                Stay in the compound of the property and click &apos;Sense Location&apos; for the most accurate results.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <Button 
                                type="button" 
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        setIsSensing(true);
                                        navigator.geolocation.getCurrentPosition(
                                            async (position) => {
                                                const { latitude, longitude } = position.coords;
                                                form.setValue('lat', latitude);
                                                form.setValue('lng', longitude);
                                                
                                                setIsSensing(false);
                                                toast({ title: "Coordinates Acquired", description: "Geographical sync successful." });
                                            },
                                            () => {
                                                setIsSensing(false);
                                                toast({ variant: "destructive", title: "Sync Failed", description: "Could not establish a lock on your position." });
                                            },
                                            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
                                        );
                                    }
                                }}
                                className="h-12 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/5 text-[10px] font-black uppercase tracking-widest"
                            >
                                Sense Location
                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button type="button" className="h-12 px-6 rounded-2xl bg-primary text-black hover:bg-primary/90 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                                        Request Coordinates
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[3rem] border-4 p-12 max-w-xl shadow-3xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Get Geographic Coordinates</DialogTitle>
                                        <DialogDescription className="text-sm font-medium mt-4">
                                            The easiest way to get your property location is to stay in the compound of the property and click <strong>Sense Location</strong> on the main form.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-8 mt-10">
                                        {[
                                            "Stay in the compound or at the entrance of your property.",
                                            "Click the 'Sense Location' button next to the Latitude/Longitude fields.",
                                            "Grant location permission to your browser when prompted.",
                                            "Your coordinates will be automatically filled with high precision."
                                        ].map((step, i) => (
                                            <div key={i} className="flex gap-6 items-start">
                                                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-black ring-1 ring-primary/20">{i + 1}</div>
                                                <p className="text-sm font-black text-muted-foreground uppercase tracking-tight leading-snug">{step}</p>
                                            </div>
                                        ))}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
