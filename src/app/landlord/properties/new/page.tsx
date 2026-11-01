'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';

// UI Components
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { 
    ArrowLeft, 
    ArrowRight, 
    Loader2,
    CheckCircle2,
    FileQuestion,
    Save,
} from 'lucide-react';
import { EmptyState, PageHeader, PageSkeleton } from '@/components/dashboard';
import { Progress } from '@/components/ui/progress';
import { describeUploadError, getErrorCode } from '@/lib/errors';
import { toDate } from '@/lib/dates';
import { uploadMedia } from '@/lib/media/upload-media';
import { MEDIA_SLOTS, toDraftValues, type PropertyDraft, type SavedMedia } from '@/lib/property-drafts';

// Hooks & Firebase
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getCurrencyByCountry } from '@/lib/currencies';

// Local Components & Constants
import { steps } from '@/app/landlord/properties/new/constants';
import { formSchema, type FormValues } from '@/app/landlord/properties/new/schemas';
import { StepNavigation } from '@/app/landlord/properties/new/components/step-navigation';
import { BasicInfoStep } from '@/app/landlord/properties/new/components/steps/BasicInfoStep';
import { LocationStep } from '@/app/landlord/properties/new/components/steps/LocationStep';
import { AmenitiesStep } from '@/app/landlord/properties/new/components/steps/AmenitiesStep';
import { LeaseTemplateStep } from '@/app/landlord/properties/new/components/steps/LeaseTemplateStep';
import { MediaUploadStep } from '@/app/landlord/properties/new/components/steps/MediaUploadStep';
import { AIStep } from '@/app/landlord/properties/new/components/steps/AIStep';
import { ReviewStep } from '@/app/landlord/properties/new/components/steps/ReviewStep';

// Types
import type { Property, UserProfile } from '@/types';
import type { ImageAnalysisMap } from './types';
import { authHeaders } from "@/lib/api-client";

function PropertyWizard({ draft }: { draft: PropertyDraft | null }) {
    const [currentStep, setCurrentStep] = useState(draft?.step ?? 1);
    const [draftId, setDraftId] = useState<string | null>(draft?.id ?? null);
    const [savedMedia, setSavedMedia] = useState<SavedMedia>(draft?.media ?? {});
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(draft ? toDate(draft.updatedAt) : null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const totalSteps = steps.length;
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [hasPrefilled, setHasPrefilled] = useState(!!draft);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    // Refs for circular dependency guards (Nigeria context)
    const isUpdatingType = useRef(false);
    const isUpdatingBedrooms = useRef(false);

    const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisMap>({
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
            // Empty strings (not undefined) keep the coordinate inputs controlled.
            lat: '',
            lng: '',
            ...(draft?.values ?? {}),
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
                headers: await authHeaders(),
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
            toast({ title: "Draft ready", description: "Review and personalise the description before publishing." });
        } catch (error) {
            toast({ variant: "destructive", title: "Could not draft a description", description: "Please write one manually or try again." });
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    /** Uploads any newly chosen photos/video and returns every slot's URL. */
    const uploadPendingMedia = async (values: Partial<FormValues>, folder: string): Promise<SavedMedia> => {
        const uploads = MEDIA_SLOTS.flatMap(({ field, key }) => {
            const file = (values[field] as FileList | null | undefined)?.[0];
            return file ? [{ key, promise: uploadMedia(file, `${folder}/${key}`, { raw: key === 'video' }) }] : [];
        });
        const urls = await Promise.all(uploads.map((u) => u.promise));
        const media: SavedMedia = { ...savedMedia };
        uploads.forEach((u, i) => (media[u.key] = urls[i]));
        return media;
    };

    const saveDraft = async () => {
        if (!user) return;
        setIsSavingDraft(true);
        try {
            const values = form.getValues();
            const id = draftId ?? doc(collection(firestore, 'propertyDrafts')).id;
            const media = await uploadPendingMedia(values, `properties/${user.uid}/${id}`);
            const now = new Date().toISOString();
            await setDoc(
                doc(firestore, 'propertyDrafts', id),
                {
                    id,
                    landlordId: user.uid,
                    title: values.title?.trim() || 'Untitled listing',
                    step: currentStep,
                    values: toDraftValues(values),
                    media,
                    updatedAt: now,
                    ...(draftId ? {} : { createdAt: now }),
                },
                { merge: true },
            );
            // Uploaded files now live in `media`; clear the file inputs so they
            // aren't uploaded twice, and mark the form as clean.
            MEDIA_SLOTS.forEach(({ field }) => form.setValue(field, null));
            form.reset(form.getValues());
            setSavedMedia(media);
            setLastSavedAt(new Date());
            if (!draftId) {
                setDraftId(id);
                window.history.replaceState(null, '', `/landlord/properties/new?draft=${id}`);
            }
            toast({ title: 'Draft saved', description: 'Find it any time under Properties → Drafts.' });
        } catch (error) {
            console.error('Save draft failed:', error);
            const isStorage = getErrorCode(error)?.startsWith('storage/');
            toast({
                variant: 'destructive',
                ...(isStorage ? describeUploadError(error) : { title: 'Could not save draft', description: 'Please try again.' }),
            });
        } finally {
            setIsSavingDraft(false);
        }
    };

    // Warn before leaving with unsaved changes.
    const isDirty = form.formState.isDirty;
    useEffect(() => {
        if (!isDirty || isSubmitting) return;
        const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty, isSubmitting]);

    const onPreSubmit = (values: FormValues) => {
        handleFinalSubmit(values);
    };

    const handleFinalSubmit = async (values: FormValues) => {
        if (!user) return;
        setIsSubmitting(true);

        try {
            const propertyRef = doc(firestore, 'properties', draftId ?? doc(collection(firestore, 'properties')).id);
            const media = await uploadPendingMedia(values, `properties/${user.uid}/${propertyRef.id}`);
            const images = MEDIA_SLOTS.filter(({ key }) => key !== 'video').flatMap(({ key }) => (media[key] ? [media[key]!] : []));
            const videoUrl = media.video ?? '';

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

            await setDoc(propertyRef, propertyData);
            if (draftId) await deleteDoc(doc(firestore, 'propertyDrafts', draftId)).catch(() => undefined);
            form.reset(form.getValues()); // clean, so the leave-page warning doesn't fire
            
            toast({ title: "Property listed", description: "Your property is now live on Lodger." });
            router.push(`/landlord/properties/${propertyRef.id}?new=true`);
        } catch (error) {
            console.error('Publish failed:', error);
            const isStorage = getErrorCode(error)?.startsWith('storage/');
            toast({
                variant: 'destructive',
                ...(isStorage
                    ? describeUploadError(error)
                    : { title: 'Could not publish', description: 'Your work is still here — save it as a draft and try again.' }),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const savedLabel = isSavingDraft
        ? 'Saving…'
        : lastSavedAt
            ? `Draft saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}${isDirty ? ' · unsaved changes' : ''}`
            : 'Not saved yet';

    return (
        <div className="space-y-6">
            <PageHeader
                back={{ href: '/landlord/properties', label: 'Properties' }}
                title={draft ? 'Finish your listing' : 'Add a property'}
                description={
                    <span className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', lastSavedAt && !isDirty ? 'bg-emerald-500' : 'bg-amber-500')} aria-hidden />
                        Step {currentStep} of {totalSteps} · {savedLabel}
                    </span>
                }
                actions={
                    <Button type="button" variant="outline" className="rounded-xl" onClick={saveDraft} disabled={isSavingDraft || isSubmitting}>
                        {isSavingDraft ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                        Save draft
                    </Button>
                }
            />
            <Progress value={(currentStep / totalSteps) * 100} className="h-1.5" aria-label={`Step ${currentStep} of ${totalSteps}`} />

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-4">
                {/* Fixed Navigation Sidebar */}
                <aside className="hidden lg:sticky lg:top-24 lg:block">
                    <StepNavigation steps={steps} currentStep={currentStep} />
                </aside>

                {/* Form Content Area */}
                <main className="lg:col-span-3">
                    <Form {...form}>
                        <form className="space-y-8 rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
                            <AnimatePresence mode="wait">
                                <section key={currentStep}>
                                    {currentStep === 1 && <BasicInfoStep form={form} />}
                                    {currentStep === 2 && <LocationStep form={form} />}
                                    {currentStep === 3 && <AmenitiesStep form={form} />}
                                    {currentStep === 4 && <LeaseTemplateStep form={form} />}
                                    {currentStep === 5 && (
                                        <MediaUploadStep
                                            form={form}
                                            setImageAnalysis={setImageAnalysis}
                                            savedMedia={savedMedia}
                                            onRemoveSaved={(key) => setSavedMedia(({ [key]: _removed, ...rest }) => rest)}
                                        />
                                    )}
                                    {currentStep === 6 && <AIStep form={form} isGeneratingDescription={isGeneratingDescription} generateAIDescription={generateAIDescription} />}
                                    {currentStep === 7 && <ReviewStep form={form} imageAnalysis={imageAnalysis} onEditMedia={() => setCurrentStep(5)} />}
                                </section>
                            </AnimatePresence>

                            <footer className="flex items-center justify-between gap-3 border-t pt-6">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={prevStep}
                                    disabled={currentStep === 1 || isSubmitting}
                                    className="rounded-xl disabled:invisible"
                                >
                                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={saveDraft}
                                        disabled={isSavingDraft || isSubmitting}
                                        className="rounded-xl sm:hidden"
                                        aria-label="Save draft"
                                    >
                                        <Save className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" onClick={nextStep} disabled={isSubmitting || isSavingDraft} className="min-w-36 rounded-xl">
                                        {isSubmitting ? (
                                            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Publishing…</>
                                        ) : currentStep === totalSteps ? (
                                            <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Publish listing</>
                                        ) : (
                                            <>Continue <ArrowRight className="ml-1.5 h-4 w-4" /></>
                                        )}
                                    </Button>
                                </div>
                            </footer>
                        </form>
                    </Form>
                </main>
            </div>
        </div>
    );
}

/** Loads `?draft=<id>` (if any) before mounting the wizard with it. */
function DraftLoader() {
    const searchParams = useSearchParams();
    const [draftId] = useState(() => searchParams.get('draft'));
    const firestore = useFirestore();
    const draftRef = useMemoFirebase(() => (draftId ? doc(firestore, 'propertyDrafts', draftId) : null), [draftId, firestore]);
    const { data: draft, isLoading } = useDoc<PropertyDraft>(draftRef);

    if (draftId && isLoading) return <PageSkeleton variant="form" />;
    if (draftId && !draft) {
        return (
            <EmptyState
                icon={FileQuestion}
                title="This draft no longer exists"
                description="It may have been published or deleted."
                action={
                    <Button asChild className="rounded-xl">
                        <Link href="/landlord/properties">Back to properties</Link>
                    </Button>
                }
            />
        );
    }
    return <PropertyWizard key={draft?.id ?? 'new'} draft={draft ?? null} />;
}

export default function AddPropertyPage() {
    return (
        <Suspense fallback={<PageSkeleton variant="form" />}>
            <DraftLoader />
        </Suspense>
    );
}
