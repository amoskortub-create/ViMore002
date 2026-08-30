"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

function PhoneLink({ number, message }: { number: string; message: string }) {
  const clean = number.replace(/\D/g, "");
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
    >
      {number}
    </a>
  );
}

function EmailLink({
  email,
  subject,
  body,
}: {
  email: string;
  subject: string;
  body: string;
}) {
  const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
    >
      {email}
    </a>
  );
}

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-16 px-4 flex items-center gap-3 bg-card/60 backdrop-blur border-b border-border sticky top-0 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-base">Privacy Policy</h1>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10 space-y-10">
        <div>
          <p className="text-sm text-muted-foreground">Last Updated: June 13, 2026</p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            ViMore ("we," "our," or "us") is operated by Media Tech Liberia. This Privacy Policy
            explains how we collect, use, store, and protect your personal information when you use
            the ViMore mobile application and website.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            By using ViMore, you agree to the collection and use of information in accordance with
            this policy. If you do not agree with this policy, please do not use our services.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">2. Information We Collect</h2>

          <div className="space-y-2">
            <h3 className="font-semibold">2.1 Information You Provide Directly</h3>
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Account Information:</span> When you
              register, we collect your name, email address, phone number, date of birth, profile
              photo, and username.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Content You Create:</span> Posts,
              stories, reels, messages, comments, and any media you upload.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Payment Information:</span> For manual
              currency purchases (Credits), we collect transaction details processed
              through our admin team.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">2.2 Information Collected Automatically</h3>
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Device Information:</span> Device type,
              operating system, unique device identifiers, and mobile network information.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Usage Data:</span> How you interact with
              ViMore, including pages visited, features used, time spent, and click patterns.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Log Data:</span> IP address, browser
              type, access times, and crash reports.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">3. How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">We use your information to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
            <li>Provide and maintain ViMore services</li>
            <li>Personalize your experience and content recommendations</li>
            <li>Process transactions and manage your account</li>
            <li>Communicate with you about updates, features, and security alerts</li>
            <li>Improve our app performance and develop new features</li>
            <li>Detect and prevent fraud, abuse, and security threats</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">4. How We Share Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell your personal information. We only share data in these situations:
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">With Other Users:</span> Your profile,
            posts, and public content are visible to other ViMore users based on your privacy
            settings.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">With Service Providers:</span> We use
            trusted third-party services for hosting, analytics, and customer support. These
            providers are contractually bound to protect your data.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">For Legal Reasons:</span> We may disclose
            information if required by law, court order, or to protect the rights and safety of
            ViMore, our users, or the public.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Business Transfers:</span> If Media Tech
            Liberia is involved in a merger or acquisition, your information may be transferred as
            part of that transaction.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">5. Data Storage and Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Storage Location:</span> Your data is
            stored on secure servers. Some data may be processed outside Liberia with appropriate
            safeguards.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Security Measures:</span> We use
            encryption, access controls, and regular security audits to protect your data. However,
            no internet transmission is 100% secure.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Data Retention:</span> We keep your
            information as long as your account is active. After account deletion, we remove
            personal data within 30 days, except where legal requirements demand longer retention.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">6. Your Rights and Choices</h2>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Access:</span> You can view your personal
            information in your profile settings.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Correction:</span> Update your profile
            information at any time.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Deletion:</span> Request account
            deletion, which removes your personal data within 30 days.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Marketing Preferences:</span> Opt out of
            promotional communications in your settings.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">7. Children's Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            ViMore is not intended for children under 13 years old. We do not knowingly collect
            information from children under 13. If we discover such data, we delete it immediately.
            Parents or guardians who believe their child has provided us with information should
            contact us at{" "}
            <PhoneLink
              number="+231778451835"
              message="Hi ViMore support, I am a parent/guardian and I believe my child has provided personal information to ViMore. I would like to request deletion of their data."
            />
            .
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">8. Cookies and Similar Technologies</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use cookies and local storage to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
            <li>Keep you logged in</li>
            <li>Remember your preferences</li>
            <li>Analyze app usage and performance</li>
            <li>Deliver relevant content</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            You can disable cookies through your device settings, but this may affect app
            functionality.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">9. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy periodically. We will notify you of significant
            changes through the app or email. The "Last Updated" date at the top shows when changes
            were made.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">10. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions, concerns, or data requests, contact:
          </p>

          <div className="text-muted-foreground space-y-1 leading-relaxed">
            <p className="font-semibold text-foreground">Media Tech Liberia</p>
            <p>
              Email:{" "}
              <EmailLink
                email="mediatechliberia@gmail.com"
                subject="ViMore Privacy Inquiry"
                body="Hello Media Tech Liberia,%0A%0AI have a question or concern regarding my data on ViMore:%0A%0A"
              />
            </p>
            <p>Address: Paynesvilla City, Liberia</p>
            <p>
              Phone:{" "}
              <PhoneLink
                number="+231778451835"
                message="Hi ViMore support, I have a privacy question or data request I'd like to discuss."
              />
            </p>
          </div>

          <div className="text-muted-foreground space-y-1 leading-relaxed">
            <p>
              <span className="font-medium text-foreground">Child Safety Concerns:</span>{" "}
              <EmailLink
                email="mediatechliberia@gmail.com"
                subject="ViMore Child Safety Concern"
                body="Hello Media Tech Liberia,%0A%0AI am writing regarding a child safety concern on ViMore:%0A%0A"
              />
            </p>
            <p>
              <span className="font-medium text-foreground">General Support:</span>{" "}
              <PhoneLink
                number="+231778451835"
                message="Hi ViMore support, I need help with a general inquiry."
              />
            </p>
          </div>
        </section>

        {/* Section 11 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">11. Legal Basis for Processing</h2>
          <p className="text-muted-foreground leading-relaxed">We process your data based on:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
            <li>Your consent (when you create an account)</li>
            <li>Contractual necessity (to provide our services)</li>
            <li>Legal obligations (to comply with laws)</li>
            <li>Legitimate interests (to improve security and prevent fraud)</li>
          </ul>
        </section>

        <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Media Tech Liberia. All rights reserved.
        </div>
      </main>
    </div>
  );
}
