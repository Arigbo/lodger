import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowRight, Check, Zap, Users, BarChart } from "lucide-react";
import placeholderImages from '@/lib/placeholder-images.json';

export default function Home() {
  const heroImage = placeholderImages.placeholderImages.find(p => p.id === 'hero-image');

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-background py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-headline text-5xl font-bold md:text-7xl">
            Streamline Your Workflow
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
            A powerful and intuitive project management tool designed to help teams collaborate, organize, and deliver projects on time.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/auth/signup">Get Started for Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
          {heroImage && (
            <div className="relative mt-12 shadow-2xl rounded-lg">
                <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    width={1200}
                    height={675}
                    className="object-cover rounded-lg"
                    data-ai-hint={heroImage.imageHint}
                    priority
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            </div>
           )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="font-headline text-4xl font-bold">
              Everything You Need in One Place
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Discover the features that make our tool the best choice for your team.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                 <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                 </div>
                <CardTitle>Task Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Organize tasks, set deadlines, and assign them to team members. Track progress and ensure nothing falls through the cracks.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                 <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                 </div>
                <CardTitle>Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Communicate with your team in real-time, share files, and keep everyone in the loop with project updates.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                 <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <BarChart className="h-6 w-6 text-primary" />
                 </div>
                <CardTitle>Reporting & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Gain insights into your team's performance with customizable dashboards and detailed reports.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-background py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="font-headline text-4xl font-bold">
              Choose the Right Plan for You
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Simple, transparent pricing that scales with your needs.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3 md:items-center">
             <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Free</CardTitle>
                    <CardDescription>For individuals and small teams just getting started.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-center text-5xl font-bold">$0<span className="text-base font-normal text-muted-foreground">/month</span></p>
                    <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Up to 3 projects</li>
                        <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Basic task management</li>
                        <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> 5GB file storage</li>
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" className="w-full">Choose Plan</Button>
                </CardFooter>
            </Card>
             <Card className="border-2 border-primary shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Pro</CardTitle>
                    <CardDescription>For growing teams that need more power and collaboration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-center text-5xl font-bold">$20<span className="text-base font-normal text-muted-foreground">/user/month</span></p>
                    <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Unlimited projects</li>
                        <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Advanced task management</li>
                        <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Team collaboration tools</li>
                        <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> 50GB file storage</li>
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button className="w-full">Choose Plan</Button>
                </CardFooter>
            </Card>
             <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Enterprise</CardTitle>
                    <CardDescription>For large organizations with advanced security and support needs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-center text-5xl font-bold">Contact</p>
                    <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Everything in Pro</li>
                        <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> SSO and advanced security</li>
                        <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Dedicated support</li>
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" className="w-full">Contact Sales</Button>
                </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
            <div className="bg-primary text-primary-foreground p-12 rounded-lg">
                <h2 className="font-headline text-4xl font-bold">
                Ready to Get Started?
                </h2>
                <p className="mt-2 max-w-2xl mx-auto">
                Join thousands of teams who are already building better, faster.
                </p>
                <Button
                    asChild
                    size="lg"
                    variant="secondary"
                    className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                    <Link href="/auth/signup">Sign Up Now <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
            </div>
        </div>
      </section>
    </div>
  );
}
