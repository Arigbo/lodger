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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from '@/components/ui/combobox';
import { SchoolCombobox } from '@/components/school-combobox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PROPERTY_TYPES } from "@/types/property-types";
import { Info } from "lucide-react";
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { amenities as allAmenities } from '@/types';
import { cn, formatPrice } from '@/utils';
import { ArrowLeft, ArrowRight, UploadCloud, FileImage, FileVideo, FileText, Utensils, Sofa, Bath, BedDouble, Image as ImageIcon, Sparkles, Building, Loader2, Ruler, AlertCircle, Wifi, Car, AirVent, Dumbbell, Waves, Layout, ShieldCheck, Video, Play, Home, RefreshCw } from 'lucide-react';
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
    const amenitiesList = propertyData.amenities && propertyData.amenities.length > 0
        ? propertyData.amenities.join(', ')
        : 'None';

    const rulesList = propertyData.rules || 'None';
    const rentAmount = propertyData.price ? `${propertyData.currency} ${propertyData.price}` : '{{MONTHLY_RENT}}';

    return `LEASE AGREEMENT

This Lease Agreement (the "Agreement") is made and entered into on {{DATE_TODAY}}, by and between:

Landlord: Nill
Tenant: Nill

1. PROPERTY. Landlord agrees to lease to Tenant the property located at:
   ${propertyData.address || '{{PROPERTY_ADDRESS}}'}, ${propertyData.city || '{{PROPERTY_CITY}}'}, ${propertyData.state || '{{PROPERTY_STATE}}'}, ${propertyData.country || '{{PROPERTY_COUNTRY}}'}, ${propertyData.zip || '{{PROPERTY_ZIP}}'}

2. TERM. The lease term will begin on {{LEASE_START_DATE}} and will terminate on {{LEASE_END_DATE}}.

3. RENT. Tenant agrees to pay Landlord the sum of ${rentAmount} per month, due on the 1st day of each month.

4. SECURITY DEPOSIT. Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of {{SECURITY_DEPOSIT}} as security for the faithful performance by Tenant of the terms hereof.

5. UTILITIES. Tenant is responsible for the payment of all utilities and services for the Property.

6. AMENITIES. The following amenities are included: ${amenitiesList}.

7. RULES. Tenant agrees to abide by the following rules: ${rulesList}.

8. SIGNATURES. By signing below, the parties agree to the terms and conditions of this Lease Agreement.

Landlord: Nill
Date: Nill

Tenant: Nill
Date: Nill`;
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

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
const MAX_VIDEO_SIZE = 50000000; // 50MB

const videoSchema = z.any()
    .refine((files) => !files || files.length === 0 || files.length === 1, "Only one video permitted.")
    .refine((files) => !files || files.length === 0 || files[0]?.size <= MAX_VIDEO_SIZE, `Max video size is 50MB.`)
    .refine(
        (files) => !files || files.length === 0 || ACCEPTED_VIDEO_TYPES.includes(files[0]?.type),
        "Only .mp4, .webm, .ogg and .mov formats are supported."
    );

const formSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters.'),
    description: z.string().min(10, 'Description must be at least 10 characters.').optional().or(z.literal('')),
    price: z.coerce.number().positive('Price must be a positive number.'),
    currency: z.string().min(3, 'Currency is required.'),
    type: z.enum(['Flat', 'House', 'Duplex', 'Bungalow', 'Terrace', 'Penthouse', 'Mansion', 'Studio', 'Self Contain', 'BHK', 'Townhouse']),
    address: z.string().min(5, 'Address is required.'),
    country: z.string().min(2, 'Country is required.'),
    city: z.string().min(2, 'City is required.'),
    state: z.string().min(2, 'State is required.'),
    zip: z.string().min(2, 'Zip code is required.'),
    school: z.string().optional(),
    bedrooms: z.coerce.number().int().min(0, 'Bedrooms must be 0 or more.'),
    bathrooms: z.coerce.number().int().min(1, 'Must have at least 1 bathroom.'),

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
    propertyVideo: videoSchema.optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const steps = [
    { id: 1, name: 'Basic Info', fields: ['title', 'type', 'price', 'currency', 'bedrooms', 'bathrooms'] },
    { id: 2, name: 'Location', fields: ['address', 'country', 'city', 'state', 'zip', 'school'] },
    { id: 3, name: 'Amenities & Rules', fields: ['amenities', 'rules'] },
    { id: 4, name: 'Lease Template', fields: ['leaseTemplate'] },
    { id: 5, name: 'Media', fields: ['kitchenImage', 'livingRoomImage', 'bathroomImage', 'bedroomImage', 'otherImage', 'propertyVideo'] },
    { id: 6, name: 'Description', fields: ['description'] },
    { id: 7, name: 'Review & Submit', fields: [] }
];

interface FileUploadProps {
    field: any;
    label: string;
    description: string;
    icon: any;
    onUpload?: (files: FileList) => void;
    onAnalysisChange?: (analysis: { safety: string, context: string, reason?: string } | null) => void;
}

const FileUpload = ({ field, label, description, icon: Icon, onUpload, onAnalysisChange }: FileUploadProps) => {
    const [isScanning, setIsScanning] = useState(false);
    const [analysis, setAnalysis] = useState<{ safety: string, context: string, reason?: string } | null>(null);
    const { toast } = useToast();

    const stripMetadata = async (file: File): Promise<Blob> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob((blob) => {
                        resolve(blob || file);
                    }, 'image/jpeg', 0.95);
                } else {
                    resolve(file);
                }
            };
            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
        });
    };

    const handleFileChange = async (files: FileList | null) => {
        if (!files || files.length === 0) {
            field.onChange(null);
            setAnalysis(null);
            onAnalysisChange?.(null);
            return;
        }

        setIsScanning(true);
        setAnalysis(null);
        onAnalysisChange?.(null);

        try {
            const originalFile = files[0];
            const cleanBlob = await stripMetadata(originalFile);
            const cleanFile = new File([cleanBlob], originalFile.name, { type: 'image/jpeg' });

            // Create a fake FileList-like object for the form
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(cleanFile);
            field.onChange(dataTransfer.files);

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                try {
                    const response = await fetch('/api/moderate-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imageBase64: base64,
                            mimeType: cleanFile.type
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setAnalysis(data);
                        onAnalysisChange?.(data);

                        // Show appropriate toast based on analysis
                        if (data.safety === 'UNSAFE') {
                            toast({
                                variant: "destructive",
                                title: "Image Blocked",
                                description: data.reason || "This image contains inappropriate content and cannot be uploaded.",
                            });
                            // Clear the field for UNSAFE images
                            field.onChange(null);
                            setAnalysis(null);
                            onAnalysisChange?.(null);
                        } else if (data.context === 'IRRELEVANT') {
                            toast({
                                title: "Context Warning",
                                description: data.reason || "This image may not be relevant to apartment listings.",
                            });
                        } else {
                            toast({
                                title: "Image Verified",
                                description: "Image passed safety and context checks.",
                            });
                        }
                    } else if (response.status === 429) {
                        toast({
                            title: "Verification Skipped",
                            description: "AI check momentarily unavailable. Image accepted.",
                        });
                        // Allow upload to proceed without verification
                    } else {
                        throw new Error('Moderation check failed');
                    }
                } catch (error) {
                    console.error("Moderation API error:", error);
                    toast({
                        title: "Verification Skipped",
                        description: "Unable to verify image safety. Image accepted.",
                    });
                    // Allow upload to proceed without verification
                }
                setIsScanning(false);
            };
            reader.readAsDataURL(cleanFile);
        } catch (error) {
            console.error("Image processing failed", error);
            toast({
                variant: "destructive",
                title: "Upload Error",
                description: "Failed to process image. Please try a different file.",
            });
            setIsScanning(false);
            field.onChange(null);
        }
    };

    return (
        <FormItem className="h-full">
            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Icon className="h-3 w-3" /> {label}</span>
                {analysis && (
                    <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black tracking-tighter uppercase",
                        analysis.safety === 'SAFE' && analysis.context === 'RELEVANT' ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                    )}>
                        {analysis.safety === 'SAFE' && analysis.context === 'RELEVANT' ? (
                            <><ShieldCheck className="h-2.5 w-2.5" /> Verified</>
                        ) : (
                            <><AlertCircle className="h-2.5 w-2.5" /> Issue Detected</>
                        )}
                    </div>
                )}
            </FormLabel>
            <FormControl>
                <div className={cn(
                    "mt-4 flex flex-col justify-center rounded-[2rem] border-2 border-dashed px-6 py-10 transition-all duration-500 group h-56 relative overflow-hidden",
                    analysis && analysis.safety === 'UNSAFE' ? "border-destructive/40 bg-destructive/5" :
                        analysis && analysis.context === 'IRRELEVANT' ? "border-orange-500/40 bg-orange-500/5" :
                            "border-muted/20 hover:bg-primary/5 hover:border-primary/20"
                )}>
                    <div className="text-center relative z-10">
                        {isScanning ? (
                            <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
                                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Scanning Content...</p>
                                    <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Safety & Context Check</p>
                                </div>
                            </div>
                        ) : field.value?.[0] ? (
                            <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                                <div className={cn(
                                    "h-16 w-16 rounded-2xl flex items-center justify-center transition-colors shadow-2xl shadow-black/5",
                                    analysis && analysis.safety === 'UNSAFE' ? "bg-destructive/20 text-destructive" :
                                        analysis && analysis.context === 'IRRELEVANT' ? "bg-orange-500/20 text-orange-600" :
                                            "bg-primary/10 text-primary"
                                )}>
                                    {analysis && analysis.safety === 'UNSAFE' ? <AlertCircle className="h-8 w-8" /> : <FileImage className="h-8 w-8" />}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate max-w-[200px]">{field.value[0].name}</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); handleFileChange(null); }} className="text-destructive font-black text-[10px] uppercase tracking-widest h-auto p-0 hover:bg-transparent">Remove</Button>
                                        <span className="w-1 h-1 bg-muted rounded-full" />
                                        <label htmlFor={field.name} className="cursor-pointer text-muted-foreground hover:text-primary font-black text-[10px] uppercase tracking-widest transition-colors">Replace</label>
                                        <input id={field.name} name={field.name} type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e.target.files)} />
                                    </div>
                                    {analysis && (analysis.safety === 'UNSAFE' || analysis.context === 'IRRELEVANT') && (
                                        <p className="text-[9px] font-bold text-destructive uppercase tracking-tight mt-2 max-w-[180px] mx-auto leading-tight italic">
                                            {analysis.reason || (analysis.safety === 'UNSAFE' ? "Content flagged for safety" : "Irrelevant to apartment context")}
                                        </p>
                                    )}
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
                                            onChange={(e) => handleFileChange(e.target.files)}
                                        />
                                    </label>
                                    <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">MAX 5MB • AI SECURED</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </FormControl>
            <FormMessage />
        </FormItem>
    );
};


const VideoUpload = ({ field, label, description, icon: Icon }: { field: any; label: string; description: string; icon: any }) => {
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = (files: FileList | null) => {
        if (!files || files.length === 0) {
            field.onChange(null);
            return;
        }

        const file = files[0];
        if (file.size > MAX_VIDEO_SIZE) {
            toast({
                variant: "destructive",
                title: "File Too Large",
                description: "Maximum video size is 50MB.",
            });
            return;
        }

        if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
            toast({
                variant: "destructive",
                title: "Invalid Format",
                description: "Please upload an MP4, WebM, OGG or MOV video.",
            });
            return;
        }

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        field.onChange(dataTransfer.files);
    };

    return (
        <FormItem className="h-full">
            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                <Icon className="h-3 w-3" /> {label}
            </FormLabel>
            <FormControl>
                <div className="mt-4 flex flex-col justify-center rounded-[2rem] border-2 border-dashed border-muted/20 hover:bg-primary/5 hover:border-primary/20 p-6 h-56 transition-all duration-500 group relative overflow-hidden">
                    <div className="text-center relative z-10">
                        {field.value?.[0] ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                    <FileVideo className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate max-w-[200px]">{field.value[0].name}</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange(null)} className="text-destructive font-black text-[10px] uppercase tracking-widest h-auto p-0 hover:bg-transparent">Remove</Button>
                                        <span className="w-1 h-1 bg-muted rounded-full" />
                                        <label htmlFor={field.name} className="cursor-pointer text-muted-foreground hover:text-primary font-black text-[10px] uppercase tracking-widest">Replace</label>
                                        <input id={field.name} type="file" className="sr-only" accept="video/*" onChange={(e) => handleFileChange(e.target.files)} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="h-16 w-16 rounded-2xl bg-muted/5 flex items-center justify-center mx-auto group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-500">
                                    <Video className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor={field.name} className="relative cursor-pointer rounded-md font-black text-[10px] uppercase tracking-widest text-foreground hover:text-primary transition-colors">
                                        <span>Add {label}</span>
                                        <input id={field.name} type="file" className="sr-only" accept="video/*" onChange={(e) => handleFileChange(e.target.files)} />
                                    </label>
                                    <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">MAX 50MB • MP4 / WEBM / MOV</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </FormControl>
            <FormMessage />
        </FormItem>
    );
};


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

    // Track image moderation analysis for all images
    const [imageAnalysis, setImageAnalysis] = useState<{
        kitchen: { safety: string, context: string, reason?: string } | null;
        livingRoom: { safety: string, context: string, reason?: string } | null;
        bedroom: { safety: string, context: string, reason?: string } | null;
        bathroom: { safety: string, context: string, reason?: string } | null;
        other: { safety: string, context: string, reason?: string } | null;
    }>({
        kitchen: null,
        livingRoom: null,
        bedroom: null,
        bathroom: null,
        other: null,
    });

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
            amenities: [],
            rules: '',
            leaseTemplate: '',
            currency: 'USD',
        },
    });

    useEffect(() => {
        if (userProfile && !hasPrefilled) {
            const currentValues = form.getValues();
            const shouldUpdate = !currentValues.country && !currentValues.city && !currentValues.state;

            if (shouldUpdate && (userProfile.country || userProfile.state || userProfile.city)) {
                form.reset({
                    ...currentValues,
                    country: userProfile.country || '',
                    state: userProfile.state || '',
                    city: userProfile.city || '',
                });

                if (userProfile.country) {
                    toast({
                        title: "Location Updated",
                        description: "Your location settings have been updated.",
                    });
                }
            }
            // Always set hasPrefilled to true to prevent the loop, 
            // even if no updates were made or if profile data was incomplete.
            setHasPrefilled(true);
        }
    }, [userProfile, hasPrefilled]); // Removed form and toast to prevent loop

    const selectedCountry = form.watch('country');
    const selectedBedrooms = form.watch('bedrooms');

    useEffect(() => {
        if (selectedCountry) {
            const currency = getCurrencyByCountry(selectedCountry);
            // Check if current currency is different before setting to avoid loop
            if (form.getValues('currency') !== currency) {
                form.setValue('currency', currency);
            }
        }
    }, [selectedCountry]); // Removed form from dependencies

    // Optimize property type selection based on bedrooms (Nigeria Context)
    useEffect(() => {
        if (selectedCountry === 'Nigeria' || selectedCountry === 'NG') {
            if (selectedBedrooms === 1) {
                // In Nigeria, 1 bedroom is typically a Self Contain
                const currentType = form.getValues('type');
                if (!currentType || currentType === 'Flat') {
                    // Don't auto-switch if they manually selected BHK or Studio, only generic Flat
                    form.setValue('type', 'Self Contain');
                }
            } else if (selectedBedrooms > 1) {
                // 2+ bedrooms are typically Flats
                const currentType = form.getValues('type');
                if (!currentType || currentType === 'Self Contain') {
                    form.setValue('type', 'Flat');
                }
            }
        }
    }, [selectedBedrooms, selectedCountry]);

    // Force bedrooms to 1 for Self Contain
    const selectedType = form.watch('type');
    useEffect(() => {
        if (selectedType === 'Self Contain') {
            const currentBeds = form.getValues('bedrooms');
            if (currentBeds !== 1) {
                form.setValue('bedrooms', 1);
                toast({
                    title: "Bedrooms Updated",
                    description: "Self Contain units are set to 1 bedroom by default.",
                });
            }
        }
    }, [selectedType]); // Removed form and toast dependencies

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

        // Auto-generate lease template on step 4 if empty
        if (currentStep === 3) {
            const propertyData = form.getValues();
            const leaseText = generateLeaseTextForTemplate(propertyData);
            const currentLease = form.getValues('leaseTemplate');
            if (!currentLease) {
                form.setValue('leaseTemplate', leaseText);
            }
        }

        // Only validate if there are fields to validate (skip review step)
        if (fields && fields.length > 0) {
            const output = await form.trigger(fields as (keyof FormValues)[], { shouldFocus: true });
            if (!output) {
                console.log('Validation failed for fields:', fields);
                return;
            }
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

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingSubmission, setPendingSubmission] = useState<FormValues | null>(null);

    // Initial submit just opens the confirmation dialog
    function onSubmit(values: FormValues) {
        setPendingSubmission(values);
        setIsConfirmOpen(true);
    }

    const handleReject = () => {
        router.push('/landlord/properties');
    };

    // Actual submission to Firestore
    async function handleFinalSubmit() {
        if (!user || !pendingSubmission) return;
        setIsSubmitting(true);
        const values = pendingSubmission;

        try {
            const uploadedImageUrls: string[] = [];
            const timestamp = Date.now();
            const basePath = `properties/${user.uid}/${timestamp}`;

            // Validate and upload images first
            let uploadFailed = false;

            const uploadField = async (fileList: any, name: string) => {
                if (fileList && fileList.length > 0) {
                    try {
                        const url = await uploadImage(fileList[0], `${basePath}/${name}`);
                        uploadedImageUrls.push(url);
                    } catch (e) {
                        console.error(`Failed to upload ${name}`, e);
                        uploadFailed = true;
                        toast({
                            variant: "destructive",
                            title: "Upload Failed",
                            description: `Failed to upload ${name} image. Please try again.`,
                        });
                    }
                }
            };

            await uploadField(values.kitchenImage, 'kitchen');
            await uploadField(values.livingRoomImage, 'livingRoom');
            await uploadField(values.bathroomImage, 'bathroom');
            await uploadField(values.bedroomImage, 'bedroom');
            await uploadField(values.otherImage, 'other');

            if (uploadFailed) {
                setIsSubmitting(false);
                setIsConfirmOpen(false);
                return; // Stop submission if uploads failed
            }

            let uploadedVideoUrl = '';
            if (values.propertyVideo && values.propertyVideo.length > 0) {
                try {
                    uploadedVideoUrl = await uploadImage(values.propertyVideo[0], `${basePath}/video`);
                } catch (e) {
                    console.error("Failed to upload video", e);
                    toast({
                        variant: "destructive",
                        title: "Video Upload Failed",
                        description: "Failed to upload video. Property creation aborted.",
                    });
                    setIsSubmitting(false);
                    setIsConfirmOpen(false);
                    return;
                }
            }

            const newPropertyData: Omit<Property, 'id'> = {
                title: values.title,
                description: values.description || '',
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
                area: 0, // Area removed from form, defaulting to 0
                currency: values.currency || 'USD',
                amenities: values.amenities,
                images: uploadedImageUrls,
                videos: uploadedVideoUrl ? [uploadedVideoUrl] : [],
                landlordId: user.uid,
                status: 'available',
                rules: values.rules ? values.rules.split(',').map(r => r.trim()).filter(Boolean) : [],
                leaseTemplate: values.leaseTemplate,
            };

            // Generate ID first, then setDoc to ensure ID is in the document if needed (though redundancy is fine)
            // Ideally, we should use setDoc with a generated ID if we want the ID in the doc, or just addDoc.
            // But the previous code used addDoc then updateDoc.
            // The cleanest way is to create a ref, then use setDoc with the ID included in the data if the type requires it.

            const newPropertyRef = doc(collection(firestore, 'properties'));
            const finalPropertyData: Property = {
                ...newPropertyData,
                id: newPropertyRef.id,
            };

            await import('firebase/firestore').then(({ setDoc }) => setDoc(newPropertyRef, finalPropertyData));

            toast({ title: "Property Added", description: "Your property is now listed in the marketplace." });
            router.push(`/landlord/properties/${newPropertyRef.id}?new=true`);
        } catch (e: any) {
            console.error("Error adding document: ", e);
            toast({
                variant: "destructive",
                title: "System Error",
                description: "Property submission failed. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
            setIsConfirmOpen(false);
        }
    }

    return (
        <div className="max-w-full overflow-x-hidden space-y-4 md:space-y-12 px-4 md:px-0 pb-32 animate-in fade-in duration-1000">
            {/* Mobile-optimized Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 pb-4 md:pb-8 border-b-2 md:border-b-4 border-foreground/5 mt-4 md:mt-0">
                <div className="space-y-2 md:space-y-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-white shadow-lg border-2 border-primary/10">
                            <Building className="h-3 w-3 md:h-5 md:w-5 text-primary" />
                        </div>
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-primary">ADD PROPERTY</p>
                    </div>
                    <div className="flex items-end justify-between">
                        <h1 className="font-headline text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter text-foreground uppercase leading-[0.9]">
                            CREATE <span className="text-primary">PROPERTY</span>
                        </h1>
                        {/* Mobile Step Indicator */}
                        <div className="md:hidden bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                            <p className="text-lg font-black text-primary">{Math.round((currentStep / steps.length) * 100)}%</p>
                        </div>
                    </div>

                    <p className="text-xs md:text-base lg:text-lg text-muted-foreground font-medium mt-1 md:mt-4 hidden md:block">
                        Define your property details and rental terms.
                    </p>
                </div>
                {/* Desktop Step Indicator */}
                <div className="hidden md:flex gap-4">
                    <div className="bg-primary/5 px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-[2rem] border-2 border-primary/10">
                        <p className="text-2xl md:text-3xl font-black text-primary">{Math.round((currentStep / steps.length) * 100)}%</p>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 blur-3xl rounded-full -z-10" />
                <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-500/5 blur-3xl rounded-full -z-10" />

                <div className="grid grid-cols-1 gap-6 md:gap-12 lg:grid-cols-4">
                    {/* Desktop Sidebar Steps */}
                    <div className="hidden lg:block lg:col-span-1 space-y-3 md:space-y-4">
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
                        {/* Mobile Progress Bar */}
                        <div className="block lg:hidden mb-6">
                            <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500 ease-out"
                                    style={{ width: `${(currentStep / steps.length) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step {currentStep}</span>
                                <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">{steps[currentStep - 1].name}</span>
                            </div>
                        </div>

                        <Card className="rounded-2xl md:rounded-[3.5rem] border-2 border-foreground/5 bg-white shadow-3xl overflow-hidden p-4 sm:p-6 md:p-8 lg:p-12">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                                    {currentStep === 1 && (
                                        <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="space-y-6 md:space-y-8">
                                                <FormField
                                                    control={form.control}
                                                    name="title"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property Title</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="e.g., THE LUXE DOWNTOWN PENTHOUSE" {...field} className="h-12 md:h-16 rounded-xl md:rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-sm md:text-xl font-black uppercase tracking-tight" />
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
                                                                    <SelectTrigger className="h-12 md:h-16 rounded-xl md:rounded-2xl bg-muted/20 border-2 border-transparent focus:ring-0 text-[10px] md:text-xs font-black uppercase tracking-widest">
                                                                        <SelectValue placeholder="Select type" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase">
                                                                    {PROPERTY_TYPES.map((type) => (
                                                                        <SelectItem key={type.value} value={type.value} className="group">
                                                                            <div className="flex items-center justify-between w-full gap-2 min-w-[120px]">
                                                                                <span>{type.label}</span>
                                                                                <div
                                                                                    role="button"
                                                                                    className="p-1 hover:bg-muted rounded-full transition-colors opacity-50 group-hover:opacity-100"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        toast({
                                                                                            title: type.label,
                                                                                            description: type.description,
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    <Info className="h-3 w-3" />
                                                                                </div>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Separator className="bg-muted/10" />
                                            <div className="grid grid-cols-2 gap-4 md:gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="price"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Monthly Rent</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0.00" {...field} className="h-12 md:h-16 rounded-xl md:rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-lg md:text-2xl font-black text-primary" />
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
                                                                    <SelectTrigger className="h-12 md:h-16 rounded-xl md:rounded-2xl bg-muted/20 border-2 border-transparent focus:ring-0 text-[10px] md:text-xs font-black uppercase tracking-widest">
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
                                            <div className="grid grid-cols-2 gap-4 md:gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="bedrooms"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Bedrooms</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0" {...field} className="h-12 md:h-16 rounded-xl md:rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
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
                                                                <Input type="number" placeholder="0" {...field} className="h-12 md:h-16 rounded-xl md:rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 2 && (
                                        <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="address"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-2">
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Address</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="123 PRESTIGE BOULEVARD" {...field} className="h-12 md:h-16 rounded-xl md:rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="grid grid-cols-2 gap-4 md:col-span-2 md:grid-cols-2">
                                                    <FormField
                                                        control={form.control}
                                                        name="country"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Country</FormLabel>
                                                                <FormControl>
                                                                    <div className="[&>button]:h-12 [&>button]:md:h-16 [&>button]:rounded-xl [&>button]:md:rounded-2xl [&>button]:bg-muted/20 [&>button]:border-transparent [&>button]:text-xs [&>button]:font-black [&>button]:uppercase [&>button]:tracking-widest">
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
                                                                    </div>
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
                                                                    <div className="[&>button]:h-12 [&>button]:md:h-16 [&>button]:rounded-xl [&>button]:md:rounded-2xl [&>button]:bg-muted/20 [&>button]:border-transparent [&>button]:text-xs [&>button]:font-black [&>button]:uppercase [&>button]:tracking-widest">
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
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 md:col-span-2 md:grid-cols-2">
                                                    <FormField
                                                        control={form.control}
                                                        name="city"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">City</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="CITY NAME" {...field} className="h-12 md:h-16 rounded-xl md:rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
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
                                                                    <Input placeholder="ZIP CODE" {...field} className="h-12 md:h-16 rounded-xl md:rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <FormField
                                                    control={form.control}
                                                    name="school"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-2">
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Search Nearest School</FormLabel>
                                                            <FormControl>
                                                                <div className="[&>button]:h-12 [&>button]:md:h-16 [&>button]:rounded-xl [&>button]:md:rounded-2xl [&>button]:bg-muted/20 [&>button]:border-transparent [&>button]:text-xs [&>button]:font-black [&>button]:uppercase [&>button]:tracking-widest">
                                                                    <SchoolCombobox
                                                                        value={field.value || ''}
                                                                        onChange={field.onChange}
                                                                    />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                        </div>

                                    )}

                                    {currentStep === 3 && (
                                        <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <FormField
                                                control={form.control}
                                                name="amenities"
                                                render={() => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-4 block">Select Amenities</FormLabel>
                                                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                                                            {allAmenities.map((amenity) => {
                                                                // Dynamic icon mapping based on common amenity names
                                                                const getIcon = (name: string) => {
                                                                    const n = name.toLowerCase();
                                                                    if (n.includes('wi-fi')) return Wifi;
                                                                    if (n.includes('parking')) return Car;
                                                                    if (n.includes('laundry')) return RefreshCw;
                                                                    if (n.includes('gym')) return Dumbbell;
                                                                    if (n.includes('pool')) return Waves;
                                                                    if (n.includes('yard')) return Home;
                                                                    if (n.includes('pet')) return ShieldCheck; // or PawPrint if imported
                                                                    if (n.includes('furnished')) return Sofa;
                                                                    if (n.includes('secure')) return ShieldCheck;
                                                                    if (n.includes('rooftop')) return Building;
                                                                    if (n.includes('utilities')) return Sparkles;
                                                                    if (n.includes('dishwasher')) return Utensils;
                                                                    return Sparkles; // Default
                                                                };
                                                                const Icon = getIcon(amenity);

                                                                return (
                                                                    <FormField
                                                                        key={amenity}
                                                                        control={form.control}
                                                                        name="amenities"
                                                                        render={({ field }) => {
                                                                            const isSelected = field.value?.includes(amenity);
                                                                            return (
                                                                                <FormItem
                                                                                    className={cn(
                                                                                        "flex flex-row items-center space-x-3 md:space-x-4 space-y-0 p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-300 cursor-pointer group",
                                                                                        isSelected
                                                                                            ? "bg-foreground border-foreground text-white shadow-lg"
                                                                                            : "bg-muted/5 border-muted/10 hover:border-primary/20 hover:bg-white"
                                                                                    )}
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        const currentValues = field.value || [];
                                                                                        const newValue = currentValues.includes(amenity)
                                                                                            ? currentValues.filter((v: string) => v !== amenity)
                                                                                            : [...currentValues, amenity];
                                                                                        field.onChange(newValue);
                                                                                    }}
                                                                                >
                                                                                    <div className={cn(
                                                                                        "p-2 md:p-2.5 rounded-lg md:rounded-xl shadow-sm transition-colors",
                                                                                        isSelected ? "bg-white/10" : "bg-white"
                                                                                    )}>
                                                                                        <Icon className={cn("h-3 w-3 md:h-4 md:w-4", isSelected ? "text-white" : "text-primary")} />
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] cursor-pointer block truncate">{amenity}</FormLabel>
                                                                                    </div>
                                                                                    <FormControl>
                                                                                        <Checkbox
                                                                                            checked={isSelected}
                                                                                            onCheckedChange={() => { }} // Handled by div click
                                                                                            className={cn(
                                                                                                "h-4 w-4 md:h-5 md:w-5 rounded md:rounded-lg border-2",
                                                                                                isSelected ? "border-white/20 bg-white/10" : "border-muted/20"
                                                                                            )}
                                                                                        />
                                                                                    </FormControl>
                                                                                </FormItem>
                                                                            )
                                                                        }}
                                                                    />
                                                                );
                                                            })}
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
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Operational Protocols (House Rules)</FormLabel>
                                                        <FormControl>
                                                            <Textarea placeholder="e.g., No smoking, Quiet hours after 10 PM" {...field} className="min-h-[100px] md:min-h-[200px] rounded-2xl md:rounded-[2rem] bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs md:text-sm font-medium p-6 md:p-8 leading-relaxed italic" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                        </div>
                                    )}

                                    {currentStep === 4 && (
                                        <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <FormField
                                                control={form.control}
                                                name="leaseTemplate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 md:mb-4 block">Lease Template</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                {...field}
                                                                className="min-h-[40vh] md:min-h-[60vh] rounded-2xl md:rounded-3xl bg-muted/5 border-2 border-dashed border-primary/20 focus-visible:border-primary focus-visible:bg-white text-[10px] md:text-sm font-mono leading-relaxed p-4 md:p-10 transition-all duration-500"
                                                            />
                                                        </FormControl>
                                                        <FormDescription className="text-[9px] md:text-[10px] font-medium mt-3 md:mt-4 opacity-60">
                                                            * Fields marked as "Nill" and dates will be automatically updated with actual names and dates when the lease is signed by each party.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {currentStep === 5 && (
                                        <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="kitchenImage"
                                                    render={({ field }) => (
                                                        <FileUpload
                                                            field={field}
                                                            label="KITCHEN"
                                                            description="Capture the kitchen space."
                                                            icon={Utensils}
                                                            onAnalysisChange={(analysis) => setImageAnalysis(prev => ({ ...prev, kitchen: analysis }))}
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
                                                            onAnalysisChange={(analysis) => setImageAnalysis(prev => ({ ...prev, livingRoom: analysis }))}
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
                                                            onAnalysisChange={(analysis) => setImageAnalysis(prev => ({ ...prev, bedroom: analysis }))}
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
                                                            onAnalysisChange={(analysis) => setImageAnalysis(prev => ({ ...prev, bathroom: analysis }))}
                                                        />
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="otherImage"
                                                    render={({ field }) => (
                                                        <FileUpload
                                                            field={field}
                                                            label="OTHER"
                                                            description="Any other highlights."
                                                            icon={ImageIcon}
                                                            onAnalysisChange={(analysis) => setImageAnalysis(prev => ({ ...prev, other: analysis }))}
                                                        />
                                                    )}
                                                />
                                                <div className="md:col-span-2 mt-4 md:mt-6">
                                                    <FormField
                                                        control={form.control}
                                                        name="propertyVideo"
                                                        render={({ field }) => (
                                                            <VideoUpload
                                                                field={field}
                                                                label="PROPERTY VIDEO"
                                                                description="A walkthrough video of the property."
                                                                icon={Video}
                                                            />
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 6 && (
                                        <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="p-5 md:p-8 rounded-2xl md:rounded-3xl bg-primary/5 border-2 border-primary/10">
                                                <h3 className="text-sm md:text-lg font-black uppercase tracking-tight mb-3 md:mb-4">AI-Powered Description</h3>
                                                <p className="text-[10px] md:text-sm text-muted-foreground mb-4 md:mb-6">
                                                    Generate a compelling property description using all the details you've provided. You can edit it after generation.
                                                </p>
                                                <Button
                                                    type="button"
                                                    onClick={generateDescription}
                                                    disabled={isGeneratingDescription}
                                                    className="w-full md:w-auto h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black uppercase tracking-widest"
                                                >
                                                    {isGeneratingDescription ? (
                                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                                                    ) : (
                                                        <><Sparkles className="mr-2 h-4 w-4" /> Generate Description</>
                                                    )}
                                                </Button>
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="description"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property Description</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Describe the essence of your property..."
                                                                {...field}
                                                                className="min-h-[150px] md:min-h-[250px] rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs md:text-sm font-medium p-4 md:p-6 leading-relaxed"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {currentStep === 7 && (
                                        <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-500">
                                            <div className="p-6 md:p-12 rounded-3xl md:rounded-[3rem] bg-gradient-to-br from-primary/10 via-background to-blue-500/10 border-2 border-primary/20 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                                    <Sparkles className="h-24 w-24 md:h-32 md:w-32" />
                                                </div>
                                                <div className="relative space-y-6 md:space-y-8">
                                                    <div>
                                                        <h3 className="text-xl md:text-4xl font-black uppercase tracking-tighter leading-none mb-2">Review Your Property</h3>
                                                        <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-widest">Finalize before deployment</p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                                                        <div className="space-y-4 md:space-y-6">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Property Title</p>
                                                                <p className="text-base md:text-2xl font-black uppercase tracking-tight leading-tight">{form.getValues('title')}</p>
                                                                <p className="text-muted-foreground text-[10px] md:text-sm mt-1 md:mt-2">{form.getValues('address')}, {form.getValues('city')}</p>
                                                            </div>
                                                            <Separator className="bg-muted/20" />
                                                            <div className="grid grid-cols-2 gap-4 md:gap-6">
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Monthly Rent</p>
                                                                    <p className="text-sm md:text-xl font-black">{form.getValues('currency')} {form.getValues('price')}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Type</p>
                                                                    <p className="text-sm md:text-xl font-black uppercase tracking-tight">{form.getValues('type')}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-6 p-5 md:p-8 rounded-2xl md:rounded-3xl bg-white/50 border border-muted/20">
                                                            <div className="grid grid-cols-2 gap-6 md:gap-8">
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Bedrooms</p>
                                                                    <p className="text-lg md:text-2xl font-black">{form.getValues('bedrooms')}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Bathrooms</p>
                                                                    <p className="text-lg md:text-2xl font-black">{form.getValues('bathrooms')}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 md:space-y-6 mt-6">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property Media</p>
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                                                        {/* Images */}
                                                        {['kitchenImage', 'livingRoomImage', 'bedroomImage', 'bathroomImage', 'otherImage'].map((field) => {
                                                            const file = (form.getValues() as any)[field]?.[0];
                                                            if (!file) return null;
                                                            return (
                                                                <div key={field} className="relative aspect-square rounded-xl md:rounded-2xl overflow-hidden border-2 border-foreground/5 shadow-inner group">
                                                                    <img src={URL.createObjectURL(file)} alt={field} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                                    <div className="absolute top-1 left-1 md:top-2 md:left-2 px-1.5 md:px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                                                                        <span className="text-[5px] md:text-[6px] font-black text-white uppercase tracking-widest">{field.replace('Image', '')}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {/* Video */}
                                                        {form.getValues('propertyVideo')?.[0] && (
                                                            <div className="relative aspect-square rounded-xl md:rounded-2xl overflow-hidden border-2 border-primary/20 bg-black group cursor-pointer">
                                                                <video src={URL.createObjectURL(form.getValues('propertyVideo')![0])} className="w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-100" />
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-primary/90 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                                                                        <Play className="h-3 w-3 md:h-4 md:w-4 ml-0.5 fill-current" />
                                                                    </div>
                                                                </div>
                                                                <div className="absolute top-1 left-1 md:top-2 md:left-2 px-1.5 md:px-2 py-0.5 bg-primary rounded-full border border-white/10">
                                                                    <span className="text-[5px] md:text-[6px] font-black text-white uppercase tracking-widest">Walkthrough</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-6">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 md:mb-3">Selected Amenities</p>
                                                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                                                        {form.getValues('amenities')?.map((amenity) => (
                                                            <span key={amenity} className="px-2.5 py-1 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary text-[9px] md:text-[10px] md:text-xs font-black uppercase tracking-widest">
                                                                {amenity}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 md:pt-12 mt-6 md:mt-12 border-t-2 border-muted/10">
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

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="rounded-[2rem] border-2 border-foreground/5 p-0 overflow-hidden sm:max-w-md">
                    <div className="bg-primary/5 p-6 md:p-8 flex flex-col items-center justify-center text-center border-b">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary animate-in zoom-in duration-500">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">Final Verification</DialogTitle>
                        <DialogDescription className="text-xs md:text-sm font-medium mt-2 max-w-xs mx-auto">
                            Please confirm that you are the legal owner of this property and all provided details are accurate.
                        </DialogDescription>
                    </div>
                    <DialogFooter className="p-6 md:p-8 flex flex-col sm:flex-row gap-4">
                        <Button
                            variant="outline"
                            onClick={handleReject}
                            className="w-full h-14 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/5 hover:border-destructive/20 hover:text-destructive transition-colors"
                        >
                            No, Cancel Listing
                        </Button>
                        <Button
                            onClick={handleFinalSubmit}
                            disabled={isSubmitting}
                            className="w-full h-14 rounded-xl bg-foreground text-white hover:bg-primary transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, I Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
