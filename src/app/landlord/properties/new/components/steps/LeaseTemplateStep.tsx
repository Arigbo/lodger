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
import { generateLeaseTextForTemplate } from '@/app/landlord/properties/new/utils';
import type { PropertyForm } from "../../types";

interface LeaseTemplateStepProps {
    form: PropertyForm;
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
            className="space-y-8"
        >
            <div className="space-y-2">
                <h2 className="font-headline text-xl font-bold tracking-tight sm:text-2xl">
                    Lease template
                </h2>
                <p className="text-sm text-muted-foreground">
                    The lease students will review and sign when you accept their request.
                </p>
            </div>

            <FormField
                control={form.control}
                name="leaseTemplate"
                render={({ field }) => (
                    <FormItem className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <FormLabel>Lease Agreement Template</FormLabel>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={handleGenerateTemplate}
                                className="h-10 px-6 rounded-full border-primary/20 hover:border-primary text-primary font-semibold text-xs bg-primary/5 hover:bg-primary/10 transition-all group"
                            >
                                <Wand2 className="h-3.5 w-3.5 mr-2 group-hover:rotate-12 transition-transform" />
                                Generate from Property Data
                            </Button>
                        </div>
                        <FormControl>
                            <div className="relative group/editor">
                                <div className="absolute inset-0 bg-foreground opacity-[0.01] rounded-xl pointer-events-none group-hover/editor:opacity-[0.02] transition-opacity" />
                                <Textarea 
                                    {...field} 
                                    placeholder="Paste your lease agreement here or use the generator above..." 
                                    className="min-h-[450px] rounded-xl bg-transparent border border-foreground/5 focus-visible:border-primary/20 font-mono text-xs md:text-xs p-5 leading-loose resize-none shadow-inner" 
                                />
                                
                                {/* Aesthetic Corner Detail */}
                                <div className="absolute bottom-6 right-6 p-4 opacity-5 pointer-events-none">
                                    <FileText className="h-12 w-12" />
                                </div>
                            </div>
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                            Variables in <span className="text-primary">{"{{DOUBLE_BRACES}}"}</span> will be replaced during lease generation.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </motion.div>
    );
};
