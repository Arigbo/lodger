import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getUserById } from "@/lib/data";

export default function AccountPage() {
  const user = getUserById('user-2');

  if (!user) {
    return <div>User not found.</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <h1 className="font-headline text-3xl font-bold">Account Settings</h1>
      <p className="text-muted-foreground">Manage your profile and account settings.</p>
      <Separator className="my-6" />
      <div className="grid gap-10 md:grid-cols-3">
        <div className="md:col-span-1">
          <h2 className="font-semibold">Profile Picture</h2>
          <p className="mt-1 text-sm text-muted-foreground">Update your avatar.</p>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                        <Button>Change Picture</Button>
                        <p className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</p>
                    </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      <Separator className="my-8" />
      <div className="grid gap-10 md:grid-cols-3">
        <div className="md:col-span-1">
          <h2 className="font-semibold">Personal Information</h2>
          <p className="mt-1 text-sm text-muted-foreground">Update your personal details.</p>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardContent className="grid gap-6 p-6">
                    <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user.name} />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={user.email} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button>Save Changes</Button>
                </CardFooter>
            </Card>
        </div>
      </div>
       <Separator className="my-8" />
       <div className="grid gap-10 md:grid-cols-3">
        <div className="md:col-span-1">
          <h2 className="font-semibold text-destructive">Delete Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Permanently delete your account and all of your content.</p>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Delete Account</CardTitle>
                    <CardDescription>This action cannot be undone.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button variant="destructive">Delete My Account</Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
