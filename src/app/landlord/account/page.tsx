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
import { Pencil, User, Trash2, Wallet } from 'lucide-react';
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
                const response = await fetch('/api/stripe/account-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountId: userProfile.stripeAccountId }),
                });

                const data = await response.json();

                if (response.ok) {
                    setStripeAccountStatus({
                        status: data.status,
                        message: data.message,
                    });
                } else {
                    setStripeAccountStatus({
                        status: 'error',
                        message: data.error || 'Failed to check account status',
                    });
                }
            } catch (error: any) {
                console.error('Error checking Stripe status:', error);
                setStripeAccountStatus({
                    status: 'error',
                    message: 'Failed to verify account status',
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
                // If we got a new account ID, initiate save immediately or rely on return?
                // The API returns { url, accountId }. Better to save accountId now IF it's new, 
                // but simpler to rely on the return_url param logic we just added above.
                // Actually, saving it now is safer in case they drop off during onboarding but account exists.
                if (data.accountId && userDocRef) {
                    await setDoc(userDocRef, { stripeAccountId: data.accountId }, { merge: true });
                }
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Failed to get onboarding link");
            }
        } catch (error: any) {
            console.error("Stripe Connect Error:", error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    }

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user || !userDocRef) return;

        if (file.size > 1024 * 1024) {
            toast({
                variant: "destructive",
                title: "Image too large",
                description: "Please upload an image smaller than 1MB.",
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
        <div>
            <div className="mb-8">
                <h1 className="font-headline text-3xl font-bold">Account Settings</h1>
                <p className="text-muted-foreground">Manage your profile, password, and notification settings.</p>
            </div>
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Public Profile</CardTitle>
                            <CardDescription>This is how other users will see you on the site. Complete your profile to attract more tenants.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...profileForm}>
                                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 mx-auto sm:mx-0">
                                            <AvatarImage src={previewImage || userProfile.profileImageUrl} />
                                            <AvatarFallback>
                                                <User className="h-10 w-10 text-muted-foreground" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid gap-2 w-full">
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                                    {isUploading ? 'Uploading...' : <><Pencil className="mr-2 h-4 w-4" /> Edit DP</>}
                                                </Button>
                                                {(previewImage || userProfile.profileImageUrl) && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={async () => {
                                                            if (!confirm("Are you sure you want to remove your profile picture?")) return;
                                                            try {
                                                                if (userDocRef) {
                                                                    await setDoc(userDocRef, { profileImageUrl: null }, { merge: true });
                                                                    setPreviewImage(null);
                                                                    toast({ title: "Image Removed", description: "Profile picture deleted." });
                                                                }
                                                            } catch (error) {
                                                                console.error("Error removing image:", error);
                                                                toast({ variant: "destructive", title: "Error", description: "Failed to remove image." });
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Upload a real photo to build trust.</p>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                accept="image/png, image/jpeg"
                                            />
                                        </div>
                                    </div>
                                    <FormField
                                        control={profileForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Your name" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={profileForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="your@email.com" {...field} disabled />
                                                </FormControl>
                                                <FormDescription>Your email address is not displayed publicly.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={profileForm.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone Number</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="(123) 456-7890" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={profileForm.control}
                                            name="country"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Country</FormLabel>
                                                    <Combobox
                                                        options={countries.map(c => ({ label: c.name, value: c.name }))}
                                                        value={field.value}
                                                        onChange={(val) => {
                                                            field.onChange(val);
                                                            // Auto-suggest currency
                                                            const suggestedCurrency = getCurrencyByCountry(val);
                                                            if (suggestedCurrency) {
                                                                profileForm.setValue('currency', suggestedCurrency);
                                                            }
                                                            profileForm.setValue('state', ''); // Reset state on country change
                                                        }}
                                                        placeholder="Select country"
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={profileForm.control}
                                            name="state"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>State/Province</FormLabel>
                                                    <Combobox
                                                        options={countries.find(c => c.name === profileForm.watch('country'))?.states.map(s => ({ label: s.name, value: s.name })) || []}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Select state"
                                                        disabled={!profileForm.watch('country')}
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={profileForm.control}
                                        name="currency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Preferred Currency</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || 'USD'}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select currency" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                                                        <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                                                        <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                                                        <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                                                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>Your preferred currency for receiving payments and viewing dashboards.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit">Update Profile</Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="settings">
                    <div className="space-y-8">
                        {/* Payout Settings Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Payout Settings</CardTitle>
                                <CardDescription>Connect your bank account to receive rent payments directly.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {userProfile?.stripeAccountId ? (
                                    <>
                                        {stripeAccountStatus.status === 'checking' && (
                                            <div className="flex items-center gap-3 p-4 border rounded-lg">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                                <p className="text-sm text-muted-foreground">{stripeAccountStatus.message}</p>
                                            </div>
                                        )}
                                        {stripeAccountStatus.status === 'active' && (
                                            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-green-100 rounded-full">
                                                        <Wallet className="h-5 w-5 text-green-700" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-green-900">Stripe Connected</p>
                                                        <p className="text-sm text-green-700">{stripeAccountStatus.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {stripeAccountStatus.status === 'incomplete' && (
                                            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-yellow-100 rounded-full">
                                                        <Wallet className="h-5 w-5 text-yellow-700" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-yellow-900">Onboarding Incomplete</p>
                                                        <p className="text-sm text-yellow-700">{stripeAccountStatus.message}</p>
                                                    </div>
                                                </div>
                                                <Button onClick={handleConnectStripe} variant="outline" className="w-fit">
                                                    Complete Stripe Setup
                                                </Button>
                                            </div>
                                        )}
                                        {stripeAccountStatus.status === 'pending' && (
                                            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 rounded-full">
                                                        <Wallet className="h-5 w-5 text-blue-700" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-blue-900">Account Pending</p>
                                                        <p className="text-sm text-blue-700">{stripeAccountStatus.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {stripeAccountStatus.status === 'error' && (
                                            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-red-50 border-red-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-red-100 rounded-full">
                                                        <Wallet className="h-5 w-5 text-red-700" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-red-900">Status Check Failed</p>
                                                        <p className="text-sm text-red-700">{stripeAccountStatus.message}</p>
                                                    </div>
                                                </div>
                                                <Button onClick={handleConnectStripe} variant="outline" className="w-fit">
                                                    Retry Setup
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        <p className="text-sm text-muted-foreground">
                                            To receive payments from tenants, you must connect a Stripe account.
                                            This allows funds to be transferred directly to your bank.
                                        </p>
                                        <Button onClick={handleConnectStripe} className="w-fit">
                                            Connect with Stripe
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Change Password</CardTitle>
                                <CardDescription>For security, please choose a strong password.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...passwordForm}>
                                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                                        <FormField
                                            control={passwordForm.control}
                                            name="currentPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Current Password</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={passwordForm.control}
                                            name="newPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>New Password</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={passwordForm.control}
                                            name="confirmPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Confirm New Password</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit">Change Password</Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Notification Settings</CardTitle>
                                <CardDescription>Manage how you receive notifications.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <label htmlFor="rental-requests-switch" className="text-base font-medium">New Rental Requests</label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive an email when a student applies to one of your properties.
                                        </p>
                                    </div>
                                    <Switch id="rental-requests-switch" defaultChecked />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <label htmlFor="new-messages-switch" className="text-base font-medium">New Messages</label>
                                        <p className="text-sm text-muted-foreground">
                                            Get notified when a student or tenant sends you a message.
                                        </p>
                                    </div>
                                    <Switch id="new-messages-switch" defaultChecked />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-destructive">
                            <CardHeader>
                                <CardTitle className="text-destructive">Delete Account</CardTitle>
                                <CardDescription>Permanently delete your account and all associated data. This action cannot be undone.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive">Delete My Account</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete your
                                                account and remove your data from our servers.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
