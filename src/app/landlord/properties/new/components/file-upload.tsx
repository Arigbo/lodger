'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { 
    UploadCloud, 
    Loader2, 
    AlertCircle, 
    ShieldCheck, 
    X,
    RefreshCw
} from 'lucide-react';
import { authHeaders } from "@/lib/api-client";
import { compressImage } from "@/lib/media/compress-image";
import type { FileField } from "../types";
import type { LucideIcon } from "lucide-react";

interface FileUploadProps {
    field: FileField;
    label: string;
    description: string;
    icon: LucideIcon;
    onAnalysisChange?: (analysis: { safety: string, context: string, reason?: string } | null) => void;
    /** Already-uploaded photo (e.g. from a saved draft), shown until replaced. */
    existingUrl?: string;
    onRemoveExisting?: () => void;
}

export const FileUpload = ({ field, label, description, icon: Icon, onAnalysisChange, existingUrl, onRemoveExisting }: FileUploadProps) => {
    const [isScanning, setIsScanning] = useState(false);
    const [analysis, setAnalysis] = useState<{ safety: string, context: string, reason?: string } | null>(null);
    const { toast } = useToast();

    const handleFileChange = async (files: FileList | null) => {
        if (!files || files.length === 0) {
            field.onChange(null);
            setAnalysis(null);
            onAnalysisChange?.(null);
            return;
        }

        setIsScanning(true);
        setAnalysis(null);
        onAnalysisChange?.(null);

        try {
            const originalFile = files[0];
            // Resize + re-encode in the browser: removes EXIF/GPS data and
            // shrinks phone photos to a few hundred KB before anything is stored.
            const cleanFile = await compressImage(originalFile);

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(cleanFile);
            field.onChange(dataTransfer.files);

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                try {
                    const response = await fetch('/api/moderate-image', {
                        method: 'POST',
                        headers: await authHeaders(),
                        body: JSON.stringify({
                            imageBase64: base64,
                            mimeType: cleanFile.type
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setAnalysis(data);
                        onAnalysisChange?.(data);

                        if (data.safety === 'UNSAFE') {
                            toast({
                                variant: "destructive",
                                title: "Photo not allowed",
                                description: data.reason || "This image looks inappropriate for a listing. Please choose another.",
                            });
                            field.onChange(null);
                            setAnalysis(null);
                            onAnalysisChange?.(null);
                        } else if (data.context === 'IRRELEVANT') {
                            toast({
                                title: "Is this the right photo?",
                                description: data.reason || "It doesn't look like part of a home. You can keep it or choose another.",
                            });
                        }
                    } else if (response.status === 429) {
                        toast({ title: "Photo added", description: "Automatic photo check is busy right now — we'll accept this one." });
                    }
                    // Any other status (check not configured, signed out, service error)
                    // means the optional check is unavailable: keep the photo, no alarm.
                } catch {
                    // Network failure reaching the check: keep the photo.
                }
                setIsScanning(false);
            };
            reader.readAsDataURL(cleanFile);
        } catch (error) {
            console.error("Processing error", error);
            toast({
                variant: "destructive",
                title: "Couldn't read this image",
                description: "Try a JPG or PNG photo under 5 MB.",
            });
            setIsScanning(false);
            field.onChange(null);
        }
    };

    const isIssue = analysis && (analysis.safety === 'UNSAFE' || analysis.context === 'IRRELEVANT');

    return (
        <FormItem className="h-full flex flex-col">
            <FormLabel className="text-xs font-semibold text-muted-foreground/60 flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-primary/60" /> 
                    {label}
                </span>
                <span className="sr-only">{description}</span>
                <AnimatePresence mode="wait">
                    {analysis && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-tight uppercase backdrop-blur-md shadow-sm",
                                analysis.safety === 'SAFE' && analysis.context === 'RELEVANT' 
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                    : "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                            )}
                        >
                            {analysis.safety === 'SAFE' && analysis.context === 'RELEVANT' ? (
                                <><ShieldCheck className="h-2.5 w-2.5" /> Looks good</>
                            ) : (
                                <><AlertCircle className="h-2.5 w-2.5" /> Check photo</>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </FormLabel>
            
            <FormControl>
                <div className={cn(
                    "flex-1 min-h-[14rem] relative group/dropzone rounded-xl p-1 transition-all duration-500",
                    isIssue ? "bg-orange-500/5 shadow-[0_0_40px_-15px_rgba(249,115,22,0.1)]" : "bg-foreground/[0.02] hover:bg-foreground/[0.04]"
                )}>
                    {/* Background Noise/Gradient */}
                    <div className="absolute inset-0 rounded-xl opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
                    
                    <div className={cn(
                        "h-full w-full rounded-xl border border-dashed flex flex-col items-center justify-center transition-all duration-700 relative overflow-hidden",
                        isScanning ? "border-primary/40 bg-primary/5" :
                        isIssue ? "border-orange-500/30" :
                        field.value?.[0] ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-muted/10 group-hover/dropzone:border-primary/30"
                    )}>
                        {/* Interactive UI States */}
                        <AnimatePresence mode="wait">
                            {isScanning ? (
                                <motion.div 
                                    key="scanning"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col items-center gap-6"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                                        <div className="h-20 w-20 rounded-xl bg-card shadow-sm flex items-center justify-center relative z-10">
                                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-sm font-semibold text-primary">Preparing photo…</p>
                                        <p className="text-xs text-muted-foreground">Optimising and checking it&apos;s a good fit</p>
                                    </div>
                                </motion.div>
                            ) : field.value?.[0] ? (
                                <motion.div 
                                    key="preview"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full h-full flex flex-col items-center justify-center p-5 space-y-4"
                                >
                                    <div className="relative group/preview shadow-sm rounded-2xl overflow-hidden aspect-video w-full max-w-[200px]">
                                        <img 
                                            src={URL.createObjectURL(field.value[0])} 
                                            alt="Preview" 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/preview:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={(e) => { e.preventDefault(); handleFileChange(null); }}
                                                className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 border border-white/30"
                                            >
                                                <X className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="text-center space-y-1">
                                        <p className="text-xs font-semibold tracking-tight text-foreground/80 truncate max-w-[180px]">
                                            {field.value[0].name}
                                        </p>
                                        <div className="flex items-center justify-center gap-4">
                                            <label htmlFor={field.name} className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                                                <RefreshCw className="h-3 w-3" />
                                                <span className="text-xs font-semibold">Replace</span>
                                                <input id={field.name} type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
                                            </label>
                                        </div>
                                        
                                        {isIssue && (
                                            <motion.p 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs font-semibold text-orange-600 tracking-tight mt-3 flex items-center justify-center gap-1.5 bg-orange-50 px-3 py-1 rounded-full border border-orange-100"
                                            >
                                                <AlertCircle className="h-2.5 w-2.5" />
                                                {analysis.reason || "This may not be a photo of the home"}
                                            </motion.p>
                                        )}
                                    </div>
                                </motion.div>
                            ) : existingUrl ? (
                                <motion.div
                                    key="existing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="w-full h-full flex flex-col items-center justify-center p-5 space-y-4"
                                >
                                    <div className="relative shadow-sm rounded-2xl overflow-hidden aspect-video w-full max-w-[200px]">
                                        <img src={existingUrl} alt={`${label} (saved)`} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex items-center justify-center gap-4 text-xs font-semibold">
                                        <span className="text-emerald-600">Saved in draft</span>
                                        <label htmlFor={field.name} className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                                            <RefreshCw className="h-3 w-3" /> Replace
                                            <input id={field.name} type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
                                        </label>
                                        {onRemoveExisting && (
                                            <button type="button" onClick={onRemoveExisting} className="text-muted-foreground hover:text-destructive">
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center gap-6"
                                >
                                    <div className="relative group-hover/dropzone:scale-110 transition-transform duration-500">
                                        <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full scale-150 opacity-0 group-hover/dropzone:opacity-100 transition-opacity" />
                                        <div className="h-20 w-20 rounded-xl bg-card shadow-lg border border-muted/10 flex items-center justify-center relative z-10 transition-shadow group-hover/dropzone:shadow-sm">
                                            <UploadCloud className="h-10 w-10 text-muted-foreground/30 group-hover/dropzone:text-primary transition-colors" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <label htmlFor={field.name} className="cursor-pointer">
                                            <span className="text-xs font-semibold text-foreground group-hover/dropzone:text-primary transition-colors">
                                                Add {label}
                                            </span>
                                            <input id={field.name} type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
                                        </label>
                                        <p className="text-xs text-muted-foreground">JPG, PNG or WebP · we&apos;ll optimise it for you</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </FormControl>
            <FormMessage className="text-xs font-bold mt-2" />
        </FormItem>
    );
};
