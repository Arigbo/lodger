
"use client";

import React, { useState } from "react";
import {
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/utils";

interface StripeCheckoutFormProps {
    amount: number;
    onSuccess: () => void;
}

export default function StripeCheckoutForm({ amount, onSuccess }: StripeCheckoutFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.href, // This handles the redirect flow if needed, but we often want to avoid redirect if possible for simple cards
                // For simple cards without 3DS, execution continues.
                // For 3DS, it redirects and this promise resolves differently/never.
            },
            redirect: 'if_required', // Important to avoid redirect for standard cards
        });

        if (error) {
            setErrorMessage(error.message || "An unexpected error occurred.");
            setIsLoading(false);
        } else {
            // Payment successful!
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/10 mb-4">
                <span>Total Due:</span>
                <span className="font-bold text-xl">{formatPrice(amount)}</span>
            </div>

            <PaymentElement />

            {errorMessage && (
                <div className="text-destructive text-sm font-medium">{errorMessage}</div>
            )}

            <Button
                disabled={!stripe || isLoading}
                className="w-full"
                size="lg"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                    </>
                ) : (
                    `Pay ${formatPrice(amount)}`
                )}
            </Button>
        </form>
    );
}
