

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
import { useEffect, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import type { User as UserProfile } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { uploadProfileImage } from '@/firebase/storage';
import { getStorage } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pencil, User } from 'lucide-react';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: z.string().min(10, 'Please enter a valid phone number.').optional(),
  bio: z.string().max(200, 'Bio must be less than 200 characters.').optional(),
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
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      bio: '',
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
        });
    }
  }, [user, userProfile, profileForm]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !firebaseApp) return;

    setIsUploading(true);
    try {
        const storage = getStorage(firebaseApp);
        const downloadURL = await uploadProfileImage(storage, user.uid, file);
        if (userDocRef) {
            await updateDoc(userDocRef, { profileImageUrl: downloadURL });
            toast({
                title: "Profile Picture Updated",
                description: "Your new profile picture has been saved.",
            });
        }
    } catch (error) {
        console.error("Error uploading image: ", error);
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "Could not upload your new profile picture.",
        });
    } finally {
        setIsUploading(false);
    }
  };

  function onProfileSubmit(values: ProfileFormValues) {
    if (!userDocRef) return;
    const { name, phone, bio } = values;
    updateDoc(userDocRef, { name, phone, bio });
    toast({
        title: "Profile Updated",
        description: "Your public profile has been successfully updated.",
    })
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
    return <div>Loading...</div>;
  }

  if (!user || !userProfile) {
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
                                <div className="flex items-center gap-6">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={userProfile.profileImageUrl} />
                                        <AvatarFallback>
                                            <User className="h-12 w-12 text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid gap-2">
                                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                            <Pencil className="mr-2 h-4 w-4"/> Edit DP
                                        </Button>
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
                                            <Input placeholder="your@email.com" {...field} disabled/>
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
                                <FormField
                                    control={profileForm.control}
                                    name="bio"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Bio</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Tell us a little bit about yourself" className="resize-none" {...field} />
                                        </FormControl>
                                         <FormDescription>A brief description of yourself shown on your profile.</FormDescription>
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

    

    



    