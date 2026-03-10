import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold text-text-primary mb-4">
            Terms of <span className="gradient-text">Service</span>
          </h1>
          <p className="text-text-secondary mb-10">Last updated: March 10, 2026</p>

          <div className="prose-custom space-y-8">
            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">1. Acceptance of Terms</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                By accessing or using YourTherapist ("the Platform"), you agree to be bound by these Terms of Service. 
                If you do not agree, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">2. Services Description</h2>
              <div className="text-text-secondary text-sm leading-relaxed space-y-3">
                <p>YourTherapist provides an online platform connecting users with licensed mental health professionals. Our services include:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Video and chat-based therapy sessions</li>
                  <li>Appointment scheduling and management</li>
                  <li>Mood tracking and self-assessment tools</li>
                  <li>Secure messaging between patients and therapists</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">3. User Accounts</h2>
              <div className="text-text-secondary text-sm leading-relaxed space-y-3">
                <p>You must provide accurate, complete information when creating an account. You are responsible for maintaining the security of your account credentials.</p>
                <p>You must be at least 18 years old to use our services, or have parental/guardian consent if between 13-17 years old.</p>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">4. Payments & Refunds</h2>
              <div className="text-text-secondary text-sm leading-relaxed space-y-3">
                <p>All payments are processed through Razorpay. Fees are displayed before booking and are non-refundable after the session takes place.</p>
                <p>Cancellations made at least 24 hours before the session are eligible for a full refund. Cancellations within 24 hours may be subject to a cancellation fee.</p>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">5. Professional Disclaimer</h2>
              <div className="text-text-secondary text-sm leading-relaxed space-y-3">
                <p>Our platform is not a substitute for emergency services. If you are experiencing a medical emergency or are in danger, please call emergency services immediately.</p>
                <p>Therapists on our platform are independent licensed professionals. YourTherapist does not provide medical diagnoses or prescribe medication.</p>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">6. Confidentiality</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                All communication between you and your therapist is confidential and protected by applicable laws. 
                Therapists may only break confidentiality when required by law (e.g., risk of harm to self or others, 
                child abuse, or court orders).
              </p>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">7. Prohibited Conduct</h2>
              <div className="text-text-secondary text-sm leading-relaxed space-y-3">
                <p>You agree not to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use the platform for any unlawful purpose</li>
                  <li>Harass, abuse, or threaten other users or therapists</li>
                  <li>Share your account credentials with others</li>
                  <li>Record sessions without explicit consent</li>
                  <li>Attempt to reverse-engineer or hack the platform</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">8. Limitation of Liability</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                YourTherapist shall not be liable for any indirect, incidental, consequential, or punitive damages 
                arising from your use of the platform. Our total liability is limited to the amount paid by you 
                in the 12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">9. Contact</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                For questions about these terms, contact us at <a href="mailto:legal@yourtherapist.com" className="text-primary font-medium hover:underline">legal@yourtherapist.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
