'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/utils';
import { 
    Video, 
    X, 
    Play, 
    Film,
    Loader2
} from 'lucide-react';
import { MAX_VIDEO_SIZE } from '../constants';

interface VideoUploadProps {
    field: any;
    label: string;
    description: string;
    icon: any;
}

export const VideoUpload = ({ field, label, description, icon: Icon }: VideoUploadProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = (files: FileList | null) => {
        if (!files || files.length === 0) {
            field.onChange(null);
            return;
        }

        const file = files[0];
        if (file.size > MAX_VIDEO_SIZE) {
            toast({
                variant: "destructive",
                title: "File Too Large",
                description: "Maximum video size is 50MB.",
            });
            return;
        }

        setIsUploading(true);
        // Simulate a small delay for "processing" feel
        setTimeout(() => {
            field.onChange(files);
            setIsUploading(false);
            toast({
                title: "Video Ready",
                description: "Walkthrough video attached successfully.",
            });
        }, 1000);
    };

    return (
        <FormItem className="h-full">
            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2 mb-3">
                <Icon className="h-3.5 w-3.5 text-primary/60" /> 
                {label}
            </FormLabel>
            <FormControl>
                <div className="relative group/video rounded-[2.5rem] p-1 bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-all duration-500">
                    <div className={cn(
                        "min-h-[16rem] rounded-[2.4rem] border-2 border-dashed flex flex-col items-center justify-center transition-all duration-700 relative overflow-hidden",
                        isUploading ? "border-primary/40 bg-primary/5" :
                        field.value?.[0] ? "border-primary/20 bg-black" : "border-muted/10 group-hover/video:border-primary/30"
                    )}>
                        <AnimatePresence mode="wait">
                            {isUploading ? (
                                <motion.div 
                                    key="uploading"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex flex-col items-center gap-4"
                                >
                                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Syncing Video...</p>
                                </motion.div>
                            ) : field.value?.[0] ? (
                                <motion.div 
                                    key="preview"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="w-full h-full absolute inset-0 group/player"
                                >
                                    <video 
                                        src={URL.createObjectURL(field.value[0])} 
                                        className="w-full h-full object-cover opacity-60 group-hover/player:opacity-80 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                        <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center text-white shadow-2xl scale-90 group-hover/player:scale-100 transition-transform duration-500">
                                            <Play className="h-7 w-7 ml-1 fill-current" />
                                        </div>
                                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest truncate max-w-[120px]">
                                                {field.value[0].name}
                                            </p>
                                            <button 
                                                onClick={(e) => { e.preventDefault(); field.onChange(null); }}
                                                className="hover:text-destructive transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center gap-6"
                                >
                                    <div className="h-20 w-20 rounded-3xl bg-white shadow-lg border border-muted/10 flex items-center justify-center group-hover/video:scale-110 transition-transform duration-500">
                                        <Film className="h-10 w-10 text-muted-foreground/30 group-hover/video:text-primary transition-colors" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <label htmlFor={field.name} className="cursor-pointer">
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground group-hover/video:text-primary transition-colors">
                                                Add Walkthrough
                                            </span>
                                            <input id={field.name} type="file" className="sr-only" accept="video/*" onChange={(e) => handleFileChange(e.target.files)} />
                                        </label>
                                        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">MP4, WebM, MOV • 50MB Max</p>
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
