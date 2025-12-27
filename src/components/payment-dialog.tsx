'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from '@/components/ui/label';
import { Building, CreditCard, Lock, CheckCircle } from 'lucide-react';
import { cn, formatPrice } from '@/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeCheckoutForm from './stripe-checkout-form';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (details: { months: number, method: 'Offline' | 'Stripe', amount: number }) => void;
  amount: number;
  tenantName: string;
  tenantId: string;
  landlordId: string;
  propertyId: string;
  currency?: string;
  destinationAccountId?: string;
  metadata?: Record<string, any>;
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
  metadata = {},
}: PaymentDialogProps) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [months, setMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'Offline' | 'Stripe'>('Offline');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const totalAmount = amount * months;

  const handleOfflinePayment = async () => {
    setIsProcessing(true);
    try {
      const transactionsRef = collection(firestore, 'transactions');
      await addDoc(transactionsRef, {
        ...metadata,
        landlordId,
        tenantId,
        propertyId,
        amount: totalAmount,
        currency,
        months,
        date: new Date().toISOString(),
        type: metadata.type || 'Rent',
        method: 'Offline',
        status: 'Pending Verification',
      });

      setIsProcessing(false);
      setStep(4); // Success step
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast({
        variant: 'destructive',
        title: "Transaction Error",
        description: "Failed to record your offline payment request."
      });
      setIsProcessing(false);
    }
  };

  const initStripePayment = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          currency,
          landlordId,
          destinationAccountId,
        }),
      });

      const data = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setStep(3);
      } else {
        throw new Error(data.error || 'Failed to initialize payment');
      }
    } catch (error: any) {
      console.error("Stripe Init Error:", error);
      toast({
        variant: 'destructive',
        title: "Payment Error",
        description: error.message || "Failed to initialize card payment."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripeSuccess = async () => {
    setIsProcessing(true);
    try {
      // Record the completed transaction in Firestore
      const transactionsRef = collection(firestore, 'transactions');
      await addDoc(transactionsRef, {
        ...metadata,
        landlordId,
        tenantId,
        propertyId,
        amount: totalAmount,
        currency,
        months,
        date: new Date().toISOString(),
        type: metadata.type || 'Rent',
        method: 'Stripe',
        status: 'Completed',
      });

      setIsProcessing(false);
      setStep(4);
    } catch (error) {
      console.error("Error recording Stripe transaction:", error);
      // Even if firestore fails, the payment itself succeeded at Stripe.
      // We should still show success but warn.
      setStep(4);
    }
  };

  const handleFinish = () => {
    onPaymentSuccess({ months, method: paymentMethod, amount: totalAmount });
    toast({
      title: "Payment Recorded",
      description: `Your payment of ${formatPrice(totalAmount, currency)} has been submitted.`,
    });
    setStep(1);
    setPaymentMethod('Offline');
    setClientSecret(null);
    onClose();
  };

  const handleClose = () => {
    if (isProcessing) return;
    setStep(1);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl w-[95vw] p-0 border-none bg-white/80 backdrop-blur-2xl shadow-3xl rounded-[2.5rem] overflow-visible">
        <div className="flex flex-col">
          {/* Progress Header */}
          <div className="relative h-24 bg-primary p-6 flex items-center justify-between rounded-t-[2.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
            <div className="relative z-10">
              <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-3">
                <CreditCard className="h-6 w-6" /> Payment Process
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn("h-1 w-8 rounded-full transition-colors", step >= 1 ? "bg-white" : "bg-white/20")} />
                <div className={cn("h-1 w-8 rounded-full transition-colors", step >= 2 ? "bg-white" : "bg-white/20")} />
                <div className={cn("h-1 w-8 rounded-full transition-colors", step >= 3 ? "bg-white" : "bg-white/20")} />
              </div>
            </div>
            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <Lock className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Step 1: Duration */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight">Select Duration</h3>
                  <p className="text-sm font-medium text-muted-foreground">How many months of rent are you paying today?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="months" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Months</Label>
                    <Select value={months.toString()} onValueChange={(val) => setMonths(parseInt(val))}>
                      <SelectTrigger id="months" className="h-16 rounded-2xl border-muted/20 bg-muted/5 font-bold text-xl px-6 focus:ring-primary/20">
                        <SelectValue placeholder="Months" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                          <SelectItem key={m} value={m.toString()} className="h-12 rounded-xl font-bold">
                            {m} {m === 1 ? 'Month' : 'Months'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-6 rounded-3xl bg-primary/5 flex flex-col justify-center gap-1 border border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Total Amount</p>
                    <p className="text-3xl font-black tracking-tighter text-primary">
                      {formatPrice(totalAmount, currency)}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">{months} x {formatPrice(amount, currency)}</p>
                  </div>
                </div>

                <Button onClick={() => setStep(2)} className="w-full h-16 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]">
                  Next Step
                </Button>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight">Payment Method</h3>
                  <p className="text-sm font-medium text-muted-foreground">Choose your preferred way to pay.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => {
                      setPaymentMethod('Stripe');
                      initStripePayment();
                    }}
                    disabled={isProcessing}
                    className="flex items-center justify-between p-6 rounded-3xl border-2 border-muted/10 hover:border-primary hover:bg-primary/5 transition-all text-left group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-muted/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">Pay with Card</p>
                        <p className="text-xs text-muted-foreground">Secure payment via Stripe (Visa, Mastercard, etc.)</p>
                      </div>
                    </div>
                    {isProcessing && paymentMethod === 'Stripe' ? (
                      <div className="h-5 w-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod('Offline');
                      setStep(3);
                    }}
                    className="flex items-center justify-between p-6 rounded-3xl border-2 border-muted/10 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-muted/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <Building className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">Direct / Offline Payment</p>
                        <p className="text-xs text-muted-foreground">Pay directly to landlord (Bank transfer, etc.)</p>
                      </div>
                    </div>
                    <CheckCircle className="h-6 w-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                <Button variant="ghost" onClick={() => setStep(1)} className="w-full h-12 rounded-2xl font-bold text-muted-foreground">
                  Go Back
                </Button>
              </div>
            )}

            {/* Step 3: Payment Details (Offline or Stripe) */}
            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {paymentMethod === 'Offline' ? (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black tracking-tight">Offline Payment</h3>
                      <p className="text-sm font-medium text-muted-foreground">Follow these steps to complete your offline transaction.</p>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-primary/5 space-y-6 border border-primary/10 text-center">
                      <div className="relative inline-block">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150" />
                        <Building className="h-12 w-12 text-primary relative" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold text-lg">Direct Payment Instructions</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Please reach out to your landlord directly via the <b>Messages</b> tab or their provided contact details to arrange the payment.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs font-bold text-amber-700 leading-relaxed text-center">
                        Note: Your receipt will be verified within 24 hours. Please contact your landlord directly to confirm the transfer.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Button
                        onClick={handleOfflinePayment}
                        disabled={isProcessing}
                        className="w-full h-16 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                      >
                        {isProcessing ? "Submitting..." : "I Have Paid"}
                      </Button>
                      <Button variant="ghost" onClick={() => setStep(2)} className="w-full h-12 rounded-2xl font-bold text-muted-foreground">
                        Change Method
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black tracking-tight">Card Payment</h3>
                      <p className="text-sm font-medium text-muted-foreground">Enter your card details to complete the payment.</p>
                    </div>

                    <div className="p-1">
                      {clientSecret && (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                          <StripeCheckoutForm
                            amount={totalAmount}
                            currency={currency}
                            onSuccess={handleStripeSuccess}
                          />
                        </Elements>
                      )}
                    </div>

                    <Button variant="ghost" onClick={() => setStep(2)} className="w-full h-12 rounded-2xl font-bold text-muted-foreground">
                      Change Method
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-green-500 shadow-2xl shadow-green-500/40">
                    <CheckCircle className="h-12 w-12 text-white" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-black tracking-tight">Payment Submitted!</h3>
                  <p className="text-lg font-medium text-muted-foreground/80 leading-relaxed max-w-sm mx-auto">
                    Your request for <span className="text-primary font-black">{formatPrice(totalAmount, currency)}</span> is awaiting verification.
                  </p>
                </div>
                <Button onClick={handleFinish} className="w-full h-16 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 transition-all hover:-translate-y-1">
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


