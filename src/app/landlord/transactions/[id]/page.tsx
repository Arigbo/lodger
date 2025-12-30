'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Transaction, UserProfile as User, Property } from '@/types';
import { sendNotification } from '@/lib/notifications';
import { formatPrice, cn } from '@/utils';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, DollarSign, User as UserIcon, Building, Download, ExternalLink, ShieldCheck, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { updateDoc } from 'firebase/firestore';
import Loading from '@/app/loading';
import Link from 'next/link';

export default function TransactionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const transactionId = params.id as string;

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [tenant, setTenant] = useState<User | null>(null);
    const [property, setProperty] = useState<Property | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDenying, setIsDenying] = useState(false);

    const handleConfirmPayment = async () => {
        if (!transactionId || !firestore || !transaction) return;
        setIsConfirming(true);

        try {
            const transRef = doc(firestore, 'transactions', transactionId);
            await updateDoc(transRef, {
                status: 'Completed',
                date: transaction.date || new Date().toISOString()
            });

            // Send Notification to Student
            await sendNotification({
                toUserId: transaction.tenantId,
                type: 'OFFLINE_PAYMENT_APPROVED',
                firestore: firestore,
                propertyTitle: property?.title || 'Property',
                link: `/student/leases` // Could link to specific lease if ID available
            });

            setTransaction(prev => prev ? {
                ...prev,
                status: 'Completed',
                date: prev.date || new Date().toISOString()
            } : null);

            alert("Payment confirmed successfully!");
        } catch (error) {
            console.error("Error confirming payment:", error);
            alert("Failed to confirm payment. Please try again.");
        } finally {
            setIsConfirming(false);
        }
    };

    const handleDenyPayment = async () => {
        if (!transactionId || !firestore || !transaction) return;
        if (!confirm("Are you sure you want to deny this payment? This action cannot be undone.")) return;

        setIsDenying(true);

        try {
            const transRef = doc(firestore, 'transactions', transactionId);
            await updateDoc(transRef, {
                status: 'Failed', // Or 'Rejected' depending on your enum
            });

            // Send Notification to Student
            await sendNotification({
                toUserId: transaction.tenantId,
                type: 'OFFLINE_PAYMENT_REJECTED',
                firestore: firestore,
                propertyTitle: property?.title || 'Property',
                link: `/student/leases`
            });

            setTransaction(prev => prev ? {
                ...prev,
                status: 'Failed'
            } : null);

            alert("Payment denied.");
        } catch (error) {
            console.error("Error denying payment:", error);
            alert("Failed to deny payment.");
        } finally {
            setIsDenying(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!transactionId || !firestore) return;
            setIsLoading(true);

            try {
                const transDoc = await getDoc(doc(firestore, 'transactions', transactionId));
                if (transDoc.exists()) {
                    const transData = { id: transDoc.id, ...transDoc.data() } as Transaction;
                    setTransaction(transData);

                    // Fetch tenant
                    const tenantDoc = await getDoc(doc(firestore, 'users', transData.tenantId));
                    if (tenantDoc.exists()) {
                        setTenant({ id: tenantDoc.id, ...tenantDoc.data() } as User);
                    }

                    // Fetch property
                    const propertyDoc = await getDoc(doc(firestore, 'properties', transData.propertyId));
                    if (propertyDoc.exists()) {
                        setProperty({ id: propertyDoc.id, ...propertyDoc.data() } as Property);
                    }
                }
            } catch (error) {
                console.error("Error fetching transaction details:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [transactionId, firestore]);

    if (isLoading) return <Loading />;
    if (!transaction) return (
        <div className="flex flex-col items-center justify-center py-20">
            <h2 className="text-2xl font-black uppercase tracking-tight">Transaction Not Found</h2>
            <Button variant="ghost" className="mt-4" onClick={() => router.back()}>Back to Transactions</Button>
        </div>
    );

    return (
        <div className="space-y-12 pb-32 animate-in fade-in duration-700">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-white shadow-sm border border-transparent hover:border-muted-foreground/10 transition-all" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Transaction<span className="text-primary"> Details.</span></h1>
                    <p className="text-[10px] md:text-sm font-medium text-muted-foreground">Detailed financial record for ID: {transaction.id}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="rounded-[3rem] border-2 border-white/40 shadow-xl shadow-black/[0.02] bg-white overflow-hidden">
                        <div className="p-10 border-b border-muted/20 bg-muted/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Transaction Amount</p>
                                <h2 className="text-5xl font-black tracking-tighter">{formatPrice(transaction.amount, transaction.currency)}</h2>
                            </div>
                            <Badge className={cn(
                                "rounded-full px-6 py-2 text-xs font-black uppercase tracking-widest border-none h-fit",
                                transaction.status === 'Completed' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                                    transaction.status === 'Pending' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" :
                                        "bg-red-500 text-white shadow-lg shadow-red-500/20"
                            )}>
                                {transaction.status}
                            </Badge>
                        </div>
                        <CardContent className="p-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                                            <Calendar className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Payment Date</p>
                                            <p className="text-lg font-bold">{transaction.date ? format(new Date(transaction.date), 'MMMM dd, yyyy') : 'Processing'}</p>
                                            <p className="text-xs text-muted-foreground font-medium">{transaction.date ? format(new Date(transaction.date), 'HH:mm:ss') : ''}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                                            <DollarSign className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Transaction Type</p>
                                            <p className="text-lg font-bold">{transaction.type}</p>
                                            <p className="text-xs text-muted-foreground font-medium">Recorded via {transaction.paymentMethod || transaction.method || 'System'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                                            <ShieldCheck className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Reference ID</p>
                                            <p className="text-lg font-bold break-all">{transaction.paymentIntentId || (transaction as any).paymentIntentId || transaction.id}</p>
                                            <p className="text-xs text-muted-foreground font-medium">Stripe/Internal Mapping</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-10" />

                            <div className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest">Digital Audit Trail</h3>
                                <div className="p-6 rounded-2xl bg-muted/5 border border-muted/10 font-mono text-xs space-y-2 opacity-60">
                                    <p>LANDLORD_ID: {transaction.landlordId}</p>
                                    <p>TENANT_ID: {transaction.tenantId}</p>
                                    <p>PROPERTY_ID: {transaction.propertyId}</p>
                                    <p>CURRENCY: {transaction.currency || 'USD'}</p>
                                    <p>TIMESTAMP: {new Date().toISOString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {(transaction.status === 'Pending' || transaction.status === 'Pending Verification') &&
                            (transaction.paymentMethod === 'Offline' || (transaction as any).method === 'Offline') && (
                                <div className="flex gap-4 flex-1">
                                    <Button
                                        onClick={handleDenyPayment}
                                        disabled={isDenying || isConfirming}
                                        variant="destructive"
                                        className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 px-8"
                                    >
                                        {isDenying ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                        Deny
                                    </Button>
                                    <Button
                                        onClick={handleConfirmPayment}
                                        disabled={isConfirming || isDenying}
                                        className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                                    >
                                        {isConfirming ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4" />
                                        )}
                                        Confirm Payment
                                    </Button>
                                </div>
                            )}
                        <Button className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2">
                            <Download className="h-4 w-4" /> Download Receipt
                        </Button>
                        <Button variant="outline" className="h-14 px-8 rounded-2xl border-2 font-black text-xs uppercase tracking-widest gap-2">
                            Print Data
                        </Button>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Related Entities */}
                    <Card className="rounded-[2.5rem] border-2 border-white/40 shadow-xl shadow-black/[0.02] bg-white overflow-hidden">
                        <CardHeader className="p-8 border-b border-muted/20">
                            <CardTitle className="text-sm font-black uppercase tracking-widest">Parties Involved</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl uppercase">
                                    {tenant?.name?.[0] || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-0.5">Tenant</p>
                                    <p className="text-base font-black truncate">{tenant?.name || 'Unknown User'}</p>
                                    <p className="text-xs text-muted-foreground font-medium truncate">{tenant?.email}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" asChild>
                                    <Link href={`/landlord/messages?conversationId=${tenant?.id}`}>
                                        <ExternalLink className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>

                            <Separator />

                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-muted/20 flex items-center justify-center text-muted-foreground">
                                    <Building className="h-7 w-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-0.5">Property</p>
                                    <p className="text-base font-black truncate">{property?.title || 'Deleted Property'}</p>
                                    <p className="text-xs text-muted-foreground font-medium truncate">{property?.location.address}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" asChild>
                                    <Link href={`/landlord/properties/${property?.id}`}>
                                        <ExternalLink className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-2 border-primary/10 bg-primary/[0.02] p-8 text-center space-y-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-black uppercase tracking-tight">Verified Archive</h4>
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                            This transaction record is cryptographically signed and archived for legal audit compliance.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
