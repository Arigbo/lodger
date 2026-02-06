'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn, formatPrice } from '@/utils';
import { 
    Check, 
    Home, 
    MapPin, 
    Sparkles, 
    FileText, 
    ImageIcon, 
    ShieldCheck,
    AlertCircle
} from 'lucide-react';

interface ReviewStepProps {
    form: any;
    imageAnalysis: any;
}

export const ReviewStep = ({ form, imageAnalysis }: ReviewStepProps) => {
    const values = form.getValues();
    
    // Check if there are any pending issues with images
    const hasImageIssues = Object.values(imageAnalysis).some((analysis: any) => 
        analysis && (analysis.safety === 'UNSAFE' || analysis.context === 'IRRELEVANT')
    );

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 md:space-y-12"
        >
            <div className="space-y-2">
                <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-foreground">
                    Final <span className="text-primary">Verification</span>
                </h2>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
                    Review your property portfolio before it goes live to millions of potential tenants.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 items-start">
                {/* Summary Card */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="p-8 md:p-12 rounded-[2.5rem] bg-white border-2 border-foreground/5 shadow-2xl shadow-black/5 relative overflow-hidden">
                        {/* Receipt Aesthetic */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-primary/20" />
                        
                        <div className="space-y-10">
                            {/* Brand & Price Header */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Listing Authority</p>
                                    <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none">{values.title || 'Untitled Listing'}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-foreground text-white px-3 py-1 rounded-full">{values.type}</span>
                                        <div className="h-1.5 w-1.5 rounded-full bg-muted" />
                                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{values.bedrooms} Bed • {values.bathrooms} Bath</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Monthly Valuation</p>
                                    <p className="text-3xl md:text-5xl font-black tracking-tighter text-primary">
                                        {formatPrice(values.price, values.currency)}
                                    </p>
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            {/* Detail Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                                            <MapPin className="h-5 w-5 opacity-40" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Location Hub</p>
                                            <p className="text-sm font-bold leading-relaxed">{values.address}, {values.city}, {values.state} {values.zip}</p>
                                            {values.school && (
                                                <p className="text-[9px] font-black text-primary uppercase tracking-tighter">Proxied: {values.school}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                                            <Sparkles className="h-5 w-5 opacity-40" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Facilities</p>
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {values.amenities?.map((a: string) => (
                                                    <span key={a} className="text-[8px] font-black uppercase tracking-tighter border border-foreground/5 px-2 py-0.5 rounded-md">{a}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                                            <FileText className="h-5 w-5 opacity-40" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Legal Framework</p>
                                            <p className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block uppercase tracking-widest">Lease Template Ready</p>
                                            <p className="text-[10px] font-bold text-muted-foreground/60 leading-tight pt-1">
                                                {values.leaseTemplate?.length} characters of legal protection.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                                            <ImageIcon className="h-5 w-5 opacity-40" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Media Assets</p>
                                            <div className="flex items-center gap-1.5 pt-1">
                                                {[values.kitchenImage, values.livingRoomImage, values.bedroomImage, values.bathroomImage, values.otherImage].filter(Boolean).map((img, i) => (
                                                    <div key={i} className="h-6 w-8 bg-muted rounded border border-foreground/5" />
                                                ))}
                                                {values.propertyVideo && <div className="h-6 w-8 bg-primary/20 rounded border border-primary/20" />}
                                                <span className="text-[9px] font-black text-muted-foreground ml-2">
                                                    {[values.kitchenImage, values.livingRoomImage, values.bedroomImage, values.bathroomImage, values.otherImage, values.propertyVideo].filter(Boolean).length} Assets
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status & Action Card */}
                <div className="space-y-6">
                    <div className={cn(
                        "p-8 rounded-[2rem] border-2 transition-all duration-500",
                        hasImageIssues 
                            ? "bg-orange-500/5 border-orange-500/20 shadow-[0_20px_40px_-15px_rgba(249,115,22,0.1)]" 
                            : "bg-emerald-500/5 border-emerald-500/20 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.1)]"
                    )}>
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className={cn(
                                "h-16 w-16 rounded-3xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 duration-500",
                                hasImageIssues ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"
                            )}>
                                {hasImageIssues ? <AlertCircle className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="text-sm font-black uppercase tracking-[0.2em]">
                                    {hasImageIssues ? "Action Required" : "Audit Passed"}
                                </h4>
                                <p className="text-[10px] font-bold text-muted-foreground/60 leading-relaxed uppercase tracking-widest">
                                    {hasImageIssues 
                                        ? "One or more media assets require your attention due to AI security flags." 
                                        : "Your listing has passed all integrity and security checks. It is ready for public release."}
                                </p>
                            </div>

                            {hasImageIssues && (
                                <button 
                                    type="button"
                                    onClick={() => form.setValue('currentStep', 5)} // This depends on how the parent handles it
                                    className="text-[9px] font-black text-orange-600 underline uppercase tracking-widest hover:text-orange-700 transition-colors"
                                >
                                    Fix Media Errors
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-foreground text-white shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-primary" strokeWidth={4} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Verified Landlord</p>
                        </div>
                        <p className="text-xs font-bold leading-relaxed opacity-80 uppercase tracking-tight">
                            By submitting, you agree to our Terms of Service and Anti-Discrimination Policy.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
