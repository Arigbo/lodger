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
import { motion } from 'framer-motion';
import { FileText, Wand2 } from 'lucide-react';
import { generateLeaseTextForTemplate } from '../../utils';

interface LeaseTemplateStepProps {
    form: any;
}

export const LeaseTemplateStep = ({ form }: LeaseTemplateStepProps) => {
    const handleGenerateTemplate = () => {
        const propertyData = form.getValues();
        const template = generateLeaseTextForTemplate(propertyData);
        form.setValue('leaseTemplate', template);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 md:space-y-12"
        >
            <div className="space-y-2">
                <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-foreground">
                    Legal & <span className="text-primary">Governance</span>
                </h2>
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
                    Formalize your agreement with a comprehensive lease framework.
                </p>
            </div>

            <FormField
                control={form.control}
                name="leaseTemplate"
                render={({ field }) => (
                    <FormItem className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Lease Agreement Template</FormLabel>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={handleGenerateTemplate}
                                className="h-10 px-6 rounded-full border-primary/20 hover:border-primary text-primary font-black text-[10px] uppercase tracking-widest bg-primary/5 hover:bg-primary/10 transition-all group"
                            >
                                <Wand2 className="h-3.5 w-3.5 mr-2 group-hover:rotate-12 transition-transform" />
                                Generate from Property Data
                            </Button>
                        </div>
                        <FormControl>
                            <div className="relative group/editor">
                                <div className="absolute inset-0 bg-foreground opacity-[0.01] rounded-[2.5rem] pointer-events-none group-hover/editor:opacity-[0.02] transition-opacity" />
                                <Textarea 
                                    {...field} 
                                    placeholder="Paste your lease agreement here or use the generator above..." 
                                    className="min-h-[450px] rounded-[2.5rem] bg-transparent border-2 border-foreground/5 focus-visible:border-primary/20 font-mono text-[11px] md:text-xs p-8 md:p-12 leading-loose resize-none shadow-inner" 
                                />
                                
                                {/* Aesthetic Corner Detail */}
                                <div className="absolute bottom-6 right-6 p-4 opacity-5 pointer-events-none">
                                    <FileText className="h-12 w-12" />
                                </div>
                            </div>
                        </FormControl>
                        <FormDescription className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] text-center">
                            Variables in <span className="text-primary">{"{{DOUBLE_BRACES}}"}</span> will be replaced during lease generation.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </motion.div>
    );
};
