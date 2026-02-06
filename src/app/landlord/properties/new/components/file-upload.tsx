'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/utils';
import { 
    UploadCloud, 
    FileImage, 
    Loader2, 
    AlertCircle, 
    ShieldCheck, 
    X,
    Image as ImageIcon,
    RefreshCw
} from 'lucide-react';

interface FileUploadProps {
    field: any;
    label: string;
    description: string;
    icon: any;
    onUpload?: (files: FileList) => void;
    onAnalysisChange?: (analysis: { safety: string, context: string, reason?: string } | null) => void;
}

export const FileUpload = ({ field, label, description, icon: Icon, onUpload, onAnalysisChange }: FileUploadProps) => {
    const [isScanning, setIsScanning] = useState(false);
    const [analysis, setAnalysis] = useState<{ safety: string, context: string, reason?: string } | null>(null);
    const { toast } = useToast();

    const stripMetadata = async (file: File): Promise<Blob> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob((blob) => {
                        resolve(blob || file);
                    }, 'image/jpeg', 0.95);
                } else {
                    resolve(file);
                }
            };
            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
        });
    };

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
            const cleanBlob = await stripMetadata(originalFile);
            const cleanFile = new File([cleanBlob], originalFile.name, { type: 'image/jpeg' });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(cleanFile);
            field.onChange(dataTransfer.files);

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                try {
                    const response = await fetch('/api/moderate-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
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
                                title: "Security Alert",
                                description: data.reason || "Content flagged for safety violations.",
                            });
                            field.onChange(null);
                            setAnalysis(null);
                            onAnalysisChange?.(null);
                        } else if (data.context === 'IRRELEVANT') {
                            toast({
                                title: "Context Conflict",
                                description: data.reason || "Image appears unrelated to real estate.",
                            });
                        } else {
                            toast({
                                title: "Verified",
                                description: "Image successfully moderated.",
                            });
                        }
                    } else if (response.status === 429) {
                        toast({
                            title: "AI Bypassed",
                            description: "Limit reached. Image accepted without AI verification.",
                        });
                    } else {
                        throw new Error('Moderation failed');
                    }
                } catch (error) {
                    console.error("Moderation error:", error);
                    toast({
                        title: "AI Offline",
                        description: "Proceeding without safety scan.",
                    });
                }
                setIsScanning(false);
            };
            reader.readAsDataURL(cleanFile);
        } catch (error) {
            console.error("Processing error", error);
            toast({
                variant: "destructive",
                title: "Processing Failed",
                description: "Critical image error.",
            });
            setIsScanning(false);
            field.onChange(null);
        }
    };

    const isIssue = analysis && (analysis.safety === 'UNSAFE' || analysis.context === 'IRRELEVANT');

    return (
        <FormItem className="h-full flex flex-col">
            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-primary/60" /> 
                    {label}
                </span>
                <AnimatePresence mode="wait">
                    {analysis && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-tighter uppercase backdrop-blur-md shadow-sm",
                                analysis.safety === 'SAFE' && analysis.context === 'RELEVANT' 
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                    : "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                            )}
                        >
                            {analysis.safety === 'SAFE' && analysis.context === 'RELEVANT' ? (
                                <><ShieldCheck className="h-2.5 w-2.5" /> Verified</>
                            ) : (
                                <><AlertCircle className="h-2.5 w-2.5" /> Issue</>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </FormLabel>
            
            <FormControl>
                <div className={cn(
                    "flex-1 min-h-[14rem] relative group/dropzone rounded-[2.5rem] p-1 transition-all duration-500",
                    isIssue ? "bg-orange-500/5 shadow-[0_0_40px_-15px_rgba(249,115,22,0.1)]" : "bg-foreground/[0.02] hover:bg-foreground/[0.04]"
                )}>
                    {/* Background Noise/Gradient */}
                    <div className="absolute inset-0 rounded-[2.5rem] opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
                    
                    <div className={cn(
                        "h-full w-full rounded-[2.4rem] border-2 border-dashed flex flex-col items-center justify-center transition-all duration-700 relative overflow-hidden",
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
                                        <div className="h-20 w-20 rounded-3xl bg-white shadow-2xl flex items-center justify-center relative z-10">
                                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Deep Scanning</p>
                                        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">AI Security Check in progress</p>
                                    </div>
                                </motion.div>
                            ) : field.value?.[0] ? (
                                <motion.div 
                                    key="preview"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full h-full flex flex-col items-center justify-center p-8 space-y-4"
                                >
                                    <div className="relative group/preview shadow-2xl shadow-black/10 rounded-2xl overflow-hidden aspect-video w-full max-w-[200px]">
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
                                        <p className="text-[11px] font-black uppercase tracking-tight text-foreground/80 truncate max-w-[180px]">
                                            {field.value[0].name}
                                        </p>
                                        <div className="flex items-center justify-center gap-4">
                                            <label htmlFor={field.name} className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                                                <RefreshCw className="h-3 w-3" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Replace</span>
                                                <input id={field.name} type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
                                            </label>
                                        </div>
                                        
                                        {isIssue && (
                                            <motion.p 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-[9px] font-black text-orange-600 uppercase tracking-tighter mt-3 flex items-center justify-center gap-1.5 bg-orange-50 px-3 py-1 rounded-full border border-orange-100"
                                            >
                                                <AlertCircle className="h-2.5 w-2.5" />
                                                {analysis.reason || "Context mismatch detected"}
                                            </motion.p>
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
                                        <div className="h-20 w-20 rounded-3xl bg-white shadow-lg border border-muted/10 flex items-center justify-center relative z-10 transition-shadow group-hover/dropzone:shadow-2xl">
                                            <UploadCloud className="h-10 w-10 text-muted-foreground/30 group-hover/dropzone:text-primary transition-colors" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <label htmlFor={field.name} className="cursor-pointer">
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground group-hover/dropzone:text-primary transition-colors">
                                                Add {label}
                                            </span>
                                            <input id={field.name} type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
                                        </label>
                                        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">High-Res PNG, JPG • 5MB Limit</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </FormControl>
            <FormMessage className="text-[10px] font-bold mt-2" />
        </FormItem>
    );
};
