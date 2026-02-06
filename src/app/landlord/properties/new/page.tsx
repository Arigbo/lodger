'use client';

import { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// UI Components
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card } from '@/components/ui/card';
import { 
    Building, 
    ArrowLeft, 
    ArrowRight, 
    Loader2,
    CheckCircle2
} from 'lucide-react';

// Hooks & Firebase
import { useFirestore, useUser, useFirebaseApp, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/utils';
import { getCurrencyByCountry } from '@/utils/currencies';

// Local Components & Constants
import { steps } from './constants';
import { formSchema, type FormValues } from './schemas';
import { StepNavigation } from './components/step-navigation';
import { BasicInfoStep } from './components/steps/BasicInfoStep';
import { LocationStep } from './components/steps/LocationStep';
import { AmenitiesStep } from './components/steps/AmenitiesStep';
import { LeaseTemplateStep } from './components/steps/LeaseTemplateStep';
import { MediaUploadStep } from './components/steps/MediaUploadStep';
import { AIStep } from './components/steps/AIStep';
import { ReviewStep } from './components/steps/ReviewStep';

// Types
import type { Property, UserProfile } from '@/types';

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
    const [hasPrefilled, setHasPrefilled] = useState(false);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    // Refs for circular dependency guards (Nigeria context)
    const isUpdatingType = useRef(false);
    const isUpdatingBedrooms = useRef(false);

    const [imageAnalysis, setImageAnalysis] = useState({
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

    // --- Side Effects ---

    // Prefill from user profile
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
            }
            setHasPrefilled(true);
        }
    }, [userProfile, hasPrefilled, form]);

    // Currency by country
    const selectedCountry = form.watch('country');
    useEffect(() => {
        if (selectedCountry) {
            const currency = getCurrencyByCountry(selectedCountry);
            if (form.getValues('currency') !== currency) {
                form.setValue('currency', currency);
            }
        }
    }, [selectedCountry, form]);

    // Nigeria-specific logic (Bedrooms <-> Type)
    const selectedBedrooms = form.watch('bedrooms');
    const selectedType = form.watch('type');

    useEffect(() => {
        if (isUpdatingBedrooms.current) return;
        if (selectedCountry === 'Nigeria' || selectedCountry === 'NG') {
            if (selectedBedrooms === 1 && (selectedType === 'Flat' || !selectedType)) {
                isUpdatingType.current = true;
                form.setValue('type', 'Self Contain');
                setTimeout(() => { isUpdatingType.current = false; }, 0);
            } else if (selectedBedrooms > 1 && selectedType === 'Self Contain') {
                isUpdatingType.current = true;
                form.setValue('type', 'Flat');
                setTimeout(() => { isUpdatingType.current = false; }, 0);
            }
        }
    }, [selectedBedrooms, selectedCountry, selectedType, form]);

    useEffect(() => {
        if (isUpdatingType.current) return;
        if (selectedType === 'Self Contain' && selectedBedrooms !== 1) {
            isUpdatingBedrooms.current = true;
            form.setValue('bedrooms', 1);
            setTimeout(() => { isUpdatingBedrooms.current = false; }, 0);
        }
    }, [selectedType, selectedBedrooms, form]);

    // --- Navigation ---

    const nextStep = async () => {
        const fields = steps[currentStep - 1].fields;
        if (fields && fields.length > 0) {
            const isValid = await form.trigger(fields as (keyof FormValues)[]);
            if (!isValid) return;
        }

        if (currentStep < totalSteps) {
            setCurrentStep(s => s + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            form.handleSubmit(onPreSubmit)();
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(s => s - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // --- Logic ---

    const generateAIDescription = async () => {
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

            if (!response.ok) throw new Error('Generation failed');
            const { description } = await response.json();
            form.setValue('description', description);
            toast({ title: "AI Narrative Complete", description: "Property description has been optimized." });
        } catch (error) {
            toast({ variant: "destructive", title: "AI Error", description: "Failed to generate description automatically." });
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const storage = getStorage(firebaseApp);
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    };

    const onPreSubmit = (values: FormValues) => {
        handleFinalSubmit(values);
    };

    const handleFinalSubmit = async (values: FormValues) => {
        if (!user) return;
        setIsSubmitting(true);

        try {
            const timestamp = Date.now();
            const basePath = `properties/${user.uid}/${timestamp}`;
            const images: string[] = [];

            // Parallel upload would be faster, but sequential is safer for toast feedback
            const imageFields = [
                { file: values.kitchenImage?.[0], name: 'kitchen' },
                { file: values.livingRoomImage?.[0], name: 'livingRoom' },
                { file: values.bedroomImage?.[0], name: 'bedroom' },
                { file: values.bathroomImage?.[0], name: 'bathroom' },
                { file: values.otherImage?.[0], name: 'other' },
            ];

            for (const item of imageFields) {
                if (item.file) {
                    const url = await uploadFile(item.file, `${basePath}/${item.name}`);
                    images.push(url);
                }
            }

            let videoUrl = '';
            if (values.propertyVideo?.[0]) {
                videoUrl = await uploadFile(values.propertyVideo[0], `${basePath}/video`);
            }

            const propertyRef = doc(collection(firestore, 'properties'));
            const propertyData: Property = {
                id: propertyRef.id,
                landlordId: user.uid,
                title: values.title,
                description: values.description || '',
                price: values.price,
                currency: values.currency,
                type: values.type,
                bedrooms: values.bedrooms,
                bathrooms: values.bathrooms,
                amenities: values.amenities,
                rules: values.rules ? values.rules.split(',').map(r => r.trim()).filter(Boolean) : [],
                leaseTemplate: values.leaseTemplate,
                location: {
                    address: values.address,
                    city: values.city,
                    state: values.state,
                    country: values.country,
                    zip: values.zip,
                    school: values.school,
                    lat: values.lat || undefined,
                    lng: values.lng || undefined,
                },
                images,
                videos: videoUrl ? [videoUrl] : [],
                status: 'available',
                area: 0,
            };

            await import('firebase/firestore').then(({ setDoc }) => setDoc(propertyRef, propertyData));
            
            toast({ title: "Asset Deployed", description: "Property successfully listed in the marketplace." });
            router.push(`/landlord/properties/${propertyRef.id}?new=true`);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Deployment Failed", description: "Critical error during property creation." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 md:space-y-16 pb-32 min-h-screen">
            {/* Premium Page Header */}
            <header className="px-4 md:px-0 pt-8 md:pt-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-2 border-foreground/5">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                                <Building className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-primary">Portfolio Expansion</p>
                                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Global Marketplace Tier</p>
                            </div>
                        </div>
                        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-foreground uppercase leading-[0.85]">
                            New <span className="text-primary">Property</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Completeness</p>
                            <p className="text-2xl font-black text-primary">{Math.round((currentStep / totalSteps) * 100)}%</p>
                        </div>
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-[2rem] bg-foreground text-white flex items-center justify-center shadow-2xl">
                            <p className="text-2xl md:text-3xl font-black tracking-tighter">0{currentStep}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 md:gap-16 items-start px-4 md:px-0">
                {/* Fixed Navigation Sidebar */}
                <aside className="lg:sticky lg:top-12">
                    <StepNavigation steps={steps} currentStep={currentStep} />
                </aside>

                {/* Form Content Area */}
                <main className="lg:col-span-3">
                    <Form {...form}>
                        <form className="space-y-12 md:space-y-20">
                            <AnimatePresence mode="wait">
                                <section key={currentStep}>
                                    {currentStep === 1 && <BasicInfoStep form={form} />}
                                    {currentStep === 2 && <LocationStep form={form} />}
                                    {currentStep === 3 && <AmenitiesStep form={form} />}
                                    {currentStep === 4 && <LeaseTemplateStep form={form} />}
                                    {currentStep === 5 && <MediaUploadStep form={form} imageAnalysis={imageAnalysis} setImageAnalysis={setImageAnalysis} />}
                                    {currentStep === 6 && <AIStep form={form} isGeneratingDescription={isGeneratingDescription} generateAIDescription={generateAIDescription} />}
                                    {currentStep === 7 && <ReviewStep form={form} imageAnalysis={imageAnalysis} />}
                                </section>
                            </AnimatePresence>

                            {/* Control Bar */}
                            <footer className="flex items-center justify-between gap-6 pt-12 border-t border-foreground/5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={prevStep}
                                    disabled={currentStep === 1 || isSubmitting}
                                    className="h-14 md:h-20 px-8 md:px-12 rounded-full font-black text-xs md:text-sm uppercase tracking-[0.2em] transition-all hover:bg-foreground hover:text-white disabled:opacity-0"
                                >
                                    <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 mr-3" />
                                    Back
                                </Button>

                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={isSubmitting}
                                    className={cn(
                                        "h-16 md:h-24 px-12 md:px-20 rounded-[2rem] md:rounded-[3rem] font-black text-base md:text-2xl uppercase tracking-tighter transition-all duration-500 shadow-2xl",
                                        currentStep === totalSteps 
                                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20" 
                                            : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                                    )}
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center gap-4">
                                            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" />
                                            <span>Deploying...</span>
                                        </div>
                                    ) : currentStep === totalSteps ? (
                                        <div className="flex items-center gap-4">
                                            <span>List Property</span>
                                            <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <span>Continue</span>
                                            <ArrowRight className="h-6 w-6 md:h-8 md:w-8" />
                                        </div>
                                    )}
                                </Button>
                            </footer>
                        </form>
                    </Form>
                </main>
            </div>
        </div>
    );
}
