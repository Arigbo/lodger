

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase/provider';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { initiateEmailSignUp, errorEmitter, FirestorePermissionError } from '@/firebase';
import { countries, Country } from '@/lib/countries';
import type { Property } from '@/lib/definitions';


const formSchema = z.object({
    userType: z.enum(['student', 'landlord']),
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    whatsappUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
    twitterUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
    country: z.string().optional(),
    state: z.string().optional(),
    school: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
}).refine(data => {
    if (data.userType === 'landlord') return !!data.phone;
    return true;
}, { message: "Phone number is required.", path: ["phone"]})
.refine(data => {
    if (data.userType === 'student') return !!data.country;
    return true;
}, { message: "Country is required.", path: ["country"]})
.refine(data => {
    if (data.userType === 'student') return !!data.state;
    return true;
}, { message: "State is required.", path: ["state"]})
.refine(data => {
    if (data.userType === 'student') return !!data.school;
    return true;
}, { message: "School is required.", path: ["school"]});


type FormValues = z.infer<typeof formSchema>;

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [states, setStates] = useState<{name: string}[]>([]);
  const [schoolExists, setSchoolExists] = useState<boolean | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        userType: 'student',
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    },
  });

  const { setError, watch } = form;
  const userType = watch('userType');
  const countryValue = watch('country');
  const schoolValue = watch('school');

  // School check logic
  useEffect(() => {
    if (userType !== 'student' || !schoolValue || schoolValue.length < 3) {
      setSchoolExists(null);
      return;
    }

    const checkSchool = async () => {
        const propertiesRef = collection(firestore, 'properties');
        const q = query(propertiesRef, where('location.school', '==', schoolValue));
        const querySnapshot = await getDocs(q);
        setSchoolExists(!querySnapshot.empty);
    };

    const debounceTimeout = setTimeout(() => {
      checkSchool();
    }, 500);

    return () => clearTimeout(debounceTimeout);
  }, [schoolValue, firestore, userType]);


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
        { id: 1, name: 'Choose Account Type', fields: ['userType']},
        { id: 2, name: 'Account Details', fields: ['name', 'email', 'password', 'confirmPassword']},
        { id: 3, name: 'Location Information', fields: ['country', 'state', 'school']},
    ] :
    [
        { id: 1, name: 'Choose Account Type', fields: ['userType']},
        { id: 2, name: 'Account Details', fields: ['name', 'email', 'password', 'confirmPassword']},
        { id: 3, name: 'Contact Methods', fields: ['phone', 'whatsappUrl', 'twitterUrl']},
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
        setCurrentStep(step => step + 1);
     }
  }

  const onSubmit = async (values: FormValues) => {
    try {
        const userCredential = await initiateEmailSignUp(auth, values.email, values.password);
        const user = userCredential.user;

        const userData = {
            id: user.uid,
            name: values.name,
            email: values.email,
            role: values.userType,
            profileImageUrl: `https://i.pravatar.cc/150?u=${user.uid}`, // Placeholder avatar
            country: values.country || null,
            state: values.state || null,
            school: values.school || null,
            phone: values.phone || null,
            whatsappUrl: values.whatsappUrl || null,
            twitterUrl: values.twitterUrl || null,
        };
        
        const userDocRef = doc(firestore, "users", user.uid);
        await setDoc(userDocRef, userData).catch((serverError) => {
            // This is the important part: catching the setDoc specific error
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'create',
                requestResourceData: userData,
            });
            errorEmitter.emit('permission-error', permissionError);
            // We re-throw the original error to stop execution flow
            throw serverError;
        });

        toast({
            title: "Account Created!",
            description: "Welcome to Urban Nest. Redirecting you now...",
        });

        if (values.userType === 'landlord') {
            router.push('/landlord');
        } else {
            router.push('/student/properties');
        }
    } catch (error: any) {
        console.error("Error signing up:", error);

        // This will now only handle auth errors or re-thrown Firestore errors
        if (error.code === 'auth/email-already-in-use') {
            setError('email', {
                type: 'manual',
                message: 'This email address is already in use. Please try another one.',
            });
            setCurrentStep(2);
        } else if (!error.name.includes('FirestorePermissionError')) {
             // Avoid showing a toast for errors we are already handling globally
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: error.message || "There was a problem with your request.",
            });
        }
    }
  };


  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Create an Account</CardTitle>
          <CardDescription>Join our community of students and landlords.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4 mb-8">
                <Progress value={(currentStep / totalSteps) * 100} />
                <p className="text-center text-sm text-muted-foreground">
                    Step {currentStep} of {totalSteps}: {steps[currentStep-1].name}
                </p>
            </div>
            
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-2 gap-4"
                                >
                                    <FormItem>
                                    <RadioGroupItem value="student" id="student" className="peer sr-only" />
                                    <Label
                                        htmlFor="student"
                                        className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                    >
                                        Student
                                    </Label>
                                    </FormItem>
                                    <FormItem>
                                    <RadioGroupItem value="landlord" id="landlord" className="peer sr-only" />
                                    <Label
                                        htmlFor="landlord"
                                        className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
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
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="name@example.com" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}/>
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
                    )}/>
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
                    )}/>
                </div>
                
                {/* Step 3: Conditional Fields */}
                <div className={cn("space-y-6", currentStep === 3 ? "block" : "hidden")}>
                    {userType === 'landlord' && (
                        <>
                            <p className="text-sm text-muted-foreground">How can tenants contact you? Your email is already included.</p>
                             <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number (Required)</FormLabel>
                                    <FormControl><Input type="tel" placeholder="(123) 456-7890" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="whatsappUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>WhatsApp URL (Optional)</FormLabel>
                                    <FormControl><Input type="url" placeholder="https://wa.me/11234567890" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="twitterUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>X (Twitter) Profile URL (Optional)</FormLabel>
                                    <FormControl><Input type="url" placeholder="https://x.com/yourprofile" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </>
                    )}
                    {userType === 'student' && (
                        <>
                            <p className="text-sm text-muted-foreground">Help us find properties near your school.</p>
                             <FormField control={form.control} name="country" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger></FormControl>
                                        <SelectContent className="max-h-60">
                                            {countries.map(country => (
                                                <SelectItem key={country.iso2} value={country.name}>{country.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <div className="grid grid-cols-1 gap-4">
                                <FormField control={form.control} name="state" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>State/Province</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!countryValue}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select State/Province" /></SelectTrigger></FormControl>
                                            <SelectContent className="max-h-60">
                                                {states.map(state => (
                                                    <SelectItem key={state.name} value={state.name}>{state.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={form.control} name="school" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>School</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter your school name" {...field} />
                                        </FormControl>
                                        {schoolExists === true && (
                                            <p className="text-sm text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="h-4 w-4"/> Great! We have listings near this school.</p>
                                        )}
                                        {schoolExists === false && schoolValue && (
                                            <p className="text-sm text-amber-600 flex items-center gap-1 mt-1"><AlertCircle className="h-4 w-4"/> We don't have any listings for this school yet, but you can still sign up. Try using our location-based search after creating your account.</p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-12 flex justify-between">
                    <Button type="button" variant="outline" onClick={prevStep} className={cn(currentStep === 1 && "invisible")}>
                        <ArrowLeft className="mr-2 h-4 w-4"/> Back
                    </Button>
                    
                    {currentStep < totalSteps ? (
                        <Button type="button" onClick={nextStep}>
                        Next <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    ) : (
                        <Button type="submit">Create Account</Button>
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
    </div>
  );
}
