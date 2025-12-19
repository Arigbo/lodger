
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-4xl">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-lg max-w-none space-y-4">
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account, list a property, or communicate with other users. This may include your name, email address, phone number, and any messages or images you send through our platform.
          </p>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to operate, maintain, and provide you with the features and functionality of the Lodger service. This includes connecting students with landlords, processing rental requests, and personalizing your experience.
          </p>

          <h2>3. Sharing of Your Information</h2>
          <p>
            We may share your information with other users as necessary to facilitate a rental transaction (e.g., sharing a student's request with a landlord). We do not sell your personal information to third parties.
          </p>

          <h2>4. Data Security</h2>
          <p>
            We use commercially reasonable safeguards to help keep the information collected through the Service secure. However, no security system is impenetrable and we cannot guarantee the security of our systems 100%.
          </p>

          <h2>5. Your Choices About Your Information</h2>
          <p>
            You may, of course, decline to submit personally identifiable information through the Service, in which case Lodger may not be able to provide certain services to you. You may update or correct your account information at any time by logging in to your account.
          </p>

          <h2>6. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at privacy@lodger.com.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


