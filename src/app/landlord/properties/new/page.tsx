'use client';

import { useState, useEffect } from 'react';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Combobox } from '@/components/ui/combobox';
import { SchoolCombobox } from '@/components/school-combobox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { amenities as allAmenities } from '@/types';
import { cn, formatPrice } from '@/utils';
import { ArrowLeft, ArrowRight, UploadCloud, FileImage, FileText, Utensils, Sofa, Bath, BedDouble, Image as ImageIcon, Sparkles, Building, Loader2, Ruler, AlertCircle, Wifi, Car, AirVent, Dumbbell, Waves, Layout } from 'lucide-react';
import type { Property, UserProfile } from '@/types';
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, useFirebaseApp, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { countries } from '@/types/countries';
import { getCurrencyByCountry } from '@/utils/currencies';


function generateLeaseTextForTemplate(propertyData: Partial<FormValues>): string {
    return `LEASE AGREEMENT

This Lease Agreement (the "Agreement") is made and entered into on {{DATE_TODAY}}, by and between:

Landlord: {{LANDLORD_NAME}}
Tenant: {{TENANT_NAME}}

1. PROPERTY. Landlord agrees to lease to Tenant the property located at:
   {{PROPERTY_ADDRESS}}, {{PROPERTY_CITY}}, {{PROPERTY_STATE}}, {{PROPERTY_COUNTRY}}, {{PROPERTY_ZIP}}

2. TERM. The lease term will begin on {{LEASE_START_DATE}} and will terminate on {{LEASE_END_DATE}}.

3. RENT. Tenant agrees to pay Landlord the sum of {{MONTHLY_RENT}} per month, due on the 1st day of each month.

4. SECURITY DEPOSIT. Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of {{SECURITY_DEPOSIT}} as security for the faithful performance by Tenant of the terms hereof.

5. UTILITIES. Tenant is responsible for the payment of all utilities and services for the Property.

6. AMENITIES. The following amenities are included: {{AMENITIES}}.

7. RULES. Tenant agrees to abide by the following rules: {{RULES}}.

8. SIGNATURES. By signing below, the parties agree to the terms and conditions of this Lease Agreement.

Landlord: _________________________
Date: _________________________

Tenant: _________________________
Date: _________________________`;
}

// 5MB limit
const MAX_FILE_SIZE = 5000000;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const imageSchema = z.any()
    .refine((files) => !files || files.length === 0 || files.length === 1, "Only one image per slot.")
    .refine((files) => !files || files.length === 0 || files[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
        (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0]?.type),
        "Only .jpg, .jpeg, .png and .webp formats are supported."
    );

const formSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters.'),
    description: z.string().min(10, 'Description is required.'),
    price: z.coerce.number().positive('Price must be a positive number.'),
    currency: z.string().min(3, 'Currency is required.'),
    type: z.enum(['Apartment', 'House', 'Studio', 'Loft']),
    address: z.string().min(5, 'Address is required.'),
    country: z.string().min(2, 'Country is required.'),
    city: z.string().min(2, 'City is required.'),
    state: z.string().min(2, 'State is required.'),
    zip: z.string().min(2, 'Zip code is required.'),
    school: z.string().optional(),
    bedrooms: z.coerce.number().int().min(0, 'Bedrooms must be 0 or more.'),
    bathrooms: z.coerce.number().int().min(1, 'Must have at least 1 bathroom.'),
    area: z.coerce.number().positive('Area must be a positive number.'),
    amenities: z.array(z.string()).refine((value) => value.some((item) => item), {
        message: 'You have to select at least one amenity.',
    }),
    rules: z.string().optional(),
    leaseTemplate: z.string().min(100, 'Lease template must not be empty.'),
    kitchenImage: imageSchema,
    livingRoomImage: imageSchema,
    bathroomImage: imageSchema,
    bedroomImage: imageSchema,
    otherImage: imageSchema.optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const steps = [
    { id: 1, name: 'Basic Info & Price', fields: ['title', 'type', 'price', 'currency'] },
    { id: 2, name: 'Location & Details', fields: ['address', 'country', 'city', 'state', 'zip', 'school', 'bedrooms', 'bathrooms', 'area'] },
    { id: 3, name: 'Features & Description', fields: ['amenities', 'rules', 'description'] },
    { id: 4, name: 'Images & Lease', fields: ['leaseTemplate', 'kitchenImage', 'livingRoomImage', 'bathroomImage', 'bedroomImage', 'otherImage'] }
];

const FileUpload = ({ field, label, description, icon: Icon }: { field: any, label: string, description: string, icon: any }) => (
    <FormItem className="h-full">
        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
            <Icon className="h-3 w-3" /> {label}
        </FormLabel>
        <FormControl>
            <div className="mt-4 flex flex-col justify-center rounded-[2rem] border-2 border-dashed border-muted/20 px-6 py-10 hover:bg-primary/5 hover:border-primary/20 transition-all duration-500 group h-56 relative overflow-hidden">
                <div className="text-center relative z-10">
                    {field.value?.[0] ? (
                        <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <FileImage className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary truncate max-w-[200px]">{field.value[0].name}</p>
                                <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); field.onChange(null); }} className="text-destructive font-black text-[10px] uppercase tracking-widest h-auto p-0 hover:bg-transparent">Remove Image</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="h-16 w-16 rounded-2xl bg-muted/5 flex items-center justify-center mx-auto group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-500">
                                <UploadCloud className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <label
                                    htmlFor={field.name}
                                    className="relative cursor-pointer rounded-md font-black text-[10px] uppercase tracking-widest text-foreground hover:text-primary transition-colors"
                                >
                                    <span>Add {label}</span>
                                    <input id={field.name} name={field.name} type="file" className="sr-only"
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={(e) => field.onChange(e.target.files)}
                                    />
                                </label>
                                <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">MAX 5MB • PNG/JPG/WEBP</p>
                            </div>
                        </div>
                    )}
                </div>
                {/* Micro-animation background flash */}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-1000" />
            </div>
        </FormControl>
        <FormMessage />
    </FormItem>
);


export default function AddPropertyPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = steps.length;
    const router = useRouter();
    const firestore = useFirestore();
    const firebaseApp = useFirebaseApp();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
    const [hasPrefilled, setHasPrefilled] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            price: 0,
            address: '',
            country: '',
            city: '',
            state: '',
            zip: '',
            school: '',
            bedrooms: 1,
            bathrooms: 1,
            area: 0,
            amenities: [],
            rules: '',
            leaseTemplate: '',
            currency: 'USD',
        },
    });

    useEffect(() => {
        if (userProfile && !hasPrefilled) {
            const currentValues = form.getValues();
            if (!currentValues.country && !currentValues.city && !currentValues.state) {
                form.reset({
                    ...currentValues,
                    country: userProfile.country || '',
                    state: userProfile.state || '',
                    city: userProfile.city || '',
                });

                if (userProfile.country) {
                    setHasPrefilled(true);
                    toast({
                        title: "Location Updated",
                        description: "Your location settings have been updated.",
                    });
                }
            }
        }
    }, [userProfile, hasPrefilled, form, toast]);

    const selectedCountry = form.watch('country');
    useEffect(() => {
        if (selectedCountry) {
            const currency = getCurrencyByCountry(selectedCountry);
            form.setValue('currency', currency);
        }
    }, [selectedCountry, form]);

    const generateLeaseTemplate = () => {
        const propertyData = form.getValues();
        const leaseText = generateLeaseTextForTemplate(propertyData);
        form.setValue('leaseTemplate', leaseText);
        toast({
            title: "Lease Template Updated",
            description: "The lease template has been reset to defaults.",
        });
    };

    const nextStep = async () => {
        const fields = steps[currentStep - 1].fields;
        if (currentStep === 4) {
            const propertyData = form.getValues();
            const leaseText = generateLeaseTextForTemplate(propertyData);
            const currentLease = form.getValues('leaseTemplate');
            if (!currentLease) {
                form.setValue('leaseTemplate', leaseText);
            }
        }

        if (fields) {
            const output = await form.trigger(fields as (keyof FormValues)[], { shouldFocus: true });
            if (!output) return;
        }

        if (currentStep < totalSteps) {
            setCurrentStep(step => step + 1);
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(step => step - 1);
        }
    }

    const generateDescription = async () => {
        setIsGeneratingDescription(true);
        try {
            const formData = form.getValues();
            const response = await fetch('/api/generate-description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    type: formData.type,
                    bedrooms: formData.bedrooms,
                    bathrooms: formData.bathrooms,
                    area: formData.area,
                    amenities: formData.amenities,
                    city: formData.city,
                    state: formData.state,
                    country: formData.country,
                    school: formData.school,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate description');

            const { description } = await response.json();
            form.setValue('description', description);

            toast({
                title: "Description Created",
                description: "AI has generated a description for your property.",
            });
        } catch (error) {
            console.error('Error generating description:', error);
            toast({
                variant: "destructive",
                title: "Generation Failure",
                description: "Manual input required for description.",
            });
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    async function uploadImage(file: File, path: string): Promise<string> {
        const storage = getStorage(firebaseApp);
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    }

    async function onSubmit(values: FormValues) {
        if (!user) return;
        setIsSubmitting(true);

        try {
            const uploadedImageUrls: string[] = [];
            const timestamp = Date.now();
            const basePath = `properties/${user.uid}/${timestamp}`;

            const uploadField = async (fileList: any, name: string) => {
                if (fileList && fileList.length > 0) {
                    try {
                        const url = await uploadImage(fileList[0], `${basePath}/${name}`);
                        uploadedImageUrls.push(url);
                    } catch (e) {
                        console.error(`Failed to upload ${name}`, e);
                    }
                }
            };

            await uploadField(values.kitchenImage, 'kitchen');
            await uploadField(values.livingRoomImage, 'livingRoom');
            await uploadField(values.bathroomImage, 'bathroom');
            await uploadField(values.bedroomImage, 'bedroom');
            await uploadField(values.otherImage, 'other');

            const newPropertyData: Omit<Property, 'id'> = {
                title: values.title,
                description: values.description,
                price: values.price,
                type: values.type,
                location: {
                    address: values.address,
                    country: values.country,
                    city: values.city,
                    state: values.state,
                    zip: values.zip,
                    school: values.school,
                    ...(values.lat !== undefined && { lat: values.lat }),
                    ...(values.lng !== undefined && { lng: values.lng }),
                },
                bedrooms: values.bedrooms,
                bathrooms: values.bathrooms,
                area: values.area,
                currency: values.currency || 'USD',
                amenities: values.amenities,
                images: uploadedImageUrls,
                landlordId: user.uid,
                status: 'available',
                rules: values.rules ? values.rules.split(',').map(r => r.trim()).filter(Boolean) : [],
                leaseTemplate: values.leaseTemplate,
            };

            const docRef = await addDoc(collection(firestore, 'properties'), newPropertyData);
            await updateDoc(docRef, { id: docRef.id });

            toast({ title: "Property Added", description: "Your property is now listed in the marketplace." });
            router.push('/landlord/properties');
        } catch (e: any) {
            console.error("Error adding document: ", e);
            toast({
                variant: "destructive",
                title: "System Error",
                description: "Property submission failed. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-full overflow-x-hidden space-y-8 md:space-y-12 px-4 md:px-0 pb-32 animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 pb-6 md:pb-8 border-b-4 border-foreground/5">
                <div className="space-y-3 md:space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white shadow-lg border-2 border-primary/10">
                            <Building className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">ADD PROPERTY</p>
                    </div>
                    <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter text-foreground uppercase leading-[0.9]">
                        CREATE <br /> <span className="text-primary">PROPERTY</span>
                    </h1>
                    <p className="text-sm md:text-base lg:text-lg text-muted-foreground font-medium mt-4">
                        Define your property details and rental terms.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-primary/5 px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-[2rem] border-2 border-primary/10">
                        <p className="text-2xl md:text-3xl font-black text-primary">{Math.round((currentStep / steps.length) * 100)}%</p>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 blur-3xl rounded-full -z-10" />
                <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-500/5 blur-3xl rounded-full -z-10" />

                <div className="grid grid-cols-1 gap-8 md:gap-12 lg:grid-cols-4">
                    <div className="lg:col-span-1 space-y-3 md:space-y-4">
                        {steps.map((step) => (
                            <div
                                key={step.id}
                                className={cn(
                                    "flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 border-2",
                                    currentStep === step.id
                                        ? "bg-foreground text-white border-foreground shadow-xl scale-105"
                                        : currentStep > step.id
                                            ? "bg-white text-foreground border-foreground/5 opacity-60"
                                            : "bg-white/50 text-muted-foreground border-transparent opacity-40"
                                )}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs",
                                    currentStep === step.id ? "bg-primary text-white" : "bg-muted/20"
                                )}>
                                    {step.id}
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest">{step.name}</p>
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-3">
                        <Card className="rounded-2xl md:rounded-[3.5rem] border-2 border-foreground/5 bg-white shadow-3xl overflow-hidden p-4 sm:p-6 md:p-8 lg:p-12">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                                    {currentStep === 1 && (
                                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="space-y-8">
                                                <FormField
                                                    control={form.control}
                                                    name="title"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property Title</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="e.g., THE LUXE DOWNTOWN PENTHOUSE" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xl font-black uppercase tracking-tight" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="type"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property Type</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus:ring-0 text-xs font-black uppercase tracking-widest">
                                                                        <SelectValue placeholder="Select type" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase">
                                                                    <SelectItem value="Apartment">Apartment</SelectItem>
                                                                    <SelectItem value="House">House</SelectItem>
                                                                    <SelectItem value="Studio">Studio</SelectItem>
                                                                    <SelectItem value="Loft">Loft</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 2 && (
                                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="address"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-2">
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Address</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="123 PRESTIGE BOULEVARD" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="country"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Country</FormLabel>
                                                            <FormControl>
                                                                <Combobox
                                                                    options={countries.map((c) => ({ label: c.name, value: c.name }))}
                                                                    value={field.value}
                                                                    onChange={(value) => {
                                                                        field.onChange(value);
                                                                        form.setValue('state', ''); // Reset state when country changes
                                                                        form.setValue('school', ''); // Reset school when country changes
                                                                    }}
                                                                    placeholder="Select Country"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="state"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">State</FormLabel>
                                                            <FormControl>
                                                                <Combobox
                                                                    options={
                                                                        countries.find((c) => c.name === form.watch('country'))?.states.map((s) => ({
                                                                            label: s.name,
                                                                            value: s.name,
                                                                        })) || []
                                                                    }
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    placeholder="Select State"
                                                                    disabled={!form.watch('country')}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="city"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">City</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="CITY NAME" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="zip"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Zip Code</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="ZIP CODE" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Separator className="bg-muted/10" />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="price"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Monthly Rent</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0.00" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-2xl font-black text-primary" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="currency"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Currency</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus:ring-0 text-xs font-black uppercase tracking-widest">
                                                                        <SelectValue placeholder="CURRENCY" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase">
                                                                    <SelectItem value="USD">USD ($)</SelectItem>
                                                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                                                    <SelectItem value="NGN">NGN (₦)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Separator className="bg-muted/10" />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="bedrooms"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Bedrooms</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="bathrooms"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Bathrooms</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="area"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Area (sqft)</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 3 && (
                                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <FormField
                                                control={form.control}
                                                name="amenities"
                                                render={() => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-6 block">Select Amenities</FormLabel>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {[
                                                                { id: 'wifi', label: 'WiFi', icon: Wifi },
                                                                { id: 'parking', label: 'Parking', icon: Car },
                                                                { id: 'kitchen', label: 'Kitchen', icon: Utensils },
                                                                { id: 'ac', label: 'Air Conditioning', icon: AirVent },
                                                                { id: 'gym', label: 'Gym', icon: Dumbbell },
                                                                { id: 'pool', label: 'Pool', icon: Waves },
                                                            ].map((amenity) => (
                                                                <FormField
                                                                    key={amenity.id}
                                                                    control={form.control}
                                                                    name="amenities"
                                                                    render={({ field }) => {
                                                                        return (
                                                                            <FormItem className="flex flex-row items-center space-x-4 space-y-0 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-2 border-transparent bg-muted/10 overflow-hidden transition-all duration-300 hover:border-primary/20 hover:bg-white hover:shadow-xl">
                                                                                <div className="p-2 md:p-3 rounded-xl bg-white shadow-sm">
                                                                                    <amenity.icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                                                                                </div>
                                                                                <div className="flex-1 space-y-1">
                                                                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] cursor-pointer">{amenity.label}</FormLabel>
                                                                                </div>
                                                                                <FormControl>
                                                                                    <Checkbox
                                                                                        checked={field.value?.includes(amenity.id)}
                                                                                        onCheckedChange={(checked) => {
                                                                                            return checked
                                                                                                ? field.onChange([...field.value, amenity.id])
                                                                                                : field.onChange(
                                                                                                    field.value?.filter(
                                                                                                        (value) => value !== amenity.id
                                                                                                    )
                                                                                                )
                                                                                        }}
                                                                                        className="h-5 w-5 md:h-6 md:w-6 rounded-lg border-2"
                                                                                    />
                                                                                </FormControl>
                                                                            </FormItem>
                                                                        )
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Separator className="bg-muted/10" />
                                            <FormField
                                                control={form.control}
                                                name="rules"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property Rules</FormLabel>
                                                        <FormControl>
                                                            <Textarea placeholder="e.g., No smoking, Quiet hours after 10 PM" {...field} className="min-h-[120px] md:min-h-[150px] rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-medium p-4 md:p-6" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Separator className="bg-muted/10" />
                                            <FormField
                                                control={form.control}
                                                name="description"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property Description</FormLabel>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={generateDescription}
                                                                disabled={isGeneratingDescription}
                                                                className="rounded-full text-[10px] font-black uppercase tracking-widest"
                                                            >
                                                                {isGeneratingDescription ? (
                                                                    <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Generating...</>
                                                                ) : (
                                                                    <><Sparkles className="mr-2 h-3 w-3" /> AI Generate</>
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <FormControl>
                                                            <Textarea placeholder="Describe the essence of your property..." {...field} className="min-h-[150px] md:min-h-[200px] rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-medium p-4 md:p-6 leading-relaxed" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {currentStep === 4 && (
                                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <FormField
                                                control={form.control}
                                                name="leaseTemplate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Lease Template</FormLabel>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={generateLeaseTemplate}
                                                                className="rounded-full text-[10px] font-black uppercase tracking-widest"
                                                            >
                                                                Reset Template
                                                            </Button>
                                                        </div>
                                                        <FormControl>
                                                            <Textarea {...field} rows={12} className="rounded-2xl md:rounded-3xl bg-muted/5 border-2 border-dashed border-primary/20 focus-visible:border-primary focus-visible:bg-white text-[10px] md:text-[11px] font-mono leading-relaxed p-4 md:p-8 transition-all duration-500" />
                                                        </FormControl>
                                                        <FormDescription className="text-[10px] font-medium mt-4 opacity-60">
                                                            * This template will be used for all future lease agreements.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Separator className="bg-muted/10" />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="kitchenImage"
                                                    render={({ field }) => (
                                                        <FileUpload
                                                            field={field}
                                                            label="KITCHEN"
                                                            description="Capture the kitchen space."
                                                            icon={Utensils}
                                                        />
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="livingRoomImage"
                                                    render={({ field }) => (
                                                        <FileUpload
                                                            field={field}
                                                            label="LIVING ROOM"
                                                            description="Highlight the living area."
                                                            icon={Sofa}
                                                        />
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="bedroomImage"
                                                    render={({ field }) => (
                                                        <FileUpload
                                                            field={field}
                                                            label="BEDROOM"
                                                            description="Focus on comfort and ambiance."
                                                            icon={BedDouble}
                                                        />
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="bathroomImage"
                                                    render={({ field }) => (
                                                        <FileUpload
                                                            field={field}
                                                            label="BATHROOM"
                                                            description="Detail the finishes."
                                                            icon={Bath}
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 md:pt-12 mt-8 md:mt-12 border-t-2 border-muted/10">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={prevStep}
                                            disabled={currentStep === 1 || isSubmitting}
                                            className="w-full sm:w-auto h-12 md:h-16 px-6 md:px-10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-muted/20"
                                        >
                                            Previous
                                        </Button>
                                        {currentStep < steps.length ? (
                                            <Button
                                                type="button"
                                                onClick={nextStep}
                                                className="w-full sm:w-auto h-12 md:h-16 px-8 md:px-12 rounded-2xl bg-black text-white hover:bg-black/90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 text-[10px] font-black uppercase tracking-[0.2em] group"
                                            >
                                                Next <ArrowRight className="ml-2 md:ml-3 h-3 w-3 md:h-4 md:w-4 transition-transform group-hover:translate-x-1" />
                                            </Button>
                                        ) : (
                                            <Button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full sm:w-auto h-12 md:h-16 px-8 md:px-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 text-[10px] font-black uppercase tracking-[0.2em] group"
                                            >
                                                {isSubmitting ? 'Deploying...' : 'Deploy Asset'} <Loader2 className={cn("ml-2 md:ml-3 h-3 w-3 md:h-4 md:w-4 animate-spin", !isSubmitting && "hidden")} />
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            </Form>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
