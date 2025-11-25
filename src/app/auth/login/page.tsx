

'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { initiateEmailSignIn, errorEmitter, FirestorePermissionError, initiateGoogleSignIn } from '@/firebase';
import { useAuth, useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from '@firebase/firestore';
import type { UserProfile } from '@/types';

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm({ userType }: { userType: 'student' | 'landlord' }) {
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' }
    });

    const { isSubmitting } = form.formState;

    const handleSuccessfulLogin = async (userId: string, isNewUser: boolean = false) => {
        if (!firestore) return;

        const userDocRef = doc(firestore, 'users', userId);

        try {
            let userData: UserProfile | null = null;
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // This is a new user (either from email signup or first time Google login)
                const newUserProfileDataString = sessionStorage.getItem('newUserProfile');
                if (newUserProfileDataString) {
                    userData = JSON.parse(newUserProfileDataString) as UserProfile;
                    // Ensure the ID matches the authenticated user's ID
                    userData.id = userId;

                    // Non-blocking write with error handling
                    setDoc(userDocRef, userData)
                        .catch((serverError: unknown) => {
                            const permissionError = new FirestorePermissionError({
                                path: userDocRef.path,
                                operation: 'create',
                                requestResourceData: userData,
                            });
                            errorEmitter.emit('permission-error', permissionError);
                        });

                    sessionStorage.removeItem('newUserProfile');
                } else {
                    // This case might happen if a user signs up but then clears session storage
                    // before logging in. We can create a minimal profile.
                    // For Google sign-in, this logic is handled inside initiateGoogleSignIn.
                    toast({
                        variant: "destructive",
                        title: "User Profile Incomplete",
                        description: "Could not find profile data. Please contact support.",
                    });
                    return; // Stop the login process
                }
            } else {
                // Existing user
                userData = userDoc.data() as UserProfile;
            }

            // Redirect based on role
            if (userData?.role === 'landlord') {
                router.push('/landlord');
            } else {
                router.push('/student');
            }

        } catch (error: unknown) {
            console.error("Error during login process:", error);
            if (!(error instanceof FirestorePermissionError)) {
                toast({
                    variant: "destructive",
                    title: "Login Error",
                    description: "An unexpected error occurred while fetching your profile.",
                });
            }
        }
    }

    const onSubmit = async (values: LoginFormValues) => {
        if (!auth) {
            toast({ variant: 'destructive', title: 'Firebase not initialized.' });
            return;
        }
        try {
            const userCredential = await initiateEmailSignIn(auth, values.email, values.password);
            await handleSuccessfulLogin(userCredential.user.uid, true);
        } catch (error: any) {
            console.error("Sign-in error:", error);
            let errorMessage = "An unknown error occurred. Please try again.";
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = "Please enter a valid email address.";
                    break;
                case 'auth/user-disabled':
                    errorMessage = "This user account has been disabled.";
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = "Invalid email or password. Please try again.";
                    break;
                default:
                    errorMessage = error.message;
                    break;
            }
            toast({
                variant: "destructive",
                title: "Sign In Failed",
                description: errorMessage,
            });
        }
    };

    const handleGoogleSignIn = () => {
        // We pass handleSuccessfulLogin as the callback
        initiateGoogleSignIn(auth, userType, handleSuccessfulLogin, toast);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <Label htmlFor={`${userType}-email`}>Email</Label>
                            <FormControl>
                                <Input id={`${userType}-email`} type="email" placeholder="name@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center">
                                <Label htmlFor={`${userType}-password`}>Password</Label>
                                <Link href="/auth/forgot-password" className="ml-auto inline-block text-sm underline">
                                    Forgot your password?
                                </Link>
                            </div>
                            <FormControl>
                                <Input id={`${userType}-password`} type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In with Email
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
                    Sign In with Google
                </Button>
            </form>
        </Form>
    );
}

export default function LoginPage() {
    const [userType, setUserType] = useState<'student' | 'landlord'>('student');

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-3xl">Welcome Back</CardTitle>
                    <CardDescription>Sign in to continue to Urban Nest</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="student" onValueChange={(value) => setUserType(value as 'student' | 'landlord')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="student">Student</TabsTrigger>
                            <TabsTrigger value="landlord">Landlord</TabsTrigger>
                        </TabsList>
                        <TabsContent value="student" className="pt-6">
                            <LoginForm userType="student" />
                        </TabsContent>
                        <TabsContent value="landlord" className="pt-6">
                            <LoginForm userType="landlord" />
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/auth/signup" className="font-medium text-primary underline-offset-4 hover:underline">
                            Sign up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}


