'use client';

import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { Check } from 'lucide-react';

interface Step {
    id: number;
    name: string;
}

interface StepNavigationProps {
    steps: Step[];
    currentStep: number;
}

export const StepNavigation = ({ steps, currentStep }: StepNavigationProps) => {
    return (
        <div className="space-y-6 md:space-y-10">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block space-y-4">
                {steps.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                        <motion.div
                            key={step.id}
                            initial={false}
                            animate={{
                                scale: isActive ? 1.05 : 1,
                                opacity: isActive || isCompleted ? 1 : 0.4
                            }}
                            className={cn(
                                "flex items-center gap-5 p-5 rounded-3xl transition-all duration-500 border-2 relative overflow-hidden",
                                isActive 
                                    ? "bg-foreground text-white border-foreground shadow-2xl shadow-black/10" 
                                    : isCompleted
                                        ? "bg-white text-foreground border-foreground/5"
                                        : "bg-white/50 text-muted-foreground border-transparent"
                            )}
                        >
                            {/* Active Glow */}
                            {isActive && (
                                <motion.div 
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-primary/20 blur-2xl -z-10"
                                />
                            )}

                            <div className={cn(
                                "h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs transition-colors duration-500",
                                isActive ? "bg-primary text-white" : isCompleted ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/20"
                            )}>
                                {isCompleted ? <Check className="h-5 w-5" strokeWidth={3} /> : step.id}
                            </div>
                            
                            <div className="flex flex-col">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Step 0{step.id}</p>
                                <p className="text-xs font-black uppercase text-inherit opacity-80">{step.name}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Mobile Progress Bar (will be handled by the main layout for better positioning, but provided here as fallback/integrated UI) */}
            <div className="block lg:hidden">
                <div className="flex justify-between items-end mb-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Current Phase</p>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-foreground leading-none">
                            {steps[currentStep - 1].name}
                        </h3>
                    </div>
                    <p className="text-2xl font-black text-primary opacity-20">0{currentStep}</p>
                </div>
                
                <div className="h-2.5 w-full bg-muted/10 rounded-full overflow-hidden border border-foreground/[0.03]">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                        transition={{ duration: 0.8, ease: "circOut" }}
                    />
                </div>
            </div>
        </div>
    );
};
