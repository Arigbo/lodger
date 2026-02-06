'use client';

import { 
    FormField, 
    FormItem, 
    FormLabel, 
    FormControl, 
    FormMessage,
    FormDescription
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Zap } from 'lucide-react';
import { cn } from '@/utils';

interface AIStepProps {
    form: any;
    isGeneratingDescription: boolean;
    generateAIDescription: () => void;
}

export const AIStep = ({ form, isGeneratingDescription, generateAIDescription }: AIStepProps) => {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 md:space-y-12"
        >
            <div className="space-y-2">
                <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-foreground">
                    Cognitive <span className="text-primary">Generation</span>
                </h2>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
                    Leverage advanced AI to craft a compelling narrative for your property.
                </p>
            </div>

            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property Description</FormLabel>
                            <Button 
                                type="button" 
                                size="sm" 
                                onClick={generateAIDescription}
                                disabled={isGeneratingDescription}
                                className="h-10 px-6 rounded-full bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 group relative overflow-hidden"
                            >
                                <AnimatePresence mode="wait">
                                    {isGeneratingDescription ? (
                                        <motion.div 
                                            key="loading"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Synthesizing...
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            key="static"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Zap className="h-3.5 w-3.5 fill-current" />
                                            AI Compose
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                
                                <motion.div 
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                                    animate={isGeneratingDescription ? { x: ['100%', '-100%'] } : {}}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                />
                            </Button>
                        </div>
                        
                        <FormControl>
                            <div className="relative group/ai">
                                <div className="absolute inset-0 bg-primary/[0.02] rounded-[2.5rem] pointer-events-none" />
                                <Textarea 
                                    placeholder="Click AI Compose to generate a high-converting description based on your property data..." 
                                    className="min-h-[300px] rounded-[2.5rem] bg-transparent border-2 border-primary/10 focus-visible:border-primary/30 font-bold text-sm md:text-base p-8 md:p-12 leading-relaxed shadow-sm transition-all" 
                                    {...field} 
                                />
                                
                                {isGeneratingDescription && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[2px] rounded-[2.5rem] z-10 transition-all">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                                            </div>
                                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">AI Thinking...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </FormControl>
                        <FormDescription className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] text-center">
                            AI-optimized descriptions are 3x more likely to secure immediate viewings.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </motion.div>
    );
};
