'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Lock, CheckCircle } from 'lucide-react';
import { cn, formatPrice } from '@/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeCheckoutForm from './stripe-checkout-form';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);


interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  amount: number;
  tenantName: string;
  tenantId: string;
  landlordId: string;
  propertyId: string;
  currency?: string;
  destinationAccountId?: string;
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
  currency = 'USD',
  destinationAccountId,
}: PaymentDialogProps) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [months, setMonths] = useState(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const totalAmount = amount * months;

  // Fetch Payment Intent clientSecret
  useEffect(() => {
    if (!isOpen || totalAmount <= 0) return;

    const fetchClientSecret = async () => {
      try {
        setClientSecret(null); // Reset
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmount,
            currency: currency,
            landlordId: landlordId,
            destinationAccountId: destinationAccountId,
          }),
        });

        const data = await response.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error(data.error || "Failed to get payment intent");
        }
      } catch (err: any) {
        console.error("Error fetching client secret:", err);
        toast({
          variant: "destructive",
          title: "Payment Error",
          description: "Could not initialize secure payment. " + err.message,
        });
      }
    };

    fetchClientSecret();
  }, [isOpen, totalAmount, currency, landlordId, destinationAccountId, toast]);

  const handlePaymentSuccess = async () => {
    setIsProcessing(true);
    try {
      const transactionsRef = collection(firestore, 'transactions');
      await addDoc(transactionsRef, {
        landlordId: landlordId,
        tenantId: tenantId,
        propertyId: propertyId,
        amount: totalAmount,
        currency: currency,
        months: months,
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
        title: "Transaction Error",
        description: "Payment was successful but we couldn't record it. Please contact support."
      });
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    onPaymentSuccess();
    toast({
      title: "Payment Successful",
      description: `Your payment of ${formatPrice(totalAmount, currency)} has been processed for ${months} month${months > 1 ? 's' : ''}.`,
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
      <DialogContent className="sm:max-w-md w-[95vw]">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard /> Secure Rent Payment
              </DialogTitle>
              <DialogDescription>
                You are paying rent for {tenantName}. The monthly rent is {formatPrice(amount, currency)}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="months">Pay for How Many Months?</Label>
                <Select value={months.toString()} onValueChange={(val) => setMonths(parseInt(val))}>
                  <SelectTrigger id="months">
                    <SelectValue placeholder="Select months" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {m} {m === 1 ? 'Month' : 'Months'} - {formatPrice(amount * m, currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {clientSecret ? (
                <div className="pt-4 border-t">
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: { theme: 'stripe' },
                    }}
                  >
                    <StripeCheckoutForm
                      amount={totalAmount}
                      currency={currency}
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Initializing secure payment...</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isProcessing}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <DialogTitle className="text-2xl font-bold">Payment Successful!</DialogTitle>
            <DialogDescription className="mt-2">
              Your rent payment of {formatPrice(totalAmount, currency)} for {months} month{months > 1 ? 's' : ''} has been confirmed. A receipt has been sent to your email.
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


