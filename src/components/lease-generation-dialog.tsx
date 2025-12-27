'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import type { UserProfile, Property } from '@/types';
import { ScrollArea } from './ui/scroll-area';
import { Signature, Send, FileText, ShieldCheck } from 'lucide-react';
import { generateLeaseText } from '@/utils/lease';

interface LeaseGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaseSigned: (finalText: string) => void;
  landlord: UserProfile;
  tenant: UserProfile;
  property: Property;
  templateText: string;
}

export default function LeaseGenerationDialog({
  isOpen,
  onClose,
  onLeaseSigned,
  landlord,
  tenant,
  property,
  templateText,
}: LeaseGenerationDialogProps) {
  const [isSigned, setIsSigned] = useState(false);

  const finalLeaseText = useMemo(() => {
    return generateLeaseText(templateText, { landlord, tenant, property });
  }, [templateText, landlord, tenant, property]);

  const handleSign = () => {
    setIsSigned(true);
  };

  const handleSend = () => {
    onLeaseSigned(finalLeaseText);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-full h-[90vh] flex flex-col p-0 overflow-hidden border-2 shadow-2xl rounded-[2rem]">
        <div className="p-8 pb-4 bg-muted/30 border-b">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">LEASE PROTOCOL</p>
            </div>
            <DialogTitle className="text-3xl font-black uppercase tracking-tight">Review & Sign <span className="text-primary">Agreement</span></DialogTitle>
            <DialogDescription className="text-base">
              Digital signature required to finalize the lease.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden bg-muted/10 p-4 md:p-8">
          <ScrollArea className="h-full rounded-2xl border-2 border-foreground/5 bg-white shadow-inner p-8 md:p-12">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="flex justify-between items-start border-b-2 border-muted pb-8 mb-8">
                <FileText className="h-12 w-12 text-primary/20" />
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">LEASE ID</p>
                  <p className="text-xs font-mono font-bold">LGR-PROT-{property.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div className="prose prose-sm md:prose-base max-w-none text-foreground font-serif leading-relaxed whitespace-pre-wrap">
                {finalLeaseText}
              </div>

              <div className="pt-12 mt-12 border-t-2 border-muted grid grid-cols-2 gap-12">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Landlord Signature</p>
                  <div className="h-20 border-b-2 border-dashed border-muted flex items-end pb-2 relative">
                    {isSigned && (
                      <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-95 duration-500">
                        <p className="text-2xl text-primary font-bold opacity-80 select-none">
                          {landlord.name}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{landlord.name}</p>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Tenant Signature</p>
                  <div className="h-20 border-b-2 border-dashed border-muted" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{tenant.name}</p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <div className="p-8 bg-white border-t space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className='flex items-center gap-4 group'>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-500 ${isSigned ? 'bg-green-500/10 text-green-600' : 'bg-primary/5 text-primary'}`}>
                {isSigned ? <ShieldCheck className="h-6 w-6" /> : <Signature className="h-6 w-6" />}
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-widest">Digital Auth Status</h4>
                {isSigned ? (
                  <p className="text-[10px] font-bold text-green-600 flex items-center gap-2">✓ CRYPTOGRAPHICALLY SIGNED BY LANDLORD</p>
                ) : (
                  <p className="text-[10px] font-bold text-muted-foreground">Awaiting landlord signature...</p>
                )}
              </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={handleSign}
                disabled={isSigned}
                className="flex-1 md:flex-none h-14 px-8 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-primary/5 transition-all"
              >
                <Signature className="h-4 w-4" /> SIGN AS LANDLORD
              </Button>
              <Button
                onClick={handleSend}
                disabled={!isSigned}
                className="flex-1 md:flex-none h-14 px-10 rounded-xl bg-foreground text-white hover:bg-primary transition-all font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl disabled:opacity-30"
              >
                <Send className="h-4 w-4" /> FINALIZE & SEND
              </Button>
            </div>
          </div>

          <div className="text-center">
            <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
