
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-4xl">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-lg max-w-none space-y-4">
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2>1. Introduction</h2>
          <p>
            Welcome to Lodger! These Terms of Service ("Terms") govern your use of our website and services. By accessing or using Lodger, you agree to be bound by these Terms.
          </p>

          <h2>2. Use of Our Services</h2>
          <p>
            You must be at least 18 years old to use our services. You are responsible for any activity that occurs through your account and you agree you will not sell, transfer, license or assign your account, username, or any account rights.
          </p>

          <h2>3. Content</h2>
          <p>
            Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.
          </p>

          <h2>4. Prohibited Activities</h2>
          <p>
            You agree not to engage in any of the following prohibited activities: (i) copying, distributing, or disclosing any part of the Service in any medium; (ii) using any automated system, including without limitation "robots," "spiders," "offline readers," etc., to access the Service; (iii) transmitting spam, chain letters, or other unsolicited email.
          </p>

          <h2>5. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>

          <h2>6. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.
          </p>

          <h2>7. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will provide at least 30 days' notice prior to any new terms taking effect.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


