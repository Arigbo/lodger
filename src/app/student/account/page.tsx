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
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-muted/30 p-10 md:p-14 border-2 border-white/40 shadow-xl shadow-black/[0.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="relative group">
                        <Avatar className="h-32 w-32 md:h-40 md:w-40 border-8 border-white shadow-2xl transition-transform duration-500 group-hover:scale-105">
                            <AvatarImage src={previewImage || userProfile.profileImageUrl} className="object-cover" />
                            <AvatarFallback className="bg-muted text-4xl">
                                <UserIcon className="h-16 w-16 text-muted-foreground/40" />
                            </AvatarFallback>
                        </Avatar>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-xl hover:scale-110 active:scale-95 transition-all"
                        >
                            <Upload className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-4 text-center md:text-left">
                        <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-foreground">
                            Account <span className="text-primary italic">Settings</span>
                        </h1>
                        <p className="max-w-md text-lg font-medium text-muted-foreground/80 leading-relaxed font-serif italic">
                            &quot;Personalize your profile and manage your preferences for a tailored Lodger experience.&quot;
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
                        Security
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-10 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-none bg-white shadow-xl shadow-black/[0.02] rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-10 border-b border-muted/20">
                            <CardTitle className="text-2xl font-black">Personal Information</CardTitle>
                            <CardDescription className="text-lg font-medium text-muted-foreground/60">Landlords use this to identify and verify you.</CardDescription>
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
                                                        <Input placeholder="Enter your full name" className="h-14 rounded-2xl border-2 bg-muted/10 focus:bg-white focus:ring-4 focus:ring-primary/10 font-bold" {...field} />
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
                                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Phone Number</FormLabel>
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
                                                <FormItem className="space-y-3">
                                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Email Address</FormLabel>
                                                    <FormControl>
                                                        <Input className="h-14 rounded-2xl border-2 bg-muted/10 opacity-60 font-bold" {...field} disabled />
                                                    </FormControl>
                                                    <FormDescription className="italic font-serif text-muted-foreground/60">Verified primary contact</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField control={profileForm.control} name="school" render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Institution</FormLabel>
                                                <FormControl>
                                                    <SchoolCombobox
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Select your university"
                                                        emptyText="Searching institutions..."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
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
                                                <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">State/Province</FormLabel>
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
                                                <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Currency Preference</FormLabel>
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
                                            Save Changes
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-10 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-10">
                            <Card className="border-none bg-white shadow-xl shadow-black/[0.02] rounded-[2.5rem]">
                                <CardHeader className="p-10">
                                    <CardTitle className="text-2xl font-black">Security</CardTitle>
                                    <CardDescription className="text-lg font-medium text-muted-foreground/60">Manage your password and authentication.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 pt-0">
                                    <Form {...passwordForm}>
                                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-8">
                                            <FormField
                                                control={passwordForm.control}
                                                name="currentPassword"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Current Password</FormLabel>
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
                                                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">New Password</FormLabel>
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
                                                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Confirm New Password</FormLabel>
                                                            <FormControl>
                                                                <Input type="password" placeholder="••••••••" className="h-14 rounded-2xl border-2 bg-muted/10 font-bold" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Button type="submit" className="h-14 rounded-2xl px-10 font-bold border-2">
                                                Update Security
                                            </Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>

                            <Card className="border-none bg-white shadow-xl shadow-black/[0.02] rounded-[2.5rem]">
                                <CardHeader className="p-10">
                                    <CardTitle className="text-2xl font-black">Preferences</CardTitle>
                                    <CardDescription className="text-lg font-medium text-muted-foreground/60">Control your digital footprint and notifications.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 pt-0 space-y-6">
                                    <div className="flex items-center justify-between p-6 rounded-[1.5rem] bg-muted/10 border-2">
                                        <div className="space-y-1">
                                            <h4 className="font-black text-lg">Activity Notifications</h4>
                                            <p className="text-sm font-medium text-muted-foreground/60 italic font-serif">Stay informed about request status and messages.</p>
                                        </div>
                                        <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                                    </div>
                                    <div className="flex items-center justify-between p-6 rounded-[1.5rem] bg-muted/10 border-2">
                                        <div className="space-y-1">
                                            <h4 className="font-black text-lg">Marketing & Updates</h4>
                                            <p className="text-sm font-medium text-muted-foreground/60 italic font-serif">Receive news about new features and regions.</p>
                                        </div>
                                        <Switch className="data-[state=checked]:bg-primary" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-10">
                            <Card className="border-2 border-primary/20 bg-primary/5 rounded-[2.5rem] overflow-hidden">
                                <CardContent className="p-10 text-center space-y-6">
                                    <div className="h-16 w-16 mx-auto bg-white rounded-3xl shadow-xl flex items-center justify-center">
                                        <UserIcon className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-black text-xl">Privacy Control</h4>
                                        <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed font-serif italic">
                                            &quot;Your data is encrypted and secure. Review our privacy policy to learn how we protect your journey.&quot;
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-destructive/20 bg-destructive/5 rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-10 pb-4">
                                    <CardTitle className="text-destructive font-black">Danger Zone</CardTitle>
                                </CardHeader>
                                <CardContent className="p-10 pt-0 space-y-6">
                                    <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed italic">
                                        Once you delete your account, there is no going back. Please be certain.
                                    </p>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="w-full h-14 rounded-2xl font-bold shadow-lg shadow-destructive/10">
                                                Terminate Account
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-[2.5rem] p-10 border-none shadow-3xl">
                                            <AlertDialogHeader className="space-y-4">
                                                <AlertDialogTitle className="text-3xl font-black">Hold on!</AlertDialogTitle>
                                                <AlertDialogDescription className="text-lg font-medium leading-relaxed font-serif italic">
                                                    Are you absolutely sure you want to leave us? This will permanently delete your
                                                    profile, booking history, and all account data.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="pt-8 gap-4">
                                                <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2">I changed my mind</AlertDialogCancel>
                                                <AlertDialogAction className="h-14 rounded-2xl font-bold bg-destructive hover:bg-destructive/90 text-white">Yes, terminate account</AlertDialogAction>
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
