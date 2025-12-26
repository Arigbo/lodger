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
import { ArrowLeft, ArrowRight, UploadCloud, FileImage, FileText, Utensils, Sofa, Bath, BedDouble, Image as ImageIcon, Sparkles, Building, Loader2, Ruler, AlertCircle } from 'lucide-react';
import type { Property, UserProfile } from '@/types';
import { format, addYears } from 'date-fns';
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
    { id: 1, name: 'Basic Info', fields: ['title', 'type'] },
    { id: 2, name: 'Location & Finance', fields: ['address', 'country', 'city', 'state', 'zip', 'school', 'price', 'currency'] },
    { id: 3, name: 'Specifications', fields: ['bedrooms', 'bathrooms', 'area'] },
    { id: 4, name: 'Amenities', fields: ['amenities', 'rules'] },
    { id: 5, name: 'Legal Blueprint', fields: ['leaseTemplate'] },
    { id: 6, name: 'Visual Assets', fields: ['kitchenImage', 'livingRoomImage', 'bathroomImage', 'bedroomImage', 'otherImage'] },
    { id: 7, name: 'Narrative', fields: ['description'] },
    { id: 8, name: 'Validation' }
];

const FileUpload = ({ field, label, description, icon: Icon }: { field: any, label: string, description: string, icon: any }) => (
    <FormItem className="h-full">
        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic flex items-center gap-2">
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
                                <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); field.onChange(null); }} className="text-destructive font-black text-[10px] uppercase tracking-widest h-auto p-0 hover:bg-transparent">Purge Asset</Button>
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
                                    <span>Integrate {label}</span>
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
                        title: "Intelligence Cached",
                        description: "Your profile coordinates have been synchronized.",
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
            title: "Legal Blueprint Re-initialized",
            description: "The lease protocol has been reset to dynamic defaults.",
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
                title: "Linguistic Logic Generated",
                description: "AI has synthesized a professional descriptor for your asset.",
            });
        } catch (error) {
            console.error('Error generating description:', error);
            toast({
                variant: "destructive",
                title: "Generation Failure",
                description: "Manual input required for description protocol.",
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

            toast({ title: "Asset Deployed", description: "Your property has been integrated into the marketplace." });
            router.push('/landlord/properties');
        } catch (e: any) {
            console.error("Error adding document: ", e);
            toast({
                variant: "destructive",
                title: "System Error",
                description: "Asset deployment protocol interrupted.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-12 pb-32 animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-4 border-foreground/5">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white shadow-lg border-2 border-primary/10">
                            <Building className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">ASSET DEPLOYMENT</p>
                    </div>
                    <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">
                        INITIATE <span className="text-primary italic">HOLDING</span>
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium italic font-serif">
                        &quot;Configuring the structural and financial parameters of your new property asset.&quot;
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-primary/5 px-8 py-4 rounded-[2rem] border-2 border-primary/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 italic">Protocol Progress</p>
                        <p className="text-3xl font-black text-primary">{Math.round((currentStep / totalSteps) * 100)}%</p>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 blur-3xl rounded-full -z-10" />
                <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-500/5 blur-3xl rounded-full -z-10" />

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    <div className="lg:col-span-1 space-y-4">
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
                        <Card className="rounded-[3.5rem] border-2 border-foreground/5 bg-white shadow-3xl overflow-hidden p-8 md:p-12">
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Asset Title</FormLabel>
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Structural Category</FormLabel>
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Geographic Coordinates (Address)</FormLabel>
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Sovereign State</FormLabel>
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Administrative Region</FormLabel>
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Urban Sector</FormLabel>
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Postal Identification</FormLabel>
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Economic Yield (Price)</FormLabel>
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Monetary Protocol</FormLabel>
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
                                        </div>
                                    )}

                                    {currentStep === 3 && (
                                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="bedrooms"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Sleeping Quarters</FormLabel>
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Sanitary Suites</FormLabel>
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
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Spatial Dimension (sqft)</FormLabel>
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

                                    {currentStep === 4 && (
                                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {[
                                                    { id: 'wifi', label: 'Global Connectivity (WiFi)', icon: Wifi },
                                                    { id: 'parking', label: 'Logistic Bay (Parking)', icon: Car },
                                                    { id: 'kitchen', label: 'Culinary Laboratory (Kitchen)', icon: Utensils },
                                                    { id: 'ac', label: 'Atmospheric Control (AC)', icon: AirVent },
                                                    { id: 'gym', label: 'Kinetic Studio (Gym)', icon: Dumbbell },
                                                    { id: 'pool', label: 'Hydro-Enclosure (Pool)', icon: Waves },
                                                ].map((amenity) => (
                                                    <FormField
                                                        key={amenity.id}
                                                        control={form.control}
                                                        name={amenity.id as any}
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-row items-center space-x-4 space-y-0 p-6 rounded-[2rem] border-2 border-transparent bg-muted/10 overflow-hidden transition-all duration-300 hover:border-primary/20 hover:bg-white hover:shadow-xl">
                                                                <div className="p-3 rounded-xl bg-white shadow-sm">
                                                                    <amenity.icon className="h-5 w-5 text-primary" />
                                                                </div>
                                                                <div className="flex-1 space-y-1">
                                                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em]">{amenity.label}</FormLabel>
                                                                </div>
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value}
                                                                        onCheckedChange={field.onChange}
                                                                        className="h-6 w-6 rounded-lg border-2"
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <Separator className="bg-muted/10" />
                                            <FormField
                                                control={form.control}
                                                name="rules"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Conduct Protocol (Rules)</FormLabel>
                                                        <FormControl>
                                                            <Textarea placeholder="e.g., No smoking, Quiet hours after 10 PM" {...field} className="min-h-[150px] rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest p-6" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {currentStep === 5 && (
                                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="space-y-8">
                                                <FormField
                                                    control={form.control}
                                                    name="description"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Property Narrative (Description)</FormLabel>
                                                            <FormControl>
                                                                <Textarea placeholder="Describe the essence of your property..." {...field} className="min-h-[150px] rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest p-6 leading-relaxed" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <Separator className="bg-muted/10" />
                                                <FormField
                                                    control={form.control}
                                                    name="leaseTemplate"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Monetary & Legal Framework (Lease Template)</FormLabel>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={generateLeaseTemplate}
                                                                    className="rounded-full text-[10px] font-black uppercase tracking-widest"
                                                                >
                                                                    Refresh Protocol
                                                                </Button>
                                                            </div>
                                                            <FormControl>
                                                                <Textarea {...field} rows={15} className="rounded-3xl bg-muted/5 border-2 border-dashed border-primary/20 focus-visible:border-primary focus-visible:bg-white text-[11px] font-mono leading-relaxed p-8 transition-all duration-500" />
                                                            </FormControl>
                                                            <FormDescription className="text-[10px] font-medium italic mt-4 opacity-60">
                                                                * This protocol will be cached as the immutable foundation for all future tenancy agreements.
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 6 && (
                                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="kitchenImage"
                                                    render={({ field }) => (
                                                        <FileUpload
                                                            field={field}
                                                            label="CULINARY ZONE"
                                                            description="Capture the aesthetic and utility of the kitchen space."
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
                                                            label="SOCIAL ATRIUM"
                                                            description="Highlight the volume and light of the living area."
                                                            icon={Layout}
                                                        />
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="bedroomImage"
                                                    render={({ field }) => (
                                                        <FileUpload
                                                            field={field}
                                                            label="PRIVATE QUARTERS"
                                                            description="Focus on comfort, storage, and restful ambiance."
                                                            icon={Layout}
                                                        />
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="bathroomImage"
                                                    render={({ field }) => (
                                                        <FileUpload
                                                            field={field}
                                                            label="SANITARY SUITE"
                                                            description="Detail the premium finishes and cleanliness."
                                                            icon={Layout}
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 7 && (
                                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="p-10 rounded-[2.5rem] bg-black text-white shadow-2xl space-y-10 border border-white/10 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                                    <Sparkles className="h-32 w-32" />
                                                </div>
                                                <div className="relative space-y-6">
                                                    <h3 className="text-4xl font-black uppercase tracking-tighter leading-none italic">Asset Certification Review</h3>
                                                    <p className="text-white/60 text-xs font-black uppercase tracking-[0.2em]">Finalize deployment configurations</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                                                    <div className="space-y-8">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 italic">Strategic Title</p>
                                                            <p className="text-2xl font-black uppercase tracking-tight">{form.getValues('title')}</p>
                                                            <p className="text-white/60 text-xs mt-2 font-medium">{form.getValues('address')}, {form.getValues('city')}</p>
                                                        </div>
                                                        <Separator className="bg-white/10" />
                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Economic Yield</p>
                                                                <p className="text-xl font-black">{form.getValues('currency')} {form.getValues('price')}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Structure Type</p>
                                                                <p className="text-xl font-black uppercase tracking-tight">{form.getValues('type')}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-8 p-8 rounded-3xl bg-white/5 border border-white/10">
                                                        <div className="grid grid-cols-2 gap-8">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 italic">Living Quarters</p>
                                                                <p className="text-2xl font-black">{form.getValues('bedrooms')} BED</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 italic">Sanitary Suites</p>
                                                                <p className="text-2xl font-black">{form.getValues('bathrooms')} BATH</p>
                                                            </div>
                                                        </div>
                                                        <Separator className="bg-white/10" />
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 italic">Spatial Volume</p>
                                                            <p className="text-3xl font-black">{form.getValues('area')} SQFT</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-12 mt-12 border-t-2 border-muted/10">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={prevStep}
                                            disabled={currentStep === 1 || isSubmitting}
                                            className="h-16 px-10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-muted/20"
                                        >
                                            Previous Phase
                                        </Button>
                                        {currentStep < steps.length ? (
                                            <Button
                                                type="button"
                                                onClick={nextStep}
                                                className="h-16 px-12 rounded-2xl bg-black text-white hover:bg-black/90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 text-[10px] font-black uppercase tracking-[0.2em] group"
                                            >
                                                Next Phase <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                            </Button>
                                        ) : (
                                            <Button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="h-16 px-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 text-[10px] font-black uppercase tracking-[0.2em] group"
                                            >
                                                {isSubmitting ? 'Deploying...' : 'Deploy Asset'} <Loader2 className={cn("ml-3 h-4 w-4 animate-spin", !isSubmitting && "hidden")} />
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
