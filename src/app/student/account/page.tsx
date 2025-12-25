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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, User as UserIcon, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError, useFirebaseApp } from '@/firebase';
import type { UserProfile } from '@/types';
import { doc, setDoc } from 'firebase/firestore';
import { useRef, useEffect, useState } from 'react';
import Loading from '@/app/loading';
import { useToast } from '@/hooks/use-toast';
import { countries } from '@/types/countries';
import { getStorage } from 'firebase/storage';
import { uploadProfileImage } from '@/firebase/storage';
import { SchoolCombobox } from '@/components/school-combobox';
import { Combobox } from '@/components/ui/combobox';
import { getCurrencyByCountry } from '@/utils/currencies';

const profileFormSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.string().email('Please enter a valid email address.'),
    phone: z.string().min(10, 'Valid phone number is required.'),
    country: z.string().optional(),
    state: z.string().optional(),
    school: z.string().optional(),
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
    const firestore = useFirestore();
    const { toast } = useToast();
    const firebaseApp = useFirebaseApp();
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            country: '',
            state: '',
            school: '',
            currency: '',
        },
    });

    useEffect(() => {
        if (userProfile) {
            profileForm.reset({
                name: userProfile.name || '',
                email: userProfile.email || '',
                phone: userProfile.phone || '',
                country: userProfile.country || '',
                state: userProfile.state || '',
                school: userProfile.school || '',
                currency: userProfile.currency || 'USD',
            });
        }
    }, [userProfile, profileForm]);

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        }
    })

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !user) return;

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

            if (userDocRef) {
                await setDoc(userDocRef, { profileImageUrl: downloadURL }, { merge: true });
                setPreviewImage(downloadURL); // Optimistic update
                toast({ title: "Profile Picture Updated", description: "Your profile picture has been updated." });
            }
        } catch (error: any) {
            console.error("Error uploading image: ", error);
            const errorMsg = error.message || "Could not upload image. Please check that the file is a valid image and try again.";
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: errorMsg
            });
            setPreviewImage(null);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    function onProfileSubmit(values: ProfileFormValues) {
        if (!userDocRef) return;

        const dataToUpdate = {
            name: values.name,
            phone: values.phone,
            country: values.country,
            state: values.state,
            school: values.school,
            currency: values.currency,
        };

        setDoc(userDocRef, dataToUpdate, { merge: true })
            .then(() => {
                toast({
                    title: "Profile Updated",
                    description: "Your profile has been successfully updated.",
                });
            })
            .catch((serverError: any) => {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: dataToUpdate,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    }

    function onPasswordSubmit(values: PasswordFormValues) {
        console.log('Password change request:', values);
        toast({
            title: "Feature Not Implemented",
            description: "Password changes are not yet available.",
            variant: "destructive"
        })
    }

    if (isUserLoading || isProfileLoading) {
        return <Loading />;
    }

    if (!user || !userProfile) {
        return <div>Please log in to view your account.</div>
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
                            <CardTitle>Your Profile</CardTitle>
                            <CardDescription>This information helps landlords get to know you.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...profileForm}>
                                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0">
                                            <AvatarImage src={previewImage || userProfile.profileImageUrl} />
                                            <AvatarFallback>
                                                <UserIcon className="h-10 w-10 text-muted-foreground" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid gap-2 w-full">
                                            <p className="text-sm text-muted-foreground">Update your profile picture.</p>
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="outline" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    {isUploading ? 'Uploading...' : 'Upload Image'}
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
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleImageUpload}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={profileForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email Address</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="your@email.com" {...field} disabled />
                                                    </FormControl>
                                                    <FormDescription>Used for login and notifications.</FormDescription>
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
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={profileForm.control} name="country" render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Country</FormLabel>
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
                                            <FormItem className="flex flex-col">
                                                <FormLabel>State</FormLabel>
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
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={profileForm.control} name="currency" render={({ field }) => (
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
                                                <FormDescription>Used for price display across the site.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={profileForm.control} name="school" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>School</FormLabel>
                                                <FormControl>
                                                    <SchoolCombobox
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Select School"
                                                        emptyText="No school found."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <Button type="submit">Update Profile</Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="settings">
                    <div className="space-y-8">
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
                                        <label htmlFor="rental-requests-switch" className="text-base font-medium">Rental Status Updates</label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive an email when a landlord accepts or declines your request.
                                        </p>
                                    </div>
                                    <Switch id="rental-requests-switch" defaultChecked />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <label htmlFor="new-messages-switch" className="text-base font-medium">New Messages</label>
                                        <p className="text-sm text-muted-foreground">
                                            Get notified when a landlord sends you a message.
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
