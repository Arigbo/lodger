
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
import { UploadCloud, X, Loader2, Building, RefreshCw, AlertCircle } from 'lucide-react';
import Loading from '@/app/loading';
import Link from 'next/link';
import { Combobox } from '@/components/ui/combobox';
import { SchoolCombobox } from '@/components/school-combobox';
import { countries } from '@/types/countries';
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
  type: z.enum(['Apartment', 'House', 'Studio', 'Loft']),
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
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-3xl font-bold">Edit Property</CardTitle>
        <CardDescription>Make changes to your property listing.</CardDescription>
      </CardHeader>
      <CardContent>
        {property?.status === 'occupied' && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">Property Currently Occupied</AlertTitle>
            <AlertDescription className="text-amber-700">
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
          })} className="space-y-8">
            <h3 className="font-headline text-xl font-semibold">Basic Information</h3>
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
                    <div className="mt-1 flex items-start gap-1 text-amber-600">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      <p className="text-[10px] font-medium leading-tight">
                        Price changes take effect on the <strong>next rent payment</strong> for active tenants. New leases will use the updated price.
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={handleCurrencyChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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

            <Separator />
            <h3 className="font-headline text-xl font-semibold">Location</h3>
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
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Combobox
                        options={countries.map((c) => ({ label: c.name, value: c.name }))}
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          form.setValue('state', ''); // Reset state when country changes
                        }}
                        placeholder="Select country"
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
                    <FormLabel>State/Province</FormLabel>
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
                        placeholder="Select state"
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
              <FormField
                control={form.control}
                name="school"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Search Nearest School</FormLabel>
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

            <Separator />
            <h3 className="font-headline text-xl font-semibold">Property Details</h3>
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

            <Separator />
            <h3 className="font-headline text-xl font-semibold">Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {property?.images.map((url) => (
                <div key={url} className="relative group aspect-square">
                  <Image src={url} alt="Property image" fill className="object-cover rounded-lg" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="destructive" size="icon" onClick={() => handleRemoveImage(url)}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove Image</span>
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-input aspect-square">
                <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-center p-4">
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-muted-foreground" />
                      <span className="mt-2 text-sm text-muted-foreground">Upload Images</span>
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

            <Separator />
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

            <Separator />
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>

        <Dialog open={showCurrencyModal} onOpenChange={setShowCurrencyModal}>
          <DialogContent className="sm:max-w-md w-[95vw]">
            <DialogHeader>
              <DialogTitle>Update Currency</DialogTitle>
              <DialogDescription>
                You are changing the property currency from <strong>{previousCurrency}</strong> to <strong>{pendingCurrency}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                How would you like to handle the current price of <strong>{form.getValues('price')} {previousCurrency}</strong>?
              </p>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  confirmCurrencyConversion(false);
                }}
                className="w-full sm:flex-1"
              >
                Keep Price (Symbol Only)
              </Button>
              <Button
                type="button"
                onClick={() => {
                  confirmCurrencyConversion(true);
                }}
                className="w-full sm:flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Convert Automatically
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
