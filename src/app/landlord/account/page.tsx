'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useFirestore, useDoc, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { Switch } from '@/components/ui/switch';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { uploadProfileImage } from '@/firebase/storage';
import { getStorage } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pencil, User, Trash2, Wallet, Clock } from 'lucide-react';
import Loading from '@/app/loading';
import { useSearchParams, useRouter } from 'next/navigation';
import { countries } from '@/types/countries';
import { Combobox } from '@/components/ui/combobox';
import { getCurrencyByCountry } from '@/utils/currencies';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const profileFormSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.string().email('Please enter a valid email address.'),
    phone: z.string().min(10, 'Please enter a valid phone number.').optional(),
    bio: z.string().max(200, 'Bio must be less than 200 characters.').optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    currency: z.string().optional(),
});

const passwordFormSchema = z.object({
    currentPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters.'),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
});


type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function AccountPage() {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();
    const firebaseApp = useFirebaseApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [refetchKey, setRefetchKey] = useState(0);
    const [stripeAccountStatus, setStripeAccountStatus] = useState<{
        status: 'incomplete' | 'pending' | 'active' | 'checking' | 'error';
        message: string;
    }>({ status: 'checking', message: '' });

    const searchParams = useSearchParams();
    const router = useRouter();

    const refetchProfile = useCallback(() => {
        setRefetchKey(prev => prev + 1);
    }, []);

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore, refetchKey]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            bio: '',
            country: '',
            state: '',
            currency: '',
        },
    });

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        }
    })

    useEffect(() => {
        // Populate form once both user and userProfile are loaded
        if (user && userProfile) {
            profileForm.reset({
                name: userProfile.name || user.displayName || '',
                email: userProfile.email || user.email || '',
                phone: userProfile.phone || '',
                bio: userProfile.bio || '',
                country: userProfile.country || '',
                state: userProfile.state || '',
                currency: userProfile.currency || '',
            });
        }
    }, [user, userProfile, profileForm]);

    // Handle Stripe Connect Return
    useEffect(() => {
        const connectSuccess = searchParams.get('stripe_connect_success');
        const accountId = searchParams.get('account_id');

        if (connectSuccess && accountId && userDocRef) {
            // Save the Stripe Account ID to the user's profile
            setDoc(userDocRef, { stripeAccountId: accountId }, { merge: true })
                .then(() => {
                    toast({
                        title: "Payouts Enabled!",
                        description: "Your Stripe account has been connected successfully.",
                    });
                    // Clean URL
                    router.replace('/landlord/account');
                })
                .catch(err => {
                    console.error("Error saving stripe ID:", err);
                    toast({ variant: "destructive", title: "Connection Error", description: "Could not save Stripe Account ID." });
                });
        }
    }, [searchParams, userDocRef, router, toast]);

    // Check Stripe account status when stripeAccountId exists
    useEffect(() => {
        const checkStripeStatus = async () => {
            if (!userProfile?.stripeAccountId) {
                setStripeAccountStatus({ status: 'incomplete', message: '' });
                return;
            }

            setStripeAccountStatus({ status: 'checking', message: 'Checking account status...' });

            try {
                console.log('Fetching Stripe status for:', userProfile.stripeAccountId);
                const response = await fetch('/api/stripe/account-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountId: userProfile.stripeAccountId }),
                });

                console.log('Stripe status response:', response.status, response.statusText);

                if (!response.ok) {
                    const text = await response.text();
                    console.error('Stripe status error body:', text);
                    try {
                        const data = JSON.parse(text);
                        setStripeAccountStatus({
                            status: 'error',
                            message: data.error || `Error: ${response.statusText}`,
                        });
                    } catch (e) {
                        setStripeAccountStatus({
                            status: 'error',
                            message: `Server Error: ${response.status} ${response.statusText}`,
                        });
                    }
                    return;
                }

                const data = await response.json();
                setStripeAccountStatus({
                    status: data.status,
                    message: data.message,
                });
            } catch (error: any) {
                console.error('Error checking Stripe status (FULL):', error);

                let errorMessage = 'Failed to verify account status';
                if (error instanceof TypeError && error.message === 'Failed to fetch') {
                    errorMessage = 'Network error: Could not reach server. Check your connection.';
                } else if (error.message) {
                    errorMessage = error.message;
                }

                setStripeAccountStatus({
                    status: 'error',
                    message: errorMessage,
                });
            }
        };

        checkStripeStatus();
    }, [userProfile?.stripeAccountId]);

    const handleConnectStripe = async () => {
        if (!user) return;
        try {
            const response = await fetch('/api/stripe/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, email: user.email }),
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Failed to get onboarding link");
            }
        } catch (error: any) {
            console.error("Stripe Connect Error:", error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    }

    const handleGoToStripeDashboard = async () => {
        if (!userProfile?.stripeAccountId) return;
        try {
            const response = await fetch('/api/stripe/dashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: userProfile.stripeAccountId }),
            });
            const data = await response.json();
            if (data.url) {
                window.open(data.url, '_blank');
            } else {
                throw new Error(data.error || "Failed to get dashboard link");
            }
        } catch (error: any) {
            console.error("Stripe Dashboard Error:", error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    }

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user || !userDocRef) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({
                variant: "destructive",
                title: "Image too large",
                description: "Please upload an image smaller than 5MB.",
            });
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                variant: "destructive",
                title: "Invalid file type",
                description: "Please upload a valid image file (JPG, PNG, WebP, etc.).",
            });
            return;
        }

        setIsUploading(true);
        try {
            const storage = getStorage(firebaseApp);
            const downloadURL = await uploadProfileImage(storage, user.uid, file);

            await setDoc(userDocRef, { profileImageUrl: downloadURL }, { merge: true });

            // Optimistic update
            setPreviewImage(downloadURL);

            toast({
                title: "Profile Picture Updated",
                description: "Your new profile picture has been saved.",
            });

        } catch (error: any) {
            console.error("Error uploading image: ", error);
            const errorMsg = error.message || "Could not upload your new profile picture. Please check that the file is a valid image and try again.";
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: errorMsg,
            });
            setPreviewImage(null); // Revert on failure
        } finally {
            setIsUploading(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    function onProfileSubmit(values: ProfileFormValues) {
        const { name, phone, bio, country, state, currency } = values;
        if (userDocRef) {
            setDoc(userDocRef, { name, phone, bio, country, state, currency }, { merge: true });
            toast({
                title: "Profile Updated",
                description: "Your public profile has been successfully updated.",
            });
        }
    }

    function onPasswordSubmit(values: PasswordFormValues) {
        console.log('Password change request:', values);
        // Add Firebase password change logic here
        toast({
            title: "Password Change Requested",
            description: "This feature is not yet implemented.",
            variant: "destructive"
        })
    }

    if (isUserLoading || isProfileLoading) {
        return <Loading />;
    }

    if (!user || !userProfile || !userDocRef) {
        return <div>Please log in to view your account settings.</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-muted/30 p-10 md:p-14 border-2 border-white/40 shadow-xl shadow-black/[0.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="relative group">
                        <Avatar className="h-32 w-32 md:h-40 md:w-40 border-8 border-white shadow-2xl transition-transform duration-500 group-hover:scale-105">
                            <AvatarImage src={previewImage || userProfile?.profileImageUrl} className="object-cover" />
                            <AvatarFallback className="bg-muted text-4xl">
                                <User className="h-16 w-16 text-muted-foreground/40" />
                            </AvatarFallback>
                        </Avatar>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-xl hover:scale-110 active:scale-95 transition-all"
                        >
                            <Pencil className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-4 text-center md:text-left">
                        <h1 className="font-headline text-2xl md:text-5xl font-black tracking-tight text-foreground uppercase">
                            Account <span className="text-primary">Settings.</span>
                        </h1>
                        <p className="max-w-md text-lg font-medium text-muted-foreground/80 leading-relaxed font-sans">
                            Manage your landlord profile, payment configurations, and security preferences.
                        </p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full space-y-10">
                <TabsList className="h-16 w-full max-w-md grid grid-cols-2 p-1 bg-muted/30 rounded-3xl border-2 border-white/40 shadow-inner">
                    <TabsTrigger value="profile" className="rounded-[1.25rem] font-black text-sm uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-[1.25rem] font-black text-sm uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
                        Operations
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-10 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-none bg-white shadow-xl shadow-black/[0.02] rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-10 border-b border-muted/20">
                            <CardTitle className="text-2xl font-black uppercase">Professional Identity</CardTitle>
                            <CardDescription className="text-lg font-medium text-muted-foreground/60">This information is visible to tenants during the application process.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10">
                            <Form {...profileForm}>
                                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                        <FormField
                                            control={profileForm.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Full Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter your business name or full name" className="h-14 rounded-2xl border-2 bg-muted/10 focus:bg-white focus:ring-4 focus:ring-primary/10 font-bold" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={profileForm.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Contact Number</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="(555) 000-0000" className="h-14 rounded-2xl border-2 bg-muted/10 focus:bg-white focus:ring-4 focus:ring-primary/10 font-bold" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={profileForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3 md:col-span-2">
                                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Primary Email</FormLabel>
                                                    <FormControl>
                                                        <Input className="h-14 rounded-2xl border-2 bg-muted/10 opacity-60 font-bold" {...field} disabled />
                                                    </FormControl>
                                                    <FormDescription className="text-muted-foreground/60 font-medium">Verified architectural contact for legal notifications.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={profileForm.control}
                                            name="bio"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3 md:col-span-2">
                                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Portfolio Description</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Describe your management style or property portfolio..."
                                                            className="min-h-[120px] rounded-2xl border-2 bg-muted/10 focus:bg-white focus:ring-4 focus:ring-primary/10 font-bold resize-none"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                                        <FormField control={profileForm.control} name="country" render={({ field }) => (
                                            <FormItem className="flex flex-col space-y-3">
                                                <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Country</FormLabel>
                                                <Combobox
                                                    options={countries.map(c => ({ label: c.name, value: c.name }))}
                                                    value={field.value}
                                                    onChange={(val) => {
                                                        field.onChange(val);
                                                        const suggestedCurrency = getCurrencyByCountry(val);
                                                        if (suggestedCurrency) {
                                                            profileForm.setValue('currency', suggestedCurrency);
                                                        }
                                                        profileForm.setValue('state', '');
                                                    }}
                                                    placeholder="Select country"
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={profileForm.control} name="state" render={({ field }) => (
                                            <FormItem className="flex flex-col space-y-3">
                                                <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Region</FormLabel>
                                                <Combobox
                                                    options={countries.find(c => c.name === profileForm.watch('country'))?.states.map(s => ({ label: s.name, value: s.name })) || []}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    placeholder="Select state"
                                                    disabled={!profileForm.watch('country')}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={profileForm.control} name="currency" render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Primary Currency</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || 'USD'}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-14 rounded-2xl border-2 bg-muted/10 font-bold">
                                                            <SelectValue placeholder="USD" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="rounded-2xl border-none shadow-3xl p-2">
                                                        <SelectItem value="USD" className="rounded-xl py-3 font-bold">USD - US Dollar</SelectItem>
                                                        <SelectItem value="NGN" className="rounded-xl py-3 font-bold">NGN - Nigerian Naira</SelectItem>
                                                        <SelectItem value="GHS" className="rounded-xl py-3 font-bold">GHS - Ghanaian Cedi</SelectItem>
                                                        <SelectItem value="KES" className="rounded-xl py-3 font-bold">KES - Kenyan Shilling</SelectItem>
                                                        <SelectItem value="GBP" className="rounded-xl py-3 font-bold">GBP - British Pound</SelectItem>
                                                        <SelectItem value="EUR" className="rounded-xl py-3 font-bold">EUR - Euro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="pt-8 border-t border-muted/10">
                                        <Button type="submit" size="lg" className="h-16 px-12 rounded-[1.25rem] font-black text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all">
                                            UPDATE PROFILE
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-10 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="md:col-span-2 space-y-10">
                            {/* Stripe Card */}
                            <Card className="border-none bg-white shadow-xl shadow-black/[0.02] rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-10 border-b border-muted/20">
                                    <CardTitle className="text-2xl font-black uppercase">Revenue Protocols</CardTitle>
                                    <CardDescription className="text-lg font-medium text-muted-foreground/60">Verify your financial identity to enable automated rent collection.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 space-y-6">
                                    {userProfile?.stripeAccountId ? (
                                        <div className="space-y-6">
                                            {stripeAccountStatus.status === 'active' ? (
                                                <div className="flex flex-col gap-6">
                                                    <div className="flex items-center justify-between p-8 rounded-[2rem] bg-green-500/5 border-2 border-green-500/10">
                                                        <div className="flex items-center gap-6">
                                                            <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                                                <Wallet className="h-7 w-7 text-green-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-black uppercase tracking-tight text-green-900">STRIPE ACTIVE</p>
                                                                <p className="text-sm font-medium text-green-700/80">{stripeAccountStatus.message}</p>
                                                            </div>
                                                        </div>
                                                        <div className="hidden md:block h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <Button
                                                            onClick={handleGoToStripeDashboard}
                                                            variant="outline"
                                                            className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest border-2 hover:bg-muted/50 transition-all"
                                                        >
                                                            STREAMS & DISBURSEMENTS
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest border-2 opacity-50 cursor-not-allowed"
                                                            disabled
                                                        >
                                                            DOWNLOAD TAX DOCUMENTS
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs font-medium text-muted-foreground/60 text-center uppercase tracking-widest">
                                                        Partner ID: {userProfile.stripeAccountId}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-6 p-8 rounded-[2rem] bg-orange-500/5 border-2 border-orange-500/10">
                                                    <div className="flex items-center gap-6">
                                                        <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                                                            <Clock className="h-7 w-7 text-orange-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black uppercase tracking-tight text-orange-900">VERIFICATION PENDING</p>
                                                            <p className="text-sm font-medium text-orange-700/80">{stripeAccountStatus.message}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col md:flex-row gap-4">
                                                        <Button onClick={handleConnectStripe} className="flex-1 h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-600/20">
                                                            RESUME REGISTRATION
                                                        </Button>
                                                        <Button onClick={handleGoToStripeDashboard} variant="outline" className="flex-1 h-14 rounded-2xl border-2 font-black text-xs uppercase tracking-widest">
                                                            CHECK STRIPE STATUS
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <p className="text-lg font-medium text-muted-foreground leading-relaxed">
                                                    To receive payments from tenants, you must synchronize a verified Stripe account.
                                                    This enables secure, direct transfers to your bank and automated rent collection.
                                                </p>
                                                <ul className="space-y-3 font-sans font-semibold text-muted-foreground/80">
                                                    <li className="flex items-center gap-3">
                                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                                        Automated monthly rent collection
                                                    </li>
                                                    <li className="flex items-center gap-3">
                                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                                        Direct bank deposits (Daily/Weekly)
                                                    </li>
                                                    <li className="flex items-center gap-3">
                                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                                        Professional tax documentation
                                                    </li>
                                                </ul>
                                            </div>
                                            <Button onClick={handleConnectStripe} size="lg" className="h-16 px-12 rounded-2xl bg-[#635BFF] hover:bg-[#635BFF]/90 text-white font-black transition-all shadow-xl shadow-[#635BFF]/20 group">
                                                CONNECT WITH STRIPE
                                                <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-none bg-white shadow-xl shadow-black/[0.02] rounded-[2.5rem]">
                                <CardHeader className="p-10">
                                    <CardTitle className="text-2xl font-black uppercase">Security Matrix</CardTitle>
                                    <CardDescription className="text-lg font-medium text-muted-foreground/60">Update your architectural access credentials.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 pt-0">
                                    <Form {...passwordForm}>
                                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-8">
                                            <FormField
                                                control={passwordForm.control}
                                                name="currentPassword"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Existing Password</FormLabel>
                                                        <FormControl>
                                                            <Input type="password" placeholder="••••••••" className="h-14 rounded-2xl border-2 bg-muted/10 font-bold" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <FormField
                                                    control={passwordForm.control}
                                                    name="newPassword"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-3">
                                                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">New Cipher</FormLabel>
                                                            <FormControl>
                                                                <Input type="password" placeholder="••••••••" className="h-14 rounded-2xl border-2 bg-muted/10 font-bold" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={passwordForm.control}
                                                    name="confirmPassword"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-3">
                                                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Verify Cipher</FormLabel>
                                                            <FormControl>
                                                                <Input type="password" placeholder="••••••••" className="h-14 rounded-2xl border-2 bg-muted/10 font-bold" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Button type="submit" className="h-14 rounded-2xl px-10 font-black uppercase text-xs tracking-widest border-2">
                                                UPDATE SECURITY
                                            </Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-10">
                            <Card className="border-none bg-white shadow-xl shadow-black/[0.02] rounded-[2.5rem]">
                                <CardHeader className="p-10">
                                    <CardTitle className="text-xl font-black uppercase">Alert Logic</CardTitle>
                                </CardHeader>
                                <CardContent className="p-10 pt-0 space-y-6">
                                    <div className="flex items-center justify-between p-6 rounded-[1.5rem] bg-muted/10 border-2">
                                        <label className="font-black text-sm uppercase">Rental Requests</label>
                                        <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                                    </div>
                                    <div className="flex items-center justify-between p-6 rounded-[1.5rem] bg-muted/10 border-2">
                                        <label className="font-black text-sm uppercase">System Coms</label>
                                        <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-destructive/20 bg-destructive/5 rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-10 pb-4">
                                    <CardTitle className="text-destructive font-black uppercase">Danger Zone</CardTitle>
                                </CardHeader>
                                <CardContent className="p-10 pt-0 space-y-6">
                                    <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed">
                                        Account termination is absolute. Once executed, all property nodes and transactional history will be purged.
                                    </p>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-destructive/10">
                                                TERMINATE ACCOUNT
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-[2.5rem] p-10 border-none shadow-3xl">
                                            <AlertDialogHeader className="space-y-4">
                                                <AlertDialogTitle className="text-3xl font-black uppercase tracking-tight">CONFIRM TERMINATION</AlertDialogTitle>
                                                <AlertDialogDescription className="text-lg font-medium leading-relaxed font-sans">
                                                    Are you absolutely certain? This will permanently delete your profile, hosted assets, and all operational data.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="pt-8 gap-4">
                                                <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2">CANCEL</AlertDialogCancel>
                                                <AlertDialogAction className="h-14 rounded-2xl font-bold bg-destructive hover:bg-destructive/90 text-white">PROCEED WITH DELETION</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />
        </div>
    );
}
