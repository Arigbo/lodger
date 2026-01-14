
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { notFound, useParams, useRouter } from 'next/navigation';
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
import { amenities as allAmenities } from '@/types';
import { useEffect, useState } from 'react';
import type { Property } from '@/types';
import { useUser, useFirestore, useDoc, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { sendNotification } from '@/lib/notifications';
import type { LeaseAgreement } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import { UploadCloud, X, Loader2, Building, RefreshCw, AlertCircle, FileVideo, Video, Wifi, Car, Waves, Dumbbell, Home, Utensils, Sofa, ShieldCheck, Sparkles, Bath, BedDouble, ArrowRight } from 'lucide-react';
import Loading from '@/app/loading';
import Link from 'next/link';
import { Combobox } from '@/components/ui/combobox';
import { SchoolCombobox } from '@/components/school-combobox';
import { countries } from '@/types/countries';
import { cn } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { UserProfile } from '@/types';
import { getCurrencyByCountry } from '@/utils/currencies';

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(10, 'Description is required.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  currency: z.string().min(3, 'Currency is required.'),
  type: z.enum(['Apartment', 'House', 'Studio', 'Loft', 'Self Contain']),
  address: z.string().min(5, 'Address is required.'),
  country: z.string().min(2, 'Country is required.'),
  city: z.string().min(2, 'City is required.'),
  state: z.string().min(2, 'State is required.'),
  zip: z.string().min(5, 'ZIP code is required.'),
  school: z.string().optional(),
  bedrooms: z.coerce.number().int().min(1, 'Must have at least 1 bedroom.'),
  bathrooms: z.coerce.number().int().min(1, 'Must have at least 1 bathroom.'),
  area: z.coerce.number().positive('Area must be a positive number.'),
  amenities: z.array(z.string()).default([]),
  rules: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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

  // Fetch user profile for preferred currency
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const [isUploading, setIsUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // Currency Modal State
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [previousCurrency, setPreviousCurrency] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      currency: 'USD',
      type: 'Apartment',
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
    },
  });

  useEffect(() => {
    if (property) {
      form.reset({
        title: property.title || '',
        description: property.description || '',
        price: property.price || 0,
        currency: property.currency || 'USD',
        type: property.type,
        address: property.location?.address || '',
        country: property.location?.country || '',
        city: property.location?.city || '',
        state: property.location?.state || '',
        zip: property.location?.zip || '',
        school: property.location?.school || '',
        bedrooms: property.bedrooms || 1,
        bathrooms: property.bathrooms || 1,
        area: property.area || 0,
        amenities: property.amenities || [],
        rules: property.rules?.join(', ') || '',
      });
      setPreviousCurrency(property.currency || 'USD');
    }
  }, [property, form]);

  // Handle currency change with modal
  const handleCurrencyChange = (newCurrency: string) => {
    const currentPrice = form.getValues('price');
    const currentCurrency = form.getValues('currency');

    if (newCurrency === currentCurrency) return;

    setPendingCurrency(newCurrency);
    setPreviousCurrency(currentCurrency);
    setShowCurrencyModal(true);
  };

  const confirmCurrencyConversion = (convertPrice: boolean) => {
    if (!pendingCurrency || !previousCurrency) return;

    if (convertPrice) {
      // Simple mock conversion for demo purposes
      // In a real app, you'd fetch real-time rates
      const mockRates: Record<string, number> = {
        'USD': 1,
        'NGN': 1600,
        'GHS': 15,
        'KES': 130,
        'GBP': 0.79,
        'EUR': 0.92,
      };

      const currentPrice = form.getValues('price');
      const rateFrom = mockRates[previousCurrency] || 1;
      const rateTo = mockRates[pendingCurrency] || 1;

      // Price in USD * rateTo / rateFrom
      const newPrice = Math.round((currentPrice / rateFrom) * rateTo);
      form.setValue('price', newPrice);
    }

    form.setValue('currency', pendingCurrency);
    setShowCurrencyModal(false);
    setPendingCurrency(null);
  };

  if (isUserLoading || isPropertyLoading) {
    return <Loading />;
  }

  // If ID is not present (rare but possible in some router transitions), wait.
  if (!id) return <Loading />;

  // Authorization Check & Not Found
  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 bg-card rounded-lg border">
        <div className="rounded-full bg-secondary p-4">
          <Building className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Property Not Found</h1>
        <p className="mt-2 text-muted-foreground">The property you are looking for does not exist or you do not have permission to edit it.</p>
        <Button asChild className="mt-6">
          <Link href="/landlord/properties">Back to My Properties</Link>
        </Button>
      </div>
    );
  }

  if (user && property.landlordId !== user.uid) {
    return notFound();
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || !property || !propertyRef) return;
    setIsUploading(true);

    const newImageUrls: string[] = [];
    const storage = getStorage(firebaseApp);
    let blockedCount = 0;
    let warnedCount = 0;

    for (const file of Array.from(files)) {
      try {
        // Use moderation utility from storage.ts
        const { moderateAndUpload } = await import('@/firebase/storage');

        const result = await moderateAndUpload(
          storage,
          `properties/${property.landlordId}/${Date.now()}_${file.name}`,
          file,
          { allowIrrelevant: true } // Allow upload but warn for irrelevant images
        );

        if (result.success && result.downloadURL) {
          newImageUrls.push(result.downloadURL);

          // Show warning if image is irrelevant
          if (result.analysis?.context === 'IRRELEVANT') {
            warnedCount++;
          }
        } else if (result.blocked) {
          // Image was blocked due to safety concerns
          blockedCount++;
          toast({
            variant: "destructive",
            title: "Image Blocked",
            description: `${file.name}: ${result.error || 'Contains inappropriate content'}`,
          });
        } else {
          // Other error
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: `${file.name}: ${result.error || 'Unknown error'}`,
          });
        }
      } catch (error: any) {
        console.error("Error uploading image:", error);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: `Could not upload ${file.name}: ${error.message}`,
        });
      }
    }

    if (newImageUrls.length > 0) {
      const updatedImages = [...(property?.images || []), ...newImageUrls];
      await updateDoc(propertyRef, { images: updatedImages });

      let description = `${newImageUrls.length} new image(s) have been added.`;
      if (warnedCount > 0) {
        description += ` ${warnedCount} image(s) may not be relevant to property listings.`;
      }
      if (blockedCount > 0) {
        description += ` ${blockedCount} image(s) were blocked for safety.`;
      }

      toast({
        title: "Images Uploaded",
        description,
      });
      refetch();
    } else if (blockedCount > 0) {
      toast({
        variant: "destructive",
        title: "No Images Uploaded",
        description: "All images were blocked due to safety concerns.",
      });
    }

    setImageFiles([]);
    setIsUploading(false);
  }

  async function handleRemoveImage(imageUrl: string) {
    if (!property || !propertyRef) return;
    if (!property?.images) return;

    const isConfirmed = window.confirm("Are you sure you want to delete this image? This cannot be undone.");
    if (!isConfirmed) return;

    try {
      const storage = getStorage(firebaseApp);
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);

      const updatedImages = property.images.filter(url => url !== imageUrl);
      await updateDoc(propertyRef, { images: updatedImages });

      toast({ title: "Image Removed", description: "The image has been successfully deleted." });
      refetch();
    } catch (error: unknown) {
      console.error("Error deleting image:", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: "Could not remove the image. It may have already been deleted." });
    }
  }

  async function handleVideoUpload(files: FileList | null) {
    if (!files || !property || !propertyRef) return;
    setIsUploading(true);

    const storage = getStorage(firebaseApp);
    const file = files[0];
    const path = `properties/${property.landlordId}/${Date.now()}_${file.name}`;

    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const updatedVideos = [...(property?.videos || []), downloadURL];
      await updateDoc(propertyRef, { videos: updatedVideos });

      toast({ title: "Video Uploaded", description: "Your walkthrough video has been added." });
      refetch();
    } catch (error: any) {
      console.error("Error uploading video:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload video." });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveVideo(videoUrl: string) {
    if (!property || !propertyRef) return;
    if (!property?.videos) return;

    const isConfirmed = window.confirm("Are you sure you want to delete this video?");
    if (!isConfirmed) return;

    try {
      const storage = getStorage(firebaseApp);
      const videoRef = ref(storage, videoUrl);
      await deleteObject(videoRef);

      const updatedVideos = property.videos.filter(url => url !== videoUrl);
      await updateDoc(propertyRef, { videos: updatedVideos });

      toast({ title: "Video Removed", description: "The video has been deleted." });
      refetch();
    } catch (error: unknown) {
      console.error("Error deleting video:", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: "Could not remove video." });
    }
  }

  async function onSubmit(values: FormValues) {
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
          lat: property?.location?.lat ?? null,
          lng: property?.location?.lng ?? null,
        },
        bedrooms: values.bedrooms,
        bathrooms: values.bathrooms,
        area: values.area,
        amenities: values.amenities,
        rules: values.rules ? values.rules.split(',').map(r => r.trim()).filter(Boolean) : [],
      };
      const propertyTermChanged =
        values.price !== property.price ||
        values.currency !== property.currency ||
        values.address !== property.location.address ||
        values.city !== property.location.city ||
        values.state !== property.location.state ||
        values.zip !== property.location.zip ||
        values.country !== property.location.country;

      await updateDoc(propertyRef, updatedData);

      if (propertyTermChanged) {
        toast({
          title: "Syncing Lease Terms",
          description: "Terms changed. Updating associated lease agreements...",
        });

        const leasesQuery = query(collection(firestore, 'leaseAgreements'), where('propertyId', '==', id));
        const leasesSnapshot = await getDocs(leasesQuery);

        for (const leaseDoc of leasesSnapshot.docs) {
          const lease = { id: leaseDoc.id, ...leaseDoc.data() } as LeaseAgreement;
          if (lease.status === 'active' || lease.status === 'pending') {
            await updateDoc(leaseDoc.ref, {
              landlordSigned: false,
              tenantSigned: false,
              currency: values.currency,
              // We reset signatures to ensure both parties acknowledge the new price/terms
            });

            await sendNotification({
              toUserId: lease.tenantId,
              type: 'LEASE_TERMS_CHANGED',
              firestore: firestore,
              propertyTitle: values.title,
              link: `/student/leases/${leaseDoc.id}`
            });
          }
        }
      }

      toast({
        title: "Property Updated",
        description: "Your property details have been saved.",
      });
      router.push(`/landlord/properties/${id}`);
    } catch (error: unknown) {
      console.error("Error updating property:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save your changes. Please try again.",
      })
    }
  }

  return (
    <div className="min-h-screen bg-transparent p-0 lg:p-8 animate-in fade-in duration-1000">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-foreground to-foreground/80 p-8 md:p-16 text-white shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Building className="h-32 w-32 md:h-48 md:w-48" />
          </div>
          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Management Interface</span>
            </div>
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
            {property?.status === 'occupied' && (
              <Alert className="mb-10 rounded-2xl border-2 border-amber-500/20 bg-amber-500/5 p-6 md:p-8 animate-in slide-in-from-top duration-700">
                <AlertCircle className="h-6 w-6 text-amber-600" />
                <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2 font-headline">Property Currently Occupied</AlertTitle>
                <AlertDescription className="text-xs font-medium text-amber-600/80 uppercase tracking-tight leading-relaxed">
                  This property has an active tenant. Any changes to the price or rules will only apply to <strong>future</strong> lease agreements. The current lease terms remain unchanged.
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.error("Form Validation Errors:", errors, "Keys:", Object.keys(errors));
                console.log("Current Form Values:", form.getValues());
                toast({
                  variant: "destructive",
                  title: "Validation Error",
                  description: "Please check the form for errors and try again.",
                });
              })} className="space-y-12 md:space-y-20">

                {/* Basic Information Section */}
                <div className="space-y-10">
                  <div className="inline-flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Core Identity</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-8 md:gap-12">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Asset Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., MODERN DOWNTOWN LOFT" {...field} className="h-16 md:h-20 rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-lg md:text-2xl font-black uppercase tracking-tight" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Comprehensive Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe the essence of your property..." {...field} className="min-h-[150px] md:min-h-[200px] rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs md:text-sm font-medium p-4 md:p-6 italic" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Monthly Evaluation</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1200" {...field} className="h-16 md:h-20 rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xl md:text-3xl font-black text-primary" />
                            </FormControl>
                            <div className="mt-2 flex items-start gap-2 text-amber-600 bg-amber-500/10 p-4 rounded-xl border border-amber-500/10">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              <p className="text-[9px] font-bold leading-tight uppercase tracking-tight">
                                Price sync takes effect on the <strong>next cycle</strong> for active residents. New protocols will use updated values.
                              </p>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-8">
                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Currency Protocol</FormLabel>
                              <Select onValueChange={handleCurrencyChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-16 md:h-20 rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus:ring-0 text-sm md:text-base font-black uppercase tracking-widest">
                                    <SelectValue placeholder="Protocol" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase">
                                  <SelectItem value="USD">USD ($)</SelectItem>
                                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                                  <SelectItem value="GHS">GHS (₵)</SelectItem>
                                  <SelectItem value="KES">KES (KSh)</SelectItem>
                                  <SelectItem value="GBP">GBP (£)</SelectItem>
                                  <SelectItem value="EUR">EUR (€)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Asset Class</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-16 md:h-20 rounded-2xl md:rounded-3xl bg-muted/20 border-2 border-transparent focus:ring-0 text-sm md:text-base font-black uppercase tracking-widest">
                                    <SelectValue placeholder="Class" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase">
                                  <SelectItem value="Apartment">Apartment</SelectItem>
                                  <SelectItem value="House">House</SelectItem>
                                  <SelectItem value="Studio">Studio</SelectItem>
                                  <SelectItem value="Loft">Loft</SelectItem>
                                  <SelectItem value="Self Contain">Self Contain</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-muted/10" />
                {/* Location Section */}
                <div className="space-y-10">
                  <div className="inline-flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Home className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Geographic Position</h3>
                  </div>

                  <div className="space-y-8">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 UNIVERSITY AVE" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
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
                                }}
                                placeholder="SELECT COUNTRY"
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
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">State/Province</FormLabel>
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
                                placeholder="SELECT STATE"
                                disabled={!form.watch('country')}
                                emptyText={!form.watch('country') ? "Select a country first" : "No states found"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">City</FormLabel>
                            <FormControl>
                              <Input placeholder="URBANVILLE" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
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
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">ZIP Code</FormLabel>
                            <FormControl>
                              <Input placeholder="90210" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="school"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Search Nearest Educational Institution</FormLabel>
                            <FormControl>
                              <SchoolCombobox
                                value={field.value || ''}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-muted/10" />

                {/* Physical Specs Section */}
                <div className="space-y-10">
                  <div className="inline-flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Building className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Physical Specifications</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Sleeping Quarters</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
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
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Washrooms</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
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
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Total Area (SQFT)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1000" {...field} className="h-16 rounded-2xl bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs font-black uppercase tracking-widest" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator className="bg-muted/10" />
                {/* Media Section: Photos */}
                <div className="space-y-10">
                  <div className="inline-flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <ImageIcon className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Visual Documentation</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {property?.images.map((url) => (
                      <div key={url} className="relative group aspect-square rounded-[2rem] overflow-hidden border-2 border-foreground/5 shadow-inner">
                        <Image src={url} alt="Property image" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                          <Button variant="destructive" size="icon" className="h-10 w-10 rounded-full" onClick={(e) => { e.preventDefault(); handleRemoveImage(url); }}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove Image</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-center rounded-[2rem] border-2 border-dashed border-foreground/10 aspect-square hover:bg-primary/5 hover:border-primary/20 transition-all group">
                      <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-center p-4">
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <div className="h-12 w-12 rounded-xl bg-muted/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all mb-3 text-muted-foreground">
                              <UploadCloud className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">Add Photo</span>
                          </>
                        )}
                        <input
                          id="image-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => handleImageUpload(e.target.files)}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <Separator className="bg-muted/10" />

                {/* Media Section: Videos */}
                <div className="space-y-10">
                  <div className="inline-flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Video className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Cinematic Motion</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {property?.videos?.map((url) => (
                      <div key={url} className="relative group aspect-square bg-black rounded-[2rem] overflow-hidden border-2 border-foreground/5 shadow-inner">
                        <video src={url} className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                          <Button variant="destructive" size="icon" className="h-10 w-10 rounded-full" onClick={(e) => { e.preventDefault(); handleRemoveVideo(url); }}>
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                          <FileVideo className="h-3 w-3 text-white" />
                          <span className="text-[8px] font-black text-white uppercase tracking-widest">Walkthrough</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-center rounded-[2rem] border-2 border-dashed border-foreground/10 aspect-square hover:bg-primary/5 hover:border-primary/20 transition-all group">
                      <label htmlFor="video-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-center p-4">
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <div className="h-12 w-12 rounded-xl bg-muted/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all mb-3 text-muted-foreground">
                              <Video className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">Add Video</span>
                          </>
                        )}
                        <input
                          id="video-upload"
                          type="file"
                          accept="video/*"
                          className="sr-only"
                          onChange={(e) => handleVideoUpload(e.target.files)}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <Separator className="bg-muted/10" />

                {/* Amenities and Rules Section */}
                <div className="grid grid-cols-1 gap-12 md:gap-20">
                  <FormField
                    control={form.control}
                    name="amenities"
                    render={() => (
                      <FormItem className="space-y-10">
                        <div className="inline-flex items-center gap-4">
                          <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
                          </div>
                          <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Value-Added Features</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {allAmenities.map((item) => {
                            const getIcon = (name: string) => {
                              const n = name.toLowerCase();
                              if (n.includes('wi-fi')) return Wifi;
                              if (n.includes('parking')) return Car;
                              if (n.includes('laundry')) return RefreshCw;
                              if (n.includes('gym')) return Dumbbell;
                              if (n.includes('pool')) return Waves;
                              if (n.includes('yard')) return Home;
                              if (n.includes('pet')) return ShieldCheck;
                              if (n.includes('furnished')) return Sofa;
                              if (n.includes('secure')) return ShieldCheck;
                              if (n.includes('rooftop')) return Building;
                              if (n.includes('utilities')) return Sparkles;
                              if (n.includes('dishwasher')) return Utensils;
                              return Sparkles;
                            };
                            const Icon = getIcon(item);

                            return (
                              <FormField
                                key={item}
                                control={form.control}
                                name="amenities"
                                render={({ field }) => {
                                  const isSelected = field.value?.includes(item);
                                  return (
                                    <FormItem
                                      key={item}
                                      className={cn(
                                        "flex flex-row items-center space-x-4 space-y-0 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer group",
                                        isSelected
                                          ? "bg-foreground border-foreground text-white shadow-xl"
                                          : "bg-muted/5 border-muted/10 hover:border-primary/20 hover:bg-white"
                                      )}
                                      onClick={() => {
                                        const newValue = isSelected
                                          ? field.value?.filter((v: string) => v !== item)
                                          : [...(field.value || []), item];
                                        field.onChange(newValue);
                                      }}
                                    >
                                      <div className={cn(
                                        "p-2.5 rounded-xl shadow-sm transition-colors",
                                        isSelected ? "bg-white/10" : "bg-white"
                                      )}>
                                        <Icon className={cn("h-4 w-4", isSelected ? "text-white" : "text-primary")} />
                                      </div>
                                      <div className="flex-1">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.15em] cursor-pointer block">{item}</FormLabel>
                                      </div>
                                      <FormControl>
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => { }} // Handled by div click
                                          className={cn(
                                            "h-5 w-5 rounded-lg border-2",
                                            isSelected ? "border-white/20 bg-white/10" : "border-muted/20"
                                          )}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )
                                }}
                              />
                            )
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rules"
                    render={({ field }) => (
                      <FormItem className="space-y-10">
                        <div className="inline-flex items-center gap-4">
                          <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <ShieldCheck className="h-5 w-5 md:h-6 md:w-6" />
                          </div>
                          <h3 className="font-headline text-xl md:text-3xl font-black uppercase tracking-tighter">Operational Protocols</h3>
                        </div>
                        <FormControl>
                          <Textarea placeholder="e.g., No smoking, Quiet hours after 10 PM" {...field} className="min-h-[150px] md:min-h-[200px] rounded-[2rem] bg-muted/20 border-2 border-transparent focus-visible:border-primary/20 text-xs md:text-sm font-medium p-8 leading-relaxed italic" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-12 border-t-2 border-muted/10 flex justify-end">
                  <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="h-16 md:h-20 px-12 md:px-20 rounded-2xl md:rounded-[2rem] bg-foreground text-white hover:bg-primary transition-all duration-500 shadow-2xl hover:-translate-y-1 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] group">
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
                  <DialogDescription className="text-xs font-medium mt-3 max-w-xs mx-auto">
                    You are shifting the fiscal protocol from <strong>{previousCurrency}</strong> to <strong>{pendingCurrency}</strong>.
                  </DialogDescription>
                </div>
                <div className="p-8 space-y-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center">
                    Current Evaluation: {form.getValues('price')} {previousCurrency}
                  </p>
                  <div className="flex flex-col gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        confirmCurrencyConversion(false);
                      }}
                      className="h-14 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted/10 transition-colors"
                    >
                      Maintain Nominal Value
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        confirmCurrencyConversion(true);
                      }}
                      className="h-14 rounded-xl bg-foreground text-white hover:bg-primary transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Dynamic Conversion
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
