"use client";

import { ArrowLeft, ShieldAlert } from "lucide-react";
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

export default function ChildSafetyPage() {
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
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-base">Child Safety Standards</h1>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10 space-y-10">
        <div>
          <p className="text-sm text-muted-foreground">Last Updated: June 13, 2026</p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">1. Our Commitment to Child Safety</h2>
          <p className="text-muted-foreground leading-relaxed">
            ViMore is committed to providing a safe environment for all users, especially children.
            We have zero tolerance for child sexual abuse material (CSAM), child exploitation, or
            any content that harms minors. This policy outlines our standards, detection methods,
            and reporting procedures.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">2. Age Requirements</h2>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Minimum Age:</span> Users must be at
            least 13 years old to create a ViMore account.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Age Verification:</span> We use available
            methods to verify age during registration. Accounts suspected of belonging to underage
            users are reviewed and may be removed.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Parental Guidance:</span> We encourage
            parents and guardians to monitor their children's online activity and report any
            concerns.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">3. Prohibited Content and Behavior</h2>
          <p className="text-muted-foreground leading-relaxed">
            The following are strictly prohibited on ViMore:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
            <li>
              Child sexual abuse material (CSAM) in any form, including images, videos, text, or
              links
            </li>
            <li>Content that sexualizes minors</li>
            <li>Grooming or attempts to establish inappropriate contact with children</li>
            <li>Sharing personal information of minors without parental consent</li>
            <li>Bullying, harassment, or exploitation of children</li>
            <li>Content that encourages self-harm or suicide among minors</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">4. Detection and Prevention</h2>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Automated Scanning:</span> We use
            technology to detect and remove prohibited content.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Human Review:</span> Our moderation team
            reviews reported content within 24 hours.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Account Monitoring:</span> Suspicious
            accounts interacting with minors are flagged for review.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Keyword Filtering:</span> We block
            searches and messages related to child exploitation.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">5. Reporting Mechanisms</h2>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">In-App Reporting:</span> Users can report
            any post, message, profile, or comment by tapping the "Report" button and selecting
            "Child Safety Concern."
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Direct Reporting:</span> Email{" "}
            <EmailLink
              email="mediatechliberia@gmail.com"
              subject="ViMore Child Safety Report"
              body="Hello ViMore Safety Team,%0A%0AI am reporting a child safety concern on ViMore. Details below:%0A%0A"
            />{" "}
            with details and screenshots.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Anonymous Reporting:</span> Users may
            report without revealing their identity.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Law Enforcement:</span> We cooperate
            fully with local and international law enforcement agencies.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">6. Response to Violations</h2>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Immediate Content Removal:</span>{" "}
            Prohibited content is removed within 24 hours of detection.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Account Suspension:</span> Violating
            accounts are permanently banned.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Evidence Preservation:</span> We preserve
            evidence for law enforcement investigations.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Notification:</span> We notify relevant
            authorities as required by law.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">7. Cooperation with Authorities</h2>
          <p className="text-muted-foreground leading-relaxed">We work with:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
            <li>National Center for Missing and Exploited Children (NCMEC)</li>
            <li>ECPAT International</li>
            <li>Local Liberian law enforcement</li>
            <li>Interpol and other international agencies</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            We report CSAM discoveries to appropriate authorities within 24 hours.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">8. Education and Awareness</h2>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">In-App Messages:</span> We display child
            safety tips to users.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Parental Resources:</span> We provide
            guides for parents on our website.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Annual Training:</span> Our staff
            receives regular child protection training.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">9. Contact Information</h2>
          <div className="text-muted-foreground space-y-2 leading-relaxed">
            <p>
              <span className="font-medium text-foreground">Child Safety Team:</span>{" "}
              <PhoneLink
                number="+231778451835"
                message="Hi ViMore Child Safety Team, I need to report a child safety concern on ViMore."
              />
            </p>
            <p>
              <span className="font-medium text-foreground">General Support:</span>{" "}
              <EmailLink
                email="mediatechliberia@gmail.com"
                subject="ViMore Child Safety Inquiry"
                body="Hello ViMore Support,%0A%0AI have a child safety inquiry:%0A%0A"
              />
            </p>
            <p>
              <span className="font-medium text-foreground">Emergency:</span> Contact local police
              or child protective services immediately.
            </p>
          </div>
        </section>

        {/* Section 10 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">10. Policy Updates</h2>
          <p className="text-muted-foreground leading-relaxed">
            We review and update this policy annually or as needed. Changes are posted on our
            website and communicated to users.
          </p>
        </section>

        <div className="border-t border-border pt-6 space-y-1 text-center">
          <p className="font-semibold text-foreground">Media Tech Liberia</p>
          <p className="text-sm text-muted-foreground">Protecting Children Online</p>
          <p className="text-xs text-muted-foreground pt-2">
            © {new Date().getFullYear()} Media Tech Liberia. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
