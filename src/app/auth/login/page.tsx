
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Chrome } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function LoginForm({ userType }: { userType: 'student' | 'landlord' }) {
    return (
        <div className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor={`${userType}-email`}>Email</Label>
                <Input id={`${userType}-email`} type="email" placeholder="name@example.com" required />
            </div>
            <div className="grid gap-2">
                <div className="flex items-center">
                    <Label htmlFor={`${userType}-password`}>Password</Label>
                    <Link href="/auth/forgot-password" className="ml-auto inline-block text-sm underline">
                        Forgot your password?
                    </Link>
                </div>
                <Input id={`${userType}-password`} type="password" required />
            </div>
            <Button type="submit" className="w-full">Sign In as {userType.charAt(0).toUpperCase() + userType.slice(1)}</Button>
        </div>
    );
}

export default function LoginPage() {
  const [userType, setUserType] = useState('student');

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to continue to RentU</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="student" onValueChange={(value) => setUserType(value)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="student">Student</TabsTrigger>
                    <TabsTrigger value="landlord">Landlord</TabsTrigger>
                </TabsList>
                <TabsContent value="student" className="pt-6">
                    <LoginForm userType="student" />
                </TabsContent>
                <TabsContent value="landlord" className="pt-6">
                    <LoginForm userType="landlord" />
                </TabsContent>
            </Tabs>
          <Separator className="my-6" />
          <div className="space-y-4">
             <Button variant="outline" className="w-full">
                <Chrome className="mr-2 h-4 w-4" />
                Sign in with Google
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="font-medium text-primary underline-offset-4 hover:underline">
                    Sign up
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
