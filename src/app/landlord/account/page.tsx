"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  useFirebaseApp,
} from "@/firebase";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEffect, useRef, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import type { UserProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { uploadProfileImage } from "@/firebase/storage";
import { getStorage } from "firebase/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, User, Wallet, Clock } from "lucide-react";
import Loading from "@/app/loading";
import { useSearchParams, useRouter } from "next/navigation";
import { countries } from "@/data/countries";
import { Combobox } from "@/components/ui/combobox";
import { getCurrencyByCountry } from "@/lib/currencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authHeaders } from "@/lib/api-client";
import { getErrorMessage, getErrorCode } from "@/lib/errors";

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number.").optional(),
  bio: z.string().max(200, "Bio must be less than 200 characters.").optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  currency: z.string().optional(),
});

const passwordFormSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
  });

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function AccountPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<{
    status: "incomplete" | "pending" | "active" | "checking" | "error";
    message: string;
  }>({ status: "checking", message: "" });

  const searchParams = useSearchParams();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      bio: "",
      country: "",
      state: "",
      currency: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Populate form once both user and userProfile are loaded
    if (user && userProfile) {
      profileForm.reset({
        name: userProfile.name || user.displayName || "",
        email: userProfile.email || user.email || "",
        phone: userProfile.phone || "",
        bio: userProfile.bio || "",
        country: userProfile.country || "",
        state: userProfile.state || "",
        currency: userProfile.currency || "",
      });
    }
  }, [user, userProfile, profileForm]);

  // Handle Stripe Connect Return
  useEffect(() => {
    const connectSuccess = searchParams.get("stripe_connect_success");
    const accountId = searchParams.get("account_id");

    if (connectSuccess && accountId && userDocRef) {
      // Save the Stripe Account ID to the user's profile
      setDoc(userDocRef, { stripeAccountId: accountId }, { merge: true })
        .then(() => {
          toast({
            title: "Payouts Enabled!",
            description: "Your Stripe account has been connected successfully.",
          });
          // Clean URL
          router.replace("/landlord/account");
        })
        .catch((err) => {
          console.error("Error saving stripe ID:", err);
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Could not save Stripe Account ID.",
          });
        });
    }
  }, [searchParams, userDocRef, router, toast]);

  // Check Stripe account status when stripeAccountId exists
  useEffect(() => {
    const checkStripeStatus = async () => {
      if (!userProfile?.stripeAccountId) {
        setStripeAccountStatus({ status: "incomplete", message: "" });
        return;
      }

      setStripeAccountStatus({
        status: "checking",
        message: "Checking account status...",
      });

      try {
        const response = await fetch("/api/stripe/account-status", {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({}),
        });


        if (!response.ok) {
          const text = await response.text();
          console.error("Stripe status error body:", text);
          try {
            const data = JSON.parse(text);
            setStripeAccountStatus({
              status: "error",
              message: data.error || `Error: ${response.statusText}`,
            });
          } catch (e) {
            setStripeAccountStatus({
              status: "error",
              message: `Server Error: ${response.status} ${response.statusText}`,
            });
          }
          return;
        }

        const data = await response.json();
        setStripeAccountStatus({
          status: data.status,
          message: data.message,
        });
      } catch (error) {
        console.error("Error checking Stripe status (FULL):", error);

        let errorMessage = "Failed to verify account status";
        if (error instanceof TypeError && getErrorMessage(error) === "Failed to fetch") {
          errorMessage =
            "Network error: Could not reach server. Check your connection.";
        } else if (getErrorMessage(error)) {
          errorMessage = getErrorMessage(error);
        }

        setStripeAccountStatus({
          status: "error",
          message: errorMessage,
        });
      }
    };

    checkStripeStatus();
  }, [userProfile?.stripeAccountId]);

  const handleConnectStripe = async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to get onboarding link");
      }
    } catch (error) {
      console.error("Stripe Connect Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(error),
      });
    }
  };

  const handleGoToStripeDashboard = async () => {
    if (!userProfile?.stripeAccountId) return;
    try {
      const response = await fetch("/api/stripe/dashboard", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error(data.error || "Failed to get dashboard link");
      }
    } catch (error) {
      console.error("Stripe Dashboard Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(error),
      });
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user || !userDocRef) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Image too large",
        description: "Please upload an image smaller than 5MB.",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a valid image file (JPG, PNG, WebP, etc.).",
      });
      return;
    }

    setIsUploading(true);
    try {
      const storage = getStorage(firebaseApp);
      const downloadURL = await uploadProfileImage(storage, user.uid, file);

      await setDoc(
        userDocRef,
        { profileImageUrl: downloadURL },
        { merge: true },
      );

      // Optimistic update
      setPreviewImage(downloadURL);

      toast({
        title: "Profile Picture Updated",
        description: "Your new profile picture has been saved.",
      });
    } catch (error) {
      console.error("Error uploading image: ", error);
      const errorMsg =
        getErrorMessage(error) ||
        "Could not upload your new profile picture. Please check that the file is a valid image and try again.";
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: errorMsg,
      });
      setPreviewImage(null); // Revert on failure
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  function onProfileSubmit(values: ProfileFormValues) {
    const { name, phone, bio, country, state, currency } = values;
    if (userDocRef) {
      setDoc(
        userDocRef,
        { name, phone, bio, country, state, currency },
        { merge: true },
      );
      toast({
        title: "Profile Updated",
        description: "Your public profile has been successfully updated.",
      });
    }
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    if (!user) return;

    try {
      const {
        EmailAuthProvider,
        reauthenticateWithCredential,
        updatePassword,
      } = await import("firebase/auth");
      const credential = EmailAuthProvider.credential(
        user.email!,
        values.currentPassword,
      );

      // 1. Re-authenticate
      await reauthenticateWithCredential(user, credential);

      // 2. Update password
      await updatePassword(user, values.newPassword);

      toast({
        title: "Password Updated",
        description:
          "Your security credentials have been successfully refreshed.",
      });
      passwordForm.reset();
    } catch (error) {
      console.error("Password update error:", error);
      let message =
        "Could not update password. Please check your current password.";
      if (getErrorCode(error) === "auth/wrong-password") {
        message = "The current password you entered is incorrect.";
      } else if (getErrorCode(error) === "auth/weak-password") {
        message = "The new password is too weak.";
      }
      toast({
        variant: "destructive",
        title: "Security Update Failed",
        description: message,
      });
    }
  }

  if (isUserLoading || isProfileLoading) {
    return <Loading />;
  }

  if (!user || !userProfile || !userDocRef) {
    return <div>Please log in to view your account settings.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-muted/30 p-6 md:p-14 border border-white/40 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="relative group">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-8 border-white shadow-sm transition-transform duration-500 group-hover:scale-105">
              <AvatarImage
                src={previewImage || userProfile?.profileImageUrl}
                className="object-cover"
              />
              <AvatarFallback className="bg-muted text-4xl">
                <User className="h-16 w-16 text-muted-foreground/40" />
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-sm hover:scale-110 active:scale-95 transition-all"
            >
              <Pencil className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 text-center md:text-left">
            <h1 className="font-headline text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Account settings
            </h1>
            <p className="max-w-md text-lg font-medium text-muted-foreground/80 leading-relaxed font-sans">
              Manage your profile, payments, and account security.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full space-y-10">
        <TabsList className="h-16 w-full max-w-md grid grid-cols-2 p-1 bg-muted/30 rounded-3xl border border-white/40 shadow-inner">
          <TabsTrigger
            value="profile"
            className="rounded-2xl font-bold text-sm uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-2xl font-bold text-sm uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all"
          >
            Payments & Security
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="profile"
          className="space-y-10 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <Card className="border-none bg-card shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="p-6 border-b border-muted/20">
              <CardTitle className="text-2xl font-bold">
                Profile Info
              </CardTitle>
              <CardDescription className="text-lg font-medium text-muted-foreground/60">
                This is what tenants see when they apply to your properties.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Full Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your business name or full name"
                              className="h-14 rounded-2xl border bg-muted/10 focus:bg-card focus:ring-4 focus:ring-primary/10 font-bold"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Contact Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(555) 000-0000"
                              className="h-14 rounded-2xl border bg-muted/10 focus:bg-card focus:ring-4 focus:ring-primary/10 font-bold"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-3 md:col-span-2">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Primary Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="h-14 rounded-2xl border bg-muted/10 opacity-60 font-bold"
                              {...field}
                              disabled
                            />
                          </FormControl>
                          <FormDescription className="text-muted-foreground/60 font-medium">
                            Your verified contact email.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem className="space-y-3 md:col-span-2">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            About You
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your management style or properties…"
                              className="min-h-[120px] rounded-2xl border bg-muted/10 focus:bg-card focus:ring-4 focus:ring-primary/10 font-bold resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
                    <FormField
                      control={profileForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-3">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Country
                          </FormLabel>
                          <Combobox
                            options={countries.map((c) => ({
                              label: c.name,
                              value: c.name,
                            }))}
                            value={field.value}
                            onChange={(val) => {
                              field.onChange(val);
                              const suggestedCurrency =
                                getCurrencyByCountry(val);
                              if (suggestedCurrency) {
                                profileForm.setValue(
                                  "currency",
                                  suggestedCurrency,
                                );
                              }
                              profileForm.setValue("state", "");
                            }}
                            placeholder="Select country"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-3">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Region
                          </FormLabel>
                          <Combobox
                            options={
                              countries
                                .find(
                                  (c) =>
                                    c.name === profileForm.watch("country"),
                                )
                                ?.states.map((s) => ({
                                  label: s.name,
                                  value: s.name,
                                })) || []
                            }
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select state"
                            disabled={!profileForm.watch("country")}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Primary Currency
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "USD"}
                          >
                            <FormControl>
                              <SelectTrigger className="h-14 rounded-2xl border bg-muted/10 font-bold">
                                <SelectValue placeholder="USD" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl border-none shadow-sm p-2">
                              <SelectItem
                                value="USD"
                                className="rounded-xl py-3 font-bold"
                              >
                                USD - US Dollar
                              </SelectItem>
                              <SelectItem
                                value="NGN"
                                className="rounded-xl py-3 font-bold"
                              >
                                NGN - Nigerian Naira
                              </SelectItem>
                              <SelectItem
                                value="GHS"
                                className="rounded-xl py-3 font-bold"
                              >
                                GHS - Ghanaian Cedi
                              </SelectItem>
                              <SelectItem
                                value="KES"
                                className="rounded-xl py-3 font-bold"
                              >
                                KES - Kenyan Shilling
                              </SelectItem>
                              <SelectItem
                                value="GBP"
                                className="rounded-xl py-3 font-bold"
                              >
                                GBP - British Pound
                              </SelectItem>
                              <SelectItem
                                value="EUR"
                                className="rounded-xl py-3 font-bold"
                              >
                                EUR - Euro
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-8 border-t border-muted/10">
                    <Button
                      type="submit"
                      size="lg"
                      className="h-11 px-6 rounded-2xl font-bold text-lg shadow-sm hover:-translate-y-1 transition-all"
                    >
                      Update profile
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="settings"
          className="space-y-10 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-10">
              {/* Stripe Card */}
              <Card className="border-none bg-card shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="p-6 border-b border-muted/20">
                  <CardTitle className="text-2xl font-bold">
                    Rent Payments
                  </CardTitle>
                  <CardDescription className="text-lg font-medium text-muted-foreground/60">
                    Manage how you receive rent payments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {userProfile?.stripeAccountId ? (
                    <div className="space-y-6">
                      {stripeAccountStatus.status === "active" ? (
                        <div className="flex flex-col gap-6">
                          <div className="flex items-center justify-between p-8 rounded-3xl bg-green-500/5 border border-green-500/10">
                            <div className="flex items-center gap-6">
                              <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                <Wallet className="h-7 w-7 text-green-600" />
                              </div>
                              <div>
                                <p className="font-bold uppercase tracking-tight text-green-900">
                                  Stripe active
                                </p>
                                <p className="text-sm font-medium text-green-700/80">
                                  {stripeAccountStatus.message}
                                </p>
                              </div>
                            </div>
                            <div className="hidden md:block h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button
                              onClick={handleGoToStripeDashboard}
                              variant="outline"
                              className="h-14 rounded-2xl font-semibold text-xs uppercase tracking-wider border hover:bg-muted/50 transition-all"
                            >
                              Payouts
                            </Button>
                            <Button
                              variant="outline"
                              className="h-14 rounded-2xl font-semibold text-xs uppercase tracking-wider border opacity-50 cursor-not-allowed"
                              disabled
                            >
                              Download tax documents
                            </Button>
                          </div>
                          <p className="text-xs font-medium text-muted-foreground/60 text-center uppercase tracking-wider">
                            Partner ID: {userProfile.stripeAccountId}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-6 p-8 rounded-3xl bg-orange-500/5 border border-orange-500/10">
                          <div className="flex items-center gap-6">
                            <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                              <Clock className="h-7 w-7 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-bold uppercase tracking-tight text-orange-900">
                                Verification pending
                              </p>
                              <p className="text-sm font-medium text-orange-700/80">
                                {stripeAccountStatus.message}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col md:flex-row gap-4">
                            <Button
                              onClick={handleConnectStripe}
                              className="flex-1 h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs uppercase tracking-wider shadow-sm"
                            >
                              Resume registration
                            </Button>
                            <Button
                              onClick={handleGoToStripeDashboard}
                              variant="outline"
                              className="flex-1 h-14 rounded-2xl border font-semibold text-xs uppercase tracking-wider"
                            >
                              Check Stripe status
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <p className="text-lg font-medium text-muted-foreground leading-relaxed">
                          To get paid by tenants, you need to link a Stripe
                          account. This makes it easy to receive rent directly
                          into your bank account.
                        </p>
                        <ul className="space-y-3 font-sans font-semibold text-muted-foreground/80">
                          <li className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            Automated monthly rent collection
                          </li>
                          <li className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            Direct bank deposits (Daily/Weekly)
                          </li>
                          <li className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            Professional tax documentation
                          </li>
                        </ul>
                      </div>
                      <Button
                        onClick={handleConnectStripe}
                        size="lg"
                        className="h-11 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#635BFF]/90 text-white font-bold transition-all shadow-sm shadow-[#635BFF]/20 group"
                      >
                        Connect with Stripe
                        <span className="ml-2 group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none bg-card shadow-sm rounded-3xl">
                <CardHeader className="p-6">
                  <CardTitle className="text-2xl font-bold">
                    Security
                  </CardTitle>
                  <CardDescription className="text-lg font-medium text-muted-foreground/60">
                    Update your password here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <Form {...passwordForm}>
                    <form
                      onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                      className="space-y-8"
                    >
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                              Current Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="h-14 rounded-2xl border bg-muted/10 font-bold"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                New Password
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="h-14 rounded-2xl border bg-muted/10 font-bold"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                Confirm New Password
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="h-14 rounded-2xl border bg-muted/10 font-bold"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="h-11 rounded-2xl px-6 font-semibold uppercase text-xs tracking-wider border"
                      >
                        Update password
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-10">
              <Card className="border-none bg-card shadow-sm rounded-3xl">
                <CardHeader className="p-6">
                  <CardTitle className="text-xl font-bold">
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/10 border">
                    <label className="font-bold text-sm uppercase">
                      Rental Requests
                    </label>
                    <Switch
                      defaultChecked
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/10 border">
                    <label className="font-bold text-sm uppercase">
                      System Emails
                    </label>
                    <Switch
                      defaultChecked
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-destructive/20 bg-destructive/5 rounded-3xl overflow-hidden">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="text-destructive font-bold uppercase">
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed">
                    Deleting your account is permanent. This will remove all
                    your properties and history.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full h-14 rounded-2xl font-semibold uppercase text-xs tracking-wider shadow-lg"
                      >
                        Delete account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl p-6 border-none shadow-sm">
                      <AlertDialogHeader className="space-y-4">
                        <AlertDialogTitle className="text-3xl font-bold tracking-tight">
                          Confirm deletion
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-lg font-medium leading-relaxed font-sans">
                          Are you absolutely certain? This will permanently
                          delete your profile, listings and all
                          operational data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="pt-8 gap-4">
                        <AlertDialogCancel className="h-14 rounded-2xl font-bold border">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction className="h-14 rounded-2xl font-bold bg-destructive hover:bg-destructive/90 text-white">
                          YES, DELETE ACCOUNT
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}
