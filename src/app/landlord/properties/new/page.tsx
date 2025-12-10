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
import { ArrowLeft, ArrowRight, UploadCloud, FileImage, FileText, Utensils, Sofa, Bath, BedDouble, Image as ImageIcon } from 'lucide-react';
import type { Property, UserProfile } from '@/types';
import { format } from 'date-fns';
import { add } from 'date-fns/add';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, useFirebaseApp, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { countries } from '@/types/countries';


function generateLeaseTextForTemplate(propertyData: Partial<FormValues>): string {
    const leaseStartDate = new Date();
    const leaseEndDate = add(leaseStartDate, { years: 1 });

    const landlordName = "[Landlord Name]"; // Placeholder
    const tenantName = "[Tenant Name]"; // Placeholder

    const rules = typeof propertyData.rules === 'string'
        ? propertyData.rules.split(',').map(r => r.trim()).filter(Boolean)
        : [];

    return `
    LEASE AGREEMENT

    This Lease Agreement (the "Agreement") is made and entered into on ${format(new Date(), 'MMMM do, yyyy')}, by and between:

    Landlord: ${landlordName}
    Tenant: ${tenantName}

    1. PROPERTY. Landlord agrees to lease to Tenant the property located at:
       ${propertyData.address || '[Address]'}, ${propertyData.city || '[City]'}, ${propertyData.state || '[State]'}, ${propertyData.country || '[Country]'}, ${propertyData.zip || '[ZIP]'}

    2. TERM. The lease term will begin on ${format(leaseStartDate, 'MMMM do, yyyy')} and will terminate on ${format(leaseEndDate, 'MMMM do, yyyy')}.

    3. RENT. Tenant agrees to pay Landlord the sum of ${formatPrice(propertyData.price || 0)} per month, due on the 1st day of each month.

    4. SECURITY DEPOSIT. Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of ${formatPrice(propertyData.price || 0)} as security for the faithful performance by Tenant of the terms hereof.

    5. UTILITIES. Tenant is responsible for the payment of all utilities and services for the Property.

    6. AMENITIES. The following amenities are included: ${(propertyData.amenities || []).join(', ')}.

    7. RULES. Tenant agrees to abide by the following rules: ${rules.join(', ')}.

    8. SIGNATURES. By signing below, the parties agree to the terms and conditions of this Lease Agreement.

    Landlord: _________________________
    Date: _________________________

    Tenant: _________________________
    Date: _________________________
  `;
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
    type: z.enum(['Apartment', 'House', 'Studio', 'Loft']),
    address: z.string().min(5, 'Address is required.'),
    country: z.string().min(2, 'Country is required.'),
    city: z.string().min(2, 'City is required.'),
    state: z.string().min(2, 'State is required.'),
    zip: z.string().min(5, 'ZIP code is required.'),
    bedrooms: z.coerce.number().int().min(1, 'Must have at least 1 bedroom.'),
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
});

type FormValues = z.infer<typeof formSchema>;

const steps = [
    { id: 1, name: 'Basic Information', fields: ['title', 'description', 'price', 'type'] },
    { id: 2, name: 'Location', fields: ['address', 'country', 'city', 'state', 'zip'] },
    { id: 3, name: 'Property Details', fields: ['bedrooms', 'bathrooms', 'area'] },
    { id: 4, name: 'Amenities & Rules', fields: ['amenities', 'rules'] },
    { id: 5, name: 'Lease Template', fields: ['leaseTemplate'] },
    { id: 6, name: 'Upload Photos', fields: ['kitchenImage', 'livingRoomImage', 'bathroomImage', 'bedroomImage', 'otherImage'] },
    { id: 7, name: 'Review' }
];

const FileUpload = ({ field, label, description, icon: Icon }: { field: any, label: string, description: string, icon: any }) => (
    <FormItem className="h-full">
        <FormLabel className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4" />
            {label}
        </FormLabel>
        {/* <FormDescription>{description}</FormDescription> */}
        <FormControl>
            <div className="mt-2 flex flex-col justify-center rounded-lg border border-dashed border-input px-6 py-10 hover:bg-accent/50 transition-colors h-48">
                <div className="text-center">
                    {field.value?.[0] ? (
                        <div className="flex flex-col items-center gap-2">
                            <FileImage className="mx-auto h-12 w-12 text-green-500" />
                            <p className="text-sm font-medium text-green-600 truncate max-w-[200px]">{field.value[0].name}</p>
                            <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); field.onChange(null); }} className="text-destructive h-auto p-0 hover:bg-transparent">Remove</Button>
                        </div>
                    ) : (
                        <>
                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                            <div className="mt-4 text-sm text-muted-foreground">
                                <label
                                    htmlFor={field.name}
                                    className="relative cursor-pointer rounded-md font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:text-primary/80"
                                >
                                    <span>Upload {label}</span>
                                    <input id={field.name} name={field.name} type="file" className="sr-only"
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={(e) => field.onChange(e.target.files)}
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">PNG, JPG up to 5MB</p>
                        </>
                    )}
                </div>
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

    // Fetch user profile for pre-filling location
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
            bedrooms: 1,
            bathrooms: 1,
            area: 0,
            amenities: [],
            rules: '',
            leaseTemplate: '',
        },
    });

    // Auto-fill location from profile
    useEffect(() => {
        if (userProfile && !hasPrefilled) {
            // Only autofill if the fields are empty to avoid overwriting user input if they navigated back
            const currentValues = form.getValues();
            if (!currentValues.country && !currentValues.city && !currentValues.state) {
                form.reset({
                    ...currentValues,
                    country: userProfile.country || '',
                    state: userProfile.state || '',
                    city: userProfile.city || '', // Assuming city might be in profile, strict check later
                });

                // If the profile has these values, set the prefilled flag
                if (userProfile.country) {
                    setHasPrefilled(true);
                    toast({
                        title: "Location Prefilled",
                        description: "We've used your profile location as a starting point.",
                    });
                }
            }
        }
    }, [userProfile, hasPrefilled, form, toast]);


    const nextStep = async () => {
        const fields = steps[currentStep - 1].fields;

        // When moving to the lease step, generate the template text
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

    async function uploadImage(file: File, path: string): Promise<string> {
        const storage = getStorage(firebaseApp);
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return getDownloadURL(snapshot.ref);
    }

    async function onSubmit(values: FormValues) {
        if (!user) {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "You must be logged in to create a property.",
            });
            return;
        }

        setIsSubmitting(true);
        console.log("Submitting form...", values);

        try {
            const uploadedImageUrls: string[] = [];
            const timestamp = Date.now();
            const basePath = `properties/${user.uid}/${timestamp}`;

            // Helper to upload if exists
            const uploadField = async (fileList: any, name: string) => {
                if (fileList && fileList.length > 0) {
                    try {
                        const url = await uploadImage(fileList[0], `${basePath}/${name}`);
                        uploadedImageUrls.push(url);
                    } catch (e) {
                        console.error(`Failed to upload ${name}`, e);
                        toast({
                            variant: "destructive",
                            title: "Upload Warning",
                            description: `Failed to upload ${name} image.`,
                        });
                    }
                }
            };

            await uploadField(values.kitchenImage, 'kitchen');
            await uploadField(values.livingRoomImage, 'livingRoom');
            await uploadField(values.bathroomImage, 'bathroom');
            await uploadField(values.bedroomImage, 'bedroom');
            await uploadField(values.otherImage, 'other');

            // Fallback if no images uploaded
            if (uploadedImageUrls.length === 0) {
                uploadedImageUrls.push("https://images.unsplash.com/photo-1515263487990-61b07816b324?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D");
            }

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
                },
                bedrooms: values.bedrooms,
                bathrooms: values.bathrooms,
                area: values.area,
                amenities: values.amenities,
                images: uploadedImageUrls,
                landlordId: user.uid,
                status: 'available' as 'available' | 'occupied',
                rules: values.rules ? values.rules.split(',').map(r => r.trim()).filter(Boolean) : [],
                leaseTemplate: values.leaseTemplate,
            };

            const docRef = await addDoc(collection(firestore, 'properties'), newPropertyData);
            // Now update the document with its own ID
            await updateDoc(docRef, { id: docRef.id });

            toast({
                title: "Property Listed!",
                description: `${values.title} is now available for rent.`,
            });
            router.push('/landlord/properties');
        } catch (e: unknown) {
            console.error("Error adding document: ", e);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not list property. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-3xl font-bold">Add New Property</CardTitle>
                <CardDescription>Follow the steps to list your property.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Progress value={(currentStep / totalSteps) * 100} className="mb-8" />
                    <h3 className="font-headline text-xl font-semibold">{steps[currentStep - 1].name}</h3>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-8">

                        <div className={cn(currentStep === 1 ? "block" : "hidden")}>
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Property Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Modern Downtown Loft" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Separator className="my-8" />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Describe your property in detail..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Separator className="my-8" />
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Price (per month)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="1200" {...field} />
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
                                            <FormLabel>Property Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a property type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
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

                        <div className={cn(currentStep === 2 ? "block" : "hidden")}>
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Street Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123 University Ave" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Separator className="my-8" />
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Country" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="max-h-60">
                                                    {countries.map(country => (
                                                        <SelectItem key={country.iso2} value={country.name}>{country.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>State</FormLabel>
                                            <FormControl>
                                                <Input placeholder="CA" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Separator className="my-8" />
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Urbanville" {...field} />
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
                                            <FormLabel>ZIP Code</FormLabel>
                                            <FormControl>
                                                <Input placeholder="90210" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className={cn(currentStep === 3 ? "block" : "hidden")}>
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                                <FormField
                                    control={form.control}
                                    name="bedrooms"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bedrooms</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="2" {...field} />
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
                                            <FormLabel>Bathrooms</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="1" {...field} />
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
                                            <FormLabel>Area (sqft)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="1000" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className={cn(currentStep === 4 ? "block" : "hidden")}>
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="amenities"
                                    render={() => (
                                        <FormItem>
                                            <div className="mb-4">
                                                <FormLabel className="text-base">Amenities</FormLabel>
                                                <FormDescription>
                                                    Select the amenities available at your property.
                                                </FormDescription>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                {allAmenities.map((item) => (
                                                    <FormField
                                                        key={item}
                                                        control={form.control}
                                                        name="amenities"
                                                        render={({ field }) => {
                                                            return (
                                                                <FormItem
                                                                    key={item}
                                                                    className="flex flex-row items-start space-x-3 space-y-0"
                                                                >
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={field.value?.includes(item)}
                                                                            onCheckedChange={(checked) => {
                                                                                return checked
                                                                                    ? field.onChange([...(field.value || []), item])
                                                                                    : field.onChange(
                                                                                        field.value?.filter(
                                                                                            (value) => value !== item
                                                                                        )
                                                                                    )
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel className="font-normal">
                                                                        {item}
                                                                    </FormLabel>
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
                                <FormField
                                    control={form.control}
                                    name="rules"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="mb-4">
                                                <FormLabel className="text-base">House Rules</FormLabel>
                                                <FormDescription>
                                                    List your property rules, separated by commas.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Textarea placeholder="e.g., No smoking, Quiet hours after 10 PM" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className={cn(currentStep === 5 ? "block space-y-8" : "hidden")}>
                            <FormField
                                control={form.control}
                                name="leaseTemplate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lease Document Template</FormLabel>
                                        <FormDescription>
                                            This is a standard lease template. Review and edit the text as needed. This document will be used to generate lease agreements for this property. Once you proceed, this text will be locked for any future leases for this property.
                                        </FormDescription>
                                        <FormControl>
                                            <Textarea {...field} rows={20} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Step 6: Upload Photos */}
                        <div className={cn(currentStep === 6 ? "block" : "hidden")}>
                            <div className="mb-6">
                                <h3 className="font-headline text-lg font-semibold">Upload Property Photos</h3>
                                <p className="text-sm text-muted-foreground">Add photos to your listing. Specific photos help tenants make decisions faster.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="kitchenImage"
                                    render={({ field }) => (
                                        <FileUpload
                                            field={field}
                                            label="Kitchen"
                                            description="Shows appliances, counter space, and layout."
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
                                            label="Living Room"
                                            description="Main common area lighting and space."
                                            icon={Sofa}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bathroomImage"
                                    render={({ field }) => (
                                        <FileUpload
                                            field={field}
                                            label="Bathroom"
                                            description="Sink, toilet, and shower/tub condition."
                                            icon={Bath}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bedroomImage"
                                    render={({ field }) => (
                                        <FileUpload
                                            field={field}
                                            label="Bedroom"
                                            description="Space for bed, closet size, and windows."
                                            icon={BedDouble}
                                        />
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="otherImage"
                                    render={({ field }) => (
                                        <FileUpload
                                            field={field}
                                            label="Exterior / Other"
                                            description="Building front, backyard, or amenities."
                                            icon={ImageIcon}
                                        />
                                    )}
                                />
                            </div>
                        </div>


                        <div className={cn(currentStep === 7 ? "block" : "hidden")}>
                            <h3 className="font-headline text-xl font-semibold">Review Your Listing</h3>
                            <p className="text-muted-foreground">Please review all the information below before submitting.</p>
                            <div className="mt-6 space-y-6 rounded-lg border bg-secondary/50 p-6">
                                {/* Basic Info & Location */}
                                <div className="space-y-2">
                                    <h4 className="font-semibold">{form.getValues('title')}</h4>
                                    <p className="text-muted-foreground">{form.getValues('address')}, {form.getValues('city')}, {form.getValues('state')} {form.getValues('zip')}</p>
                                    <p className="text-muted-foreground">{form.getValues('country')}</p>
                                </div>
                                <Separator />
                                {/* Description */}
                                <p className="text-sm">{form.getValues('description')}</p>
                                <Separator />
                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <div>
                                        <p className="text-sm font-medium">Price</p>
                                        <p className="text-muted-foreground">${form.getValues('price')}/month</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Type</p>
                                        <p className="text-muted-foreground">{form.getValues('type')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Bedrooms</p>
                                        <p className="text-muted-foreground">{form.getValues('bedrooms')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Bathrooms</p>
                                        <p className="text-muted-foreground">{form.getValues('bathrooms')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Area</p>
                                        <p className="text-muted-foreground">{form.getValues('area')} sqft</p>
                                    </div>
                                </div>
                                <Separator />
                                {/* Amenities & Rules */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm font-medium mb-2">Amenities</p>
                                        <p className="text-sm text-muted-foreground">{form.getValues('amenities').join(', ')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium mb-2">Rules</p>
                                        <p className="text-sm text-muted-foreground">{form.getValues('rules')}</p>
                                    </div>
                                </div>
                                <Separator />
                                {/* Images Review */}
                                <div>
                                    <p className="text-sm font-medium mb-2">Images to Upload</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                        {[
                                            { label: 'Kitchen', file: form.getValues('kitchenImage') },
                                            { label: 'Living Room', file: form.getValues('livingRoomImage') },
                                            { label: 'Bathroom', file: form.getValues('bathroomImage') },
                                            { label: 'Bedroom', file: form.getValues('bedroomImage') },
                                            { label: 'Other', file: form.getValues('otherImage') }
                                        ].filter(item => item.file && item.file.length > 0).map((item, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <FileImage className="h-4 w-4" />
                                                <span>{item.label}: {item.file[0].name}</span>
                                            </div>
                                        ))}
                                        {![form.getValues('kitchenImage'), form.getValues('livingRoomImage'), form.getValues('bathroomImage')].some(f => f && f.length > 0) && (
                                            <p>No images selected.</p>
                                        )}
                                    </div>
                                </div>
                                <Separator />
                                {/* Lease Template */}
                                <div>
                                    <p className="text-sm font-medium mb-2">Lease Template</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <FileText className="h-4 w-4" />
                                        <span>Lease document template has been configured.</span>
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className="mt-12 flex justify-between">
                            <Button type="button" variant="outline" onClick={prevStep} className={cn(currentStep === 1 && "invisible")}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>

                            {currentStep < totalSteps - 1 ? (
                                <Button type="button" onClick={nextStep}>
                                    Next <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : currentStep === totalSteps - 1 ? (
                                <Button type="button" onClick={nextStep}>
                                    Review <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button type="submit" size="lg" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating Property...' : 'Create Property'}
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
