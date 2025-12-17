
# Payment Integration Guide

This application currently uses a **mocked payment flow** for demonstration purposes. To accept real payments, you need to replace the simulated logic in `src/app/student/leases/[id]/page.tsx` with a real payment gateway integration.

## Option 1: Stripe Integration

1.  **Install Guidelines**:
    ```bash
    npm install @stripe/stripe-js
    ```

2.  **Frontend Implementation**:
    - Replace the `<Input>` fields for card details with Stripe Elements (`<CardElement />`) for PCI compliance.
    - In `processPayment`, instead of a timeout, create a PaymentIntent on your server.
    - Confirm the payment on the client:
    ```javascript
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    });
    ```

3.  **Backend Implementation**:
    - You need a server-side API route (e.g., Next.js API route or Cloud Function) to initialize the Stripe SDK with your Secret Key.
    - Create an endpoint `/api/create-payment-intent` that receives the amount and currency.

## Option 2: Paystack Integration

1.  **Install Guidelines**:
    ```bash
    npm install react-paystack
    ```

2.  **Implementation**:
    - Use the `usePaystackPayment` hook.
    - Configure it with your Public Key.
    ```javascript
    const config = {
        reference: (new Date()).getTime().toString(),
        email: "user@example.com",
        amount: price * 100, // Amount in kobo
        publicKey: 'pk_test_dsdfghuytfd2345678gvxxxxxxxxxx',
    };
    
    const initializePayment = usePaystackPayment(config);
    ```
    - In the `onSuccess` callback of the Paystack modal, run the Firestore update logic (activating lease, setting status to occupied).

## Current Logic Location

The mock logic is located in **`src/app/student/leases/[id]/page.tsx`** inside the `processPayment` function:

```typescript
const processPayment = async () => {
    // ... validation ...
    
    // REPLACE THIS TIMEOUT WITH YOUR GATEWAY CALL
    setTimeout(async () => {
        // Success Logic
        await updateDoc(leaseRef, { status: 'active' });
        // ...
    }, 2000);
}
```
