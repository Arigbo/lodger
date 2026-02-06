
'use client';

import React, { useEffect, useState } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Building, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { useUser, useFirestore, useDoc, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

import { Property, UserProfile, LeaseAgreement } from '@/types';
import { sendNotification } from '@/lib/notifications';
import Loading from '@/app/loading';
import { cn } from '@/utils';

import { editFormSchema, EditFormValues } from './edit-schemas';
import { DEFAULT_EDIT_VALUES } from './edit-constants';
import { convertPrice, parseRules } from './edit-utils';

import { IdentitySection } from './sections/IdentitySection';
import { GeographySection } from './sections/GeographySection';
import { SpecificationSection } from './sections/SpecificationSection';
import { MediaSection } from './sections/MediaSection';
import { AmenitiesSection } from './sections/AmenitiesSection';
import { RulesSection } from './sections/RulesSection';

export default function EditPropertyPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const router = useRouter();
  const { toast } = useToast();

  const propertyRef = useMemoFirebase(() => id ? doc(firestore, 'properties', id) : null, [firestore, id]);
  const { data: property, isLoading: isPropertyLoading, refetch } = useDoc<Property>(propertyRef);

  const [isUploading, setIsUploading] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [previousCurrency, setPreviousCurrency] = useState<string | null>(null);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: DEFAULT_EDIT_VALUES as any,
  });

  useEffect(() => {
    if (property) {
      form.reset({
        title: property.title || '',
        description: property.description || '',
        price: property.price || 0,
        currency: property.currency || 'USD',
        type: property.type as any,
        address: property.location?.address || '',
        country: property.location?.country || '',
        city: property.location?.city || '',
        state: property.location?.state || '',
        zip: property.location?.zip || '',
        school: property.location?.school || '',
        lat: property.location?.lat ?? '',
        lng: property.location?.lng ?? '',
        bedrooms: property.bedrooms || 1,
        bathrooms: property.bathrooms || 1,
        area: property.area || 0,
        amenities: property.amenities || [],
        rules: property.rules?.join(', ') || '',
      } as EditFormValues);
      setPreviousCurrency(property.currency || 'USD');
    }
  }, [property, form]);

  const handleCurrencyChange = (newCurrency: string) => {
    const currentCurrency = form.getValues('currency');
    if (newCurrency === currentCurrency) return;

    setPendingCurrency(newCurrency);
    setPreviousCurrency(currentCurrency);
    setShowCurrencyModal(true);
  };

  const confirmCurrencyConversion = (shouldConvert: boolean) => {
    if (!pendingCurrency || !previousCurrency) return;

    if (shouldConvert) {
      const currentPrice = form.getValues('price');
      const newPrice = convertPrice(currentPrice, previousCurrency, pendingCurrency);
      form.setValue('price', newPrice);
    }

    form.setValue('currency', pendingCurrency);
    setShowCurrencyModal(false);
    setPendingCurrency(null);
  };

  async function handleImageUpload(files: FileList | null) {
    if (!files || !property || !propertyRef) return;
    setIsUploading(true);

    const newImageUrls: string[] = [];
    const storage = getStorage(firebaseApp);

    for (const file of Array.from(files)) {
      try {
        const { moderateAndUpload } = await import('@/firebase/storage');
        const result = await moderateAndUpload(
          storage,
          `properties/${property.landlordId}/${Date.now()}_${file.name}`,
          file,
          { allowIrrelevant: true }
        );

        if (result.success && result.downloadURL) {
          newImageUrls.push(result.downloadURL);
        } else if (result.blocked) {
          toast({ variant: "destructive", title: "Image Blocked", description: `${file.name}: ${result.error}` });
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: `Could not upload ${file.name}` });
      }
    }

    if (newImageUrls.length > 0) {
      const updatedImages = [...(property.images || []), ...newImageUrls];
      await updateDoc(propertyRef, { images: updatedImages });
      toast({ title: "Images Uploaded", description: `${newImageUrls.length} new image(s) added.` });
      refetch();
    }
    setIsUploading(false);
  }

  async function handleRemoveImage(imageUrl: string) {
    if (!property || !propertyRef || !window.confirm("Are you sure?")) return;
    try {
      const storage = getStorage(firebaseApp);
      await deleteObject(ref(storage, imageUrl));
      const updatedImages = property.images.filter(url => url !== imageUrl);
      await updateDoc(propertyRef, { images: updatedImages });
      toast({ title: "Image Removed" });
      refetch();
    } catch (error) {
      toast({ variant: "destructive", title: "Deletion Failed" });
    }
  }

  async function handleVideoUpload(files: FileList | null) {
    if (!files || !property || !propertyRef) return;
    setIsUploading(true);
    try {
      const storage = getStorage(firebaseApp);
      const storageRef = ref(storage, `properties/${property.landlordId}/${Date.now()}_${files[0].name}`);
      const snapshot = await uploadBytes(storageRef, files[0]);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const updatedVideos = [...(property.videos || []), downloadURL];
      await updateDoc(propertyRef, { videos: updatedVideos });
      toast({ title: "Video Uploaded" });
      refetch();
    } catch (error) {
      toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveVideo(videoUrl: string) {
    if (!property || !propertyRef || !window.confirm("Are you sure?")) return;
    try {
      const storage = getStorage(firebaseApp);
      await deleteObject(ref(storage, videoUrl));
      const updatedVideos = (property.videos || []).filter(url => url !== videoUrl);
      await updateDoc(propertyRef, { videos: updatedVideos });
      toast({ title: "Video Removed" });
      refetch();
    } catch (error) {
      toast({ variant: "destructive", title: "Deletion Failed" });
    }
  }

  async function onSubmit(values: EditFormValues) {
    if (!property || !propertyRef) return;

    try {
      const updatedData = {
        title: values.title,
        description: values.description,
        price: values.price,
        currency: values.currency,
        type: values.type,
        location: {
          address: values.address,
          country: values.country,
          city: values.city,
          state: values.state,
          zip: values.zip,
          school: values.school || null,
          lat: typeof values.lat === 'number' ? values.lat : (values.lat ? parseFloat(values.lat as unknown as string) : null),
          lng: typeof values.lng === 'number' ? values.lng : (values.lng ? parseFloat(values.lng as unknown as string) : null),
        },
        bedrooms: values.bedrooms,
        bathrooms: values.bathrooms,
        area: values.area,
        amenities: values.amenities,
        rules: parseRules(values.rules || ''),
      };

      const termsChanged = values.price !== property.price || values.currency !== property.currency;

      await updateDoc(propertyRef, updatedData);

      if (termsChanged) {
        const leasesQuery = query(collection(firestore, 'leaseAgreements'), where('propertyId', '==', id));
        const leasesSnapshot = await getDocs(leasesQuery);
        for (const leaseDoc of leasesSnapshot.docs) {
          const lease = leaseDoc.data() as LeaseAgreement;
          if (['active', 'pending'].includes(lease.status)) {
            await updateDoc(leaseDoc.ref, { landlordSigned: false, tenantSigned: false, currency: values.currency });
            await sendNotification({ toUserId: lease.tenantId, type: 'LEASE_TERMS_CHANGED', firestore, propertyTitle: values.title, link: `/student/leases/${leaseDoc.id}` });
          }
        }
      }

      toast({ title: "Property Updated", description: "Changes saved successfully." });
      router.push(`/landlord/properties/${id}`);
    } catch (error) {
      toast({ variant: "destructive", title: "Update Failed", description: "Could not save changes." });
    }
  }

  if (isUserLoading || isPropertyLoading) return <Loading />;
  if (!property || (user && property.landlordId !== user.uid)) return notFound();

  return (
    <div className="min-h-screen bg-transparent p-0 lg:p-8 animate-in fade-in duration-1000">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground p-8 md:p-16 text-white shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Building className="h-32 w-32 md:h-48 md:w-48" />
          </div>
          <div className="relative space-y-6">
            <Link href={`/landlord/properties/${id}`} className="inline-flex items-center gap-2 text-white/40 hover:text-primary transition-colors uppercase text-[10px] font-black tracking-widest">
              <ArrowLeft className="h-4 w-4" /> Back to Asset
            </Link>
            <div>
              <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-4">
                Update <br /> <span className="text-primary italic">Asset</span>
              </h1>
              <p className="max-w-md text-sm md:text-base text-white/60 font-medium uppercase tracking-widest leading-relaxed">
                Refine the parameters of your property listing for optimal market positioning.
              </p>
            </div>
          </div>
        </div>

        <Card className="border-2 border-foreground/5 rounded-[3rem] shadow-2xl overflow-hidden bg-white/50 backdrop-blur-xl">
          <CardContent className="p-8 md:p-12">
            {property.status === 'occupied' && (
              <Alert className="mb-10 rounded-2xl border-2 border-amber-500/20 bg-amber-500/5 p-6 md:p-8">
                <AlertCircle className="h-6 w-6 text-amber-600" />
                <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Property Currently Occupied</AlertTitle>
                <AlertDescription className="text-xs font-medium text-amber-600/80 uppercase tracking-tight">
                  This property has an active tenant. Changes to price/rules apply to <strong>future</strong> leases only.
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12 md:space-y-20">
                <IdentitySection form={form} handleCurrencyChange={handleCurrencyChange} />
                <Separator className="bg-muted/10" />
                <GeographySection form={form} />
                <Separator className="bg-muted/10" />
                <SpecificationSection form={form} />
                <Separator className="bg-muted/10" />
                <MediaSection 
                  property={property} 
                  isUploading={isUploading} 
                  handleImageUpload={handleImageUpload} 
                  handleRemoveImage={handleRemoveImage}
                  handleVideoUpload={handleVideoUpload}
                  handleRemoveVideo={handleRemoveVideo}
                />
                <Separator className="bg-muted/10" />
                <AmenitiesSection form={form} />
                <Separator className="bg-muted/10" />
                <RulesSection form={form} />

                <div className="pt-12 border-t-2 border-muted/10 flex justify-end">
                  <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="h-16 md:h-20 px-12 md:px-20 rounded-2xl md:rounded-[2rem] bg-foreground text-white hover:bg-primary transition-all duration-500 shadow-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.3em] group">
                    {form.formState.isSubmitting ? (
                      <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Synchronizing...</>
                    ) : (
                      <><RefreshCw className="mr-3 h-5 w-5 transition-transform group-hover:rotate-180 duration-700" /> Commit Changes</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            <Dialog open={showCurrencyModal} onOpenChange={setShowCurrencyModal}>
              <DialogContent className="rounded-[2rem] border-2 border-foreground/5 p-0 overflow-hidden sm:max-w-md">
                <div className="bg-primary/5 p-8 flex flex-col items-center justify-center text-center border-b">
                   <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                    <RefreshCw className="h-8 w-8" />
                  </div>
                  <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">Currency Transition</DialogTitle>
                  <DialogDescription className="text-xs font-medium mt-3">
                    Transposing fiscal protocol from <strong>{previousCurrency}</strong> to <strong>{pendingCurrency}</strong>.
                  </DialogDescription>
                </div>
                <div className="p-8 space-y-4">
                  <Button type="button" variant="outline" onClick={() => confirmCurrencyConversion(false)} className="w-full h-14 rounded-xl border-2 font-black uppercase tracking-widest text-[10px]">Nominal Maintain</Button>
                  <Button type="button" onClick={() => confirmCurrencyConversion(true)} className="w-full h-14 rounded-xl bg-foreground text-white hover:bg-primary transition-all font-black uppercase tracking-widest text-[10px]">Dynamic Conversion</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
