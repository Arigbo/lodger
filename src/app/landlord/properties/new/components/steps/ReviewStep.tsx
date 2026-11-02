'use client';

import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { cn, formatPrice } from '@/lib/utils';
import { 
    Check, 
    MapPin, 
    Sparkles, 
    FileText, 
    ImageIcon, 
    ShieldCheck,
    AlertCircle
} from 'lucide-react';
import type { PropertyForm, ImageAnalysisMap } from "../../types";

interface ReviewStepProps {
    form: PropertyForm;
    /** Jumps back to the media step so flagged photos can be replaced. */
    onEditMedia?: () => void;
    imageAnalysis: ImageAnalysisMap;
}

export const ReviewStep = ({ form, imageAnalysis, onEditMedia }: ReviewStepProps) => {
    const values = form.getValues();
    
    // Check if there are any pending issues with images
    const hasImageIssues = Object.values(imageAnalysis).some((analysis) => 
        analysis && (analysis.safety === 'UNSAFE' || analysis.context === 'IRRELEVANT')
    );

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
        >
            <div className="space-y-2">
                <h2 className="font-headline text-xl font-bold tracking-tight sm:text-2xl">
                    Review & publish
                </h2>
                <p className="text-sm text-muted-foreground">
                    Check everything looks right before your listing goes live.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-8 items-start">
                {/* Summary Card */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="p-5 rounded-xl bg-card border border-foreground/5 shadow-sm relative overflow-hidden">
                        {/* Receipt Aesthetic */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-primary/20" />
                        
                        <div className="space-y-6">
                            {/* Brand & Price Header */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-primary">Listing Authority</p>
                                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-none">{values.title || 'Untitled Listing'}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold bg-muted px-3 py-1 rounded-full">{values.type}</span>
                                        <div className="h-1.5 w-1.5 rounded-full bg-muted" />
                                        <p className="text-xs font-bold text-muted-foreground/60">{values.bedrooms} Bed • {values.bathrooms} Bath</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-muted-foreground/40 mb-1">Monthly Valuation</p>
                                    <p className="text-2xl sm:text-xl font-bold tracking-tight text-primary">
                                        {formatPrice(values.price, values.currency)}
                                    </p>
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            {/* Detail Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                                            <MapPin className="h-5 w-5 opacity-40" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Location Hub</p>
                                            <p className="text-sm font-bold leading-relaxed">{values.address}, {values.city}, {values.state} {values.zip}</p>
                                            {values.school && (
                                                <p className="text-xs font-semibold text-primary tracking-tight">Proxied: {values.school}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                                            <Sparkles className="h-5 w-5 opacity-40" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Facilities</p>
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {values.amenities?.map((a: string) => (
                                                    <span key={a} className="text-xs font-semibold tracking-tight border border-foreground/5 px-2 py-0.5 rounded-md">{a}</span>
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
                                            <p className="text-xs text-muted-foreground">Legal Framework</p>
                                            <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">Lease Template Ready</p>
                                            <p className="text-xs font-bold text-muted-foreground/60 leading-tight pt-1">
                                                {values.leaseTemplate?.length} characters of legal protection.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                                            <ImageIcon className="h-5 w-5 opacity-40" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Photos & videos</p>
                                            <div className="flex items-center gap-1.5 pt-1">
                                                {[values.kitchenImage, values.livingRoomImage, values.bedroomImage, values.bathroomImage, values.otherImage].filter(Boolean).map((img, i) => (
                                                    <div key={i} className="h-6 w-8 bg-muted rounded border border-foreground/5" />
                                                ))}
                                                {values.propertyVideo && <div className="h-6 w-8 bg-primary/20 rounded border border-primary/20" />}
                                                <span className="text-xs font-semibold text-muted-foreground ml-2">
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
                        "p-5 rounded-xl border transition-all duration-500",
                        hasImageIssues 
                            ? "bg-orange-500/5 border-orange-500/20 shadow-[0_20px_40px_-15px_rgba(249,115,22,0.1)]" 
                            : "bg-emerald-500/5 border-emerald-500/20 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.1)]"
                    )}>
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className={cn(
                                "h-16 w-16 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 duration-500",
                                hasImageIssues ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"
                            )}>
                                {hasImageIssues ? <AlertCircle className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold">
                                    {hasImageIssues ? "Action Required" : "Audit Passed"}
                                </h4>
                                <p className="text-xs font-bold text-muted-foreground/60 leading-relaxed">
                                    {hasImageIssues 
                                        ? "One or more photos were flagged by our automatic check. Please review them." 
                                        : "Your photos passed our automatic check. Your listing is ready to publish."}
                                </p>
                            </div>

                            {hasImageIssues && (
                                <button 
                                    type="button"
                                    onClick={onEditMedia}
                                    className="text-xs font-semibold text-orange-600 underline hover:text-orange-700 transition-colors"
                                >
                                    Review flagged photos
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-5 rounded-xl border bg-muted/40 space-y-4">
                        <div className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-primary" strokeWidth={4} />
                            <p className="text-xs font-semibold opacity-60">Verified Landlord</p>
                        </div>
                        <p className="text-xs font-bold leading-relaxed opacity-80 tracking-tight">
                            By submitting, you agree to our Terms of Service and Anti-Discrimination Policy.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
