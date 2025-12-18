
'use client';

import { useState } from 'react';
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
import { Signature, Send } from 'lucide-react';

interface LeaseGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaseSigned: () => void;
  landlord: UserProfile;
  leaseText: string;
}

export default function LeaseGenerationDialog({
  isOpen,
  onClose,
  onLeaseSigned,
  landlord,
  leaseText,
}: LeaseGenerationDialogProps) {
  const [isSigned, setIsSigned] = useState(false);

  const handleSign = () => {
    setIsSigned(true);
  };

  const handleSend = () => {
    onLeaseSigned();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Review and Sign Lease Agreement</DialogTitle>
          <DialogDescription>
            A lease agreement has been generated. Please review the document below and provide your digital signature before sending it to the tenant.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] rounded-md border p-4">
          <div className="prose prose-sm whitespace-pre-wrap">{leaseText}</div>
        </ScrollArea>
        <div className="mt-4 flex items-center justify-between rounded-lg border bg-secondary/50 p-4">
          <div className='font-serif italic'>
            {isSigned ? (
              <p className="text-green-600 font-semibold flex items-center gap-2">✓ Digitally Signed by {landlord.name}</p>
            ) : (
              <p className="text-muted-foreground">Signature required to proceed.</p>
            )}
          </div>
          <Button onClick={handleSign} disabled={isSigned}>
            <Signature className="mr-2 h-4 w-4" />
            Sign as Landlord
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={!isSigned}>
            <Send className="mr-2 h-4 w-4" />
            Sign and Send to Tenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


