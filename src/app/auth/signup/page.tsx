'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import Link from 'next/link';
import { Eye, EyeOff, ArrowLeft, ArrowRight, UploadCloud, UserCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/utils';
import { useAuth, useFirebaseApp, useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { initiateEmailSignUp } from '@/firebase';
import { countries, Country } from '@/types/countries';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { schools } from '@/data/schools';
import { SchoolCombobox } from '@/components/school-combobox';


const formSchema = z.object({
    userType: z.enum(['student', 'landlord']),
    name: z.string().min(2, "Name must be at least 2 characters."),
    legalName: z.string().min(2, "Legal Name is required for contracts."),
    email: z.string().email("Invalid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    whatsappUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
    twitterUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
    country: z.string().optional(),
    state: z.string().optional(),
    school: z.string().optional(),
    profileImage: z.any().optional(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
}).refine(data => {
    if (data.userType === 'landlord') return !!data.phone;
    return true;
}, { message: "Phone number is required.", path: ["phone"] })
    .refine(data => {
        if (data.userType === 'student') return !!data.country;
        return true;
    }, { message: "Country is required.", path: ["country"] })
    .refine(data => {
        if (data.userType === 'student') return !!data.state;
        return true;
    }, { message: "State is required.", path: ["state"] })
    .refine(data => {
        if (data.userType === 'student') return !!data.school;
        return true;
    }, { message: "School is required.", path: ["school"] });


type FormValues = z.infer<typeof formSchema>;

export default function SignupPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const router = useRouter();
    const auth = useAuth();
    const firestore = useFirestore(); // Get Firestore instance
    const firebaseApp = useFirebaseApp();
    const { toast } = useToast();
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [states, setStates] = useState<{ name: string }[]>([]);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            userType: 'student',
            name: '',
            legalName: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    const { setError, watch } = form;
    const userType = watch('userType');
    const countryValue = watch('country');

    useEffect(() => {
        if (countryValue) {
            const countryData = countries.find(c => c.name === countryValue);
            setSelectedCountry(countryData || null);
            setStates(countryData?.states || []);
        } else {
            setSelectedCountry(null);
            setStates([]);
        }
    }, [countryValue]);

    const steps = userType === 'student' ?
        [
            { id: 1, name: 'Choose Account Type', fields: ['userType'] },
            { id: 2, name: 'Account Details', fields: ['name', 'legalName', 'email', 'password', 'confirmPassword'] },
            { id: 3, name: 'Location Information', fields: ['country', 'state', 'school'] },
            { id: 4, name: 'Profile Photo', fields: ['profileImage'] },
        ] :
        [
            { id: 1, name: 'Choose Account Type', fields: ['userType'] },
            { id: 2, name: 'Account Details', fields: ['name', 'legalName', 'email', 'password', 'confirmPassword'] },
            { id: 3, name: 'Location & Contact', fields: ['country', 'state', 'phone', 'whatsappUrl', 'twitterUrl'] },
            { id: 4, name: 'Profile Photo', fields: ['profileImage'] },
        ];
    const totalSteps = steps.length;


    const nextStep = async () => {
        const fields = steps[currentStep - 1].fields;
        const output = await form.trigger(fields as (keyof FormValues)[], { shouldFocus: true });

        if (!output) return;

        if (currentStep < totalSteps) {
            setCurrentStep(step => step + 1);
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(step => step - 1);
        }
    }

    const onSubmit = async (values: FormValues) => {
        // Prevent premature submission if triggered (e.g., by Enter key) before the final step
        if (currentStep < totalSteps) {
            setCurrentStep(step => step + 1);
            return;
        }

        if (!auth || !firestore) {
            toast({
                variant: "destructive",
                title: "System Error",
                description: "Firebase services are not available.",
            });
            return;
        }

        try {
            // 1. Initiate sign up (creates auth user)
            const userCredential = await initiateEmailSignUp(auth, values.email, values.password);
            const uid = userCredential.user.uid;

            let profileImageUrl = null;

            // 2. Upload profile image if selected
            if (values.profileImage && values.profileImage.length > 0) {
                try {
                    const file = values.profileImage[0];
                    if (file.size > 1024 * 1024) {
                        toast({
                            variant: "destructive",
                            title: "Image too large",
                            description: "Profile picture must be less than 1MB. Account created without image.",
                        });
                        // Don't throw, just skip upload
                    } else {
                        const storage = getStorage(firebaseApp);
                        // Use a clean path: users/{uid}/profile_{timestamp}
                        const storageRef = ref(storage, `users/${uid}/profile_${Date.now()}`);
                        const snapshot = await uploadBytes(storageRef, file);
                        profileImageUrl = await getDownloadURL(snapshot.ref);
                    }
                } catch (uploadError) {
                    console.error("Failed to upload profile image:", uploadError);
                    toast({
                        variant: "destructive",
                        title: "Image Upload Failed",
                        description: "Could not upload profile picture. Using default avatar.",
                    });
                    // Proceed with default image, don't block account creation
                }
            }

            // 3. Create Firestore User Document directly
            const userData = {
                id: uid,
                name: values.name,
                legalName: values.legalName,
                email: values.email,
                role: values.userType,
                profileImageUrl: profileImageUrl,
                country: values.country || null,
                state: values.state || null,
                school: values.school || null,
                phone: values.phone || null,
                whatsappUrl: values.whatsappUrl || null,
                twitterUrl: values.twitterUrl || null,
                bio: '',
                createdAt: new Date().toISOString(),
            };

            await setDoc(doc(firestore, 'users', uid), userData);

            // Create Welcome Notification
            /*
            await sendNotification({
               toUserId: uid,
               type: 'WELCOME',
               firestore: firestore,
               link: '/profile' 
            });
            */
            toast({
                title: "Account Created!",
                description: "Welcome to Lodger! Please sign in.",
            });

            router.push('/auth/login');

        } catch (error: any) {
            console.error("Signup error:", error);
            if (error.code === 'auth/email-already-in-use') {
                setError('email', {
                    type: 'manual',
                    message: 'This email address is already in use. Please try another one.',
                });
                setCurrentStep(2); // Go back to the relevant step
            } else if (error.code && error.code.includes('permission-denied')) {
                toast({
                    variant: "destructive",
                    title: "Access Denied",
                    description: "Your account was authenticated but we couldn't create your profile due to permission rules. Please contact support.",
                });
            } else {
                // Ensure we catch non-Firebase errors too
                toast({
                    variant: "destructive",
                    title: "Registration Failed",
                    description: error.message || "There was a problem creating your account. Please try again.",
                });
            }
        }
    };


    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-3xl">Create an Account</CardTitle>
                    <CardDescription>Join our community of students and landlords.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 mb-8">
                        <Progress value={(currentStep / totalSteps) * 100} />
                        <p className="text-center text-sm text-muted-foreground">
                            Step {currentStep} of {totalSteps}: {steps[currentStep - 1].name}
                        </p>
                    </div>

                    <FormProvider {...form}>
                        {/* Prevent implicit submission on Enter by not having a submit button inside unless it's the last step */}
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            // Block implicit submission (e.g., Enter key) on the final step.
                            // The final step should only be submitted via the "Create Account" button.
                            if (currentStep === totalSteps) {
                                return;
                            }
                            form.handleSubmit(onSubmit)(e);
                        }} className="space-y-8">

                            {/* Step 1: User Type */}
                            <div className={cn(currentStep === 1 ? "block" : "hidden")}>
                                <FormField
                                    control={form.control}
                                    name="userType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>I am a...</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={(value) => {
                                                        field.onChange(value);
                                                        // Reset conditional fields when user type changes
                                                        form.reset({
                                                            ...form.getValues(),
                                                            userType: value as 'student' | 'landlord',
                                                            phone: '',
                                                            whatsappUrl: '',
                                                            twitterUrl: '',
                                                            country: '',
                                                            state: '',
                                                            school: '',
                                                        });
                                                    }}
                                                    defaultValue={field.value}
                                                    className="grid grid-cols-2 gap-4"
                                                >
                                                    <FormItem>
                                                        <RadioGroupItem value="student" id="student" className="peer sr-only" />
                                                        <Label
                                                            htmlFor="student"
                                                            className="flex h-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                                        >
                                                            Student
                                                        </Label>
                                                    </FormItem>
                                                    <FormItem>
                                                        <RadioGroupItem value="landlord" id="landlord" className="peer sr-only" />
                                                        <Label
                                                            htmlFor="landlord"
                                                            className="flex h-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                                        >
                                                            Landlord
                                                        </Label>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Step 2: Account Details */}
                            <div className={cn("space-y-6", currentStep === 2 ? "block" : "hidden")}>
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name (Display Name)</FormLabel>
                                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="legalName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Legal Name (For Contracts)</FormLabel>
                                        <FormControl><Input placeholder="Johnathan Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl><Input type="email" placeholder="name@example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} {...field} />
                                                <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOff /> : <Eye />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showConfirmPassword ? 'text' : 'password'} {...field} />
                                                <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            {/* Step 3: Conditional Fields */}
                            <div className={cn("space-y-6", currentStep === 3 ? "block" : "hidden")}>
                                {userType === 'landlord' && (
                                    <>
                                        <p className="text-sm text-muted-foreground">Tell us where you're based and how tenants can contact you.</p>
                                        <FormField control={form.control} name="country" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country</FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        options={countries.map(c => ({ label: c.name, value: c.name }))}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Select Country"
                                                        emptyText="No country found."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="state" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>State/Province</FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        options={states.map(s => ({ label: s.name, value: s.name }))}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Select State"
                                                        emptyText="No state found."
                                                        disabled={!countryValue}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="phone" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone Number (Required)</FormLabel>
                                                <FormControl><Input type="tel" placeholder="(123) 456-7890" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="whatsappUrl" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>WhatsApp URL (Optional)</FormLabel>
                                                <FormControl><Input type="url" placeholder="https://wa.me/11234567890" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="twitterUrl" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>X (Twitter) Profile URL (Optional)</FormLabel>
                                                <FormControl><Input type="url" placeholder="https://x.com/yourprofile" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </>
                                )}
                                {userType === 'student' && (
                                    <>
                                        <p className="text-sm text-muted-foreground">Help us find properties near your school.</p>
                                        <FormField control={form.control} name="country" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country</FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        options={countries.map(c => ({ label: c.name, value: c.name }))}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Select Country"
                                                        emptyText="No country found."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <div className="grid grid-cols-1 gap-4">
                                            <FormField control={form.control} name="state" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>State/Province</FormLabel>
                                                    <FormControl>
                                                        <Combobox
                                                            options={states.map(s => ({ label: s.name, value: s.name }))}
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            placeholder="Select State"
                                                            emptyText="No state found."
                                                            disabled={!countryValue}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="school" render={({ field }) => (
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
                                    </>
                                )}
                            </div>

                            {/* Step 4: Profile Photo */}
                            <div className={cn("space-y-6", currentStep === 4 ? "block" : "hidden")}>
                                <div className="text-center">
                                    <h3 className="font-headline text-lg font-semibold">Upload Profile Picture</h3>
                                    <p className="text-sm text-muted-foreground">Add a photo to help others recognize you.</p>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="profileImage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="mt-4 flex flex-col justify-center items-center rounded-lg border border-dashed border-input py-12">
                                                    {field.value?.[0] ? (
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="h-32 w-32 rounded-full overflow-hidden bg-secondary">
                                                                <img src={URL.createObjectURL(field.value[0])} alt="Profile Preview" className="h-full w-full object-cover" />
                                                            </div>
                                                            <p className="text-sm font-medium text-green-600 truncate max-w-[200px]">{field.value[0].name}</p>
                                                            <Button type="button" variant="outline" size="sm" onClick={(e) => { e.preventDefault(); field.onChange(null); }}>Change Photo</Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="h-32 w-32 rounded-full bg-secondary flex items-center justify-center mb-4">
                                                                <UserCircle className="h-16 w-16 text-muted-foreground" />
                                                            </div>
                                                            <label
                                                                htmlFor="profileImage"
                                                                className="relative cursor-pointer rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
                                                            >
                                                                <span>Choose Photo</span>
                                                                <input id="profileImage" name="profileImage" type="file" className="sr-only"
                                                                    accept="image/png, image/jpeg, image/webp"
                                                                    onChange={(e) => field.onChange(e.target.files)}
                                                                />
                                                            </label>
                                                            <p className="text-xs text-muted-foreground mt-4">PNG, JPG up to 5MB</p>
                                                        </>
                                                    )}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="mt-12 flex justify-between">
                                <Button type="button" variant="outline" onClick={prevStep} className={cn(currentStep === 1 && "invisible")}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>

                                {currentStep < totalSteps ? (
                                    <Button type="button" onClick={nextStep}>
                                        Next <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={form.handleSubmit(onSubmit)}
                                        disabled={form.formState.isSubmitting}
                                    >
                                        {form.formState.isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating Account...
                                            </>
                                        ) : 'Create Account'}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </FormProvider>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <p className="text-center text-xs text-muted-foreground">
                        By creating an account, you agree to our{' '}
                        <Link href="/terms" className="underline hover:text-primary">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="underline hover:text-primary">
                            Privacy Policy
                        </Link>
                        .
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div >
    );
}
