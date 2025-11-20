
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
import { amenities as allAmenities } from '@/lib/definitions';
import { useEffect, useState } from 'react';
import type { Property } from '@/lib/definitions';
import { useUser, useFirestore, useCollection, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { doc, updateDoc, collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import Loading from '@/app/loading';

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(10, 'Description is required.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  type: z.enum(['Apartment', 'House', 'Studio', 'Loft']),
  address: z.string().min(5, 'Address is required.'),
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
  
  const propertyQuery = useMemoFirebase(() => id ? query(collection(firestore, 'properties'), where('id', '==', id)) : null, [firestore, id]);
  const { data: properties, isLoading: isPropertyLoading, refetch } = useCollection<Property>(propertyQuery);
  const property = properties?.[0];

  const [isUploading, setIsUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      type: 'Apartment',
      address: '',
      city: '',
      state: '',
      zip: '',
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
        type: property.type,
        address: property.location?.address || '',
        city: property.location?.city || '',
        state: property.location?.state || '',
        zip: property.location?.zip || '',
        bedrooms: property.bedrooms || 1,
        bathrooms: property.bathrooms || 1,
        area: property.area || 0,
        amenities: property.amenities || [],
        rules: property.rules?.join(', ') || '',
      });
    }
  }, [property, form]);

  if (isUserLoading || isPropertyLoading) {
    return <Loading />;
  }

  if (!isPropertyLoading && (!property || (user && user.uid !== property.landlordId))) {
    return notFound();
  }

  async function handleImageUpload(files: FileList | null) {
      if (!files || !property) return;
      const propertyRef = doc(firestore, 'properties', property.id);
      setIsUploading(true);

      const newImageUrls: string[] = [];
      const storage = getStorage(firebaseApp);

      for (const file of Array.from(files)) {
          const imageRef = ref(storage, `properties/${property.id}/${Date.now()}_${file.name}`);
          try {
              const snapshot = await uploadBytes(imageRef, file);
              const downloadURL = await getDownloadURL(snapshot.ref);
              newImageUrls.push(downloadURL);
          } catch (error) {
              console.error("Error uploading image:", error);
              toast({ variant: "destructive", title: "Upload Failed", description: `Could not upload ${file.name}.` });
          }
      }

      if (newImageUrls.length > 0) {
          const updatedImages = [...(property?.images || []), ...newImageUrls];
          await updateDoc(propertyRef, { images: updatedImages });
          toast({ title: "Images Uploaded", description: `${newImageUrls.length} new image(s) have been added.` });
          refetch();
      }
      
      setImageFiles([]);
      setIsUploading(false);
  }

  async function handleRemoveImage(imageUrl: string) {
    if (!property) return;
    const propertyRef = doc(firestore, 'properties', property.id);
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
    } catch (error) {
        console.error("Error deleting image:", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: "Could not remove the image. It may have already been deleted." });
    }
  }

  async function onSubmit(values: FormValues) {
    if (!property) return;
    const propertyRef = doc(firestore, 'properties', property.id);

    try {
        const updatedData = {
            title: values.title,
            description: values.description,
            price: values.price,
            type: values.type,
            location: {
                address: values.address,
                city: values.city,
                state: values.state,
                zip: values.zip,
                lat: property?.location.lat,
                lng: property?.location.lng,
                school: property?.location.school,
            },
            bedrooms: values.bedrooms,
            bathrooms: values.bathrooms,
            area: values.area,
            amenities: values.amenities,
            rules: values.rules ? values.rules.split(',').map(r => r.trim()).filter(Boolean) : [],
        };
        await updateDoc(propertyRef, updatedData);
        toast({
            title: "Property Updated",
            description: "Your property details have been saved.",
        });
        router.push(`/landlord/properties/${id}`);
    } catch (error) {
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
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
      </CardContent>
    </Card>
  );
}
