
'use client';

import { useState } from 'react';
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
import { amenities as allAmenities } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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

const steps = [
    { id: 1, name: 'Basic Information', fields: ['title', 'description', 'price', 'type'] },
    { id: 2, name: 'Location', fields: ['address', 'city', 'state', 'zip'] },
    { id: 3, name: 'Property Details', fields: ['bedrooms', 'bathrooms', 'area'] },
    { id: 4, name: 'Amenities & Rules', fields: ['amenities', 'rules'] },
    { id: 5, name: 'Review' }
];

export default function AddPropertyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = steps.length;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
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

  const nextStep = async () => {
    const fields = steps[currentStep - 1].fields;
    const output = await form.trigger(fields as (keyof FormValues)[], { shouldFocus: true });

    if (!output) return;

    if (currentStep < totalSteps) {
        setCurrentStep(step => step + 1);
    }
  }

  const prevStep = () => {
     if (currentStep > 1) {
        setCurrentStep(step => step - 1);
     }
  }

  function onSubmit(values: FormValues) {
    console.log('New Property Data:', values);
    // Here you would typically call an API to create the property
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
            <h3 className="font-headline text-xl font-semibold">{steps[currentStep-1].name}</h3>
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
                <Separator className="my-8"/>
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
                 <Separator className="my-8"/>
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
                <Separator className="my-8"/>
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
                                                ? field.onChange([...field.value, item])
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
            
            <div className={cn(currentStep === 5 ? "block" : "hidden")}>
                <h3 className="font-headline text-xl font-semibold">Review Your Listing</h3>
                <p className="text-muted-foreground">Please review all the information below before submitting.</p>
                <div className="mt-6 space-y-6 rounded-lg border bg-secondary/50 p-6">
                    <div className="space-y-2">
                        <h4 className="font-semibold">{form.getValues('title')}</h4>
                        <p className="text-muted-foreground">{form.getValues('address')}, {form.getValues('city')}</p>
                    </div>
                    <Separator/>
                    <p className="text-sm">{form.getValues('description')}</p>
                    <Separator/>
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
                    </div>
                    <Separator/>
                     <div>
                        <p className="text-sm font-medium">Amenities</p>
                        <p className="text-muted-foreground">{form.getValues('amenities').join(', ')}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium">Rules</p>
                        <p className="text-muted-foreground">{form.getValues('rules')}</p>
                    </div>

                </div>
            </div>


            <div className="mt-12 flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep} className={cn(currentStep === 1 && "invisible")}>
                <ArrowLeft className="mr-2 h-4 w-4"/> Back
              </Button>
              
              {currentStep < totalSteps -1 ? (
                <Button type="button" onClick={nextStep}>
                  Next <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
              ) : currentStep === totalSteps - 1 ? (
                <Button type="button" onClick={nextStep}>
                    Review <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
              ) : (
                <Button type="submit" size="lg">Create Property</Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
