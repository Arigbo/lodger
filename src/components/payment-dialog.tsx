
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/utils';
import { CreditCard, Lock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';


interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  amount: number;
  tenantName: string;
  tenantId: string;
  landlordId: string;
  propertyId: string;
}

export default function PaymentDialog({
  isOpen,
  onClose,
  onPaymentSuccess,
  amount,
  tenantName,
  tenantId,
  landlordId,
  propertyId,
}: PaymentDialogProps) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(async () => {
      try {
        const transactionsRef = collection(firestore, 'transactions');
        await addDoc(transactionsRef, {
            landlordId,
            tenantId,
            propertyId,
            amount,
            date: new Date().toISOString(),
            type: 'Rent',
            status: 'Completed',
        });
        
        setIsProcessing(false);
        setStep(2);
      } catch (error) {
        console.error("Error creating transaction:", error);
        toast({
            variant: 'destructive',
            title: "Payment Failed",
            description: "Could not record your payment. Please try again."
        });
        setIsProcessing(false);
      }
    }, 2000);
  };

  const handleFinish = () => {
    onPaymentSuccess();
    toast({
        title: "Payment Successful",
        description: `Your payment of ${formatPrice(amount)} has been processed.`,
    });
    // Reset and close
    setTimeout(() => {
        setStep(1);
        onClose();
    }, 500);
  };

  const handleClose = () => {
    if (isProcessing) return;
    setStep(1);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard /> Secure Rent Payment
              </DialogTitle>
              <DialogDescription>
                You are paying rent for {tenantName}. The total amount due is {formatPrice(amount)}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="card-name">Name on Card</Label>
                    <Input id="card-name" placeholder="John Doe" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input id="card-number" placeholder="**** **** **** 1234" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="expiry">Expiry</Label>
                        <Input id="expiry" placeholder="MM/YY" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="cvc">CVC</Label>
                        <Input id="cvc" placeholder="123" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="zip">ZIP</Label>
                        <Input id="zip" placeholder="12345" />
                    </div>
                </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleProcessPayment} disabled={isProcessing}>
                {isProcessing ? (
                    <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                     Processing...
                    </>
                ) : (
                    <>
                     <Lock className="mr-2 h-4 w-4" /> Pay {formatPrice(amount)}
                    </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
        {step === 2 && (
             <div className="flex flex-col items-center justify-center p-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <DialogTitle className="text-2xl font-bold">Payment Successful!</DialogTitle>
                <DialogDescription className="mt-2">
                    Your rent payment of {formatPrice(amount)} has been confirmed. A receipt has been sent to your email.
                </DialogDescription>
                <Button onClick={handleFinish} className="mt-6 w-full">
                    Done
                </Button>
             </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

    