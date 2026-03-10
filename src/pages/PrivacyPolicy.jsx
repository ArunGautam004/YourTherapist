import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold text-text-primary mb-4">
            Privacy <span className="gradient-text">Policy</span>
          </h1>
          <p className="text-text-secondary mb-10">Last updated: March 10, 2026</p>

          <div className="prose-custom space-y-8">
            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">1. Information We Collect</h2>
              <div className="text-text-secondary text-sm leading-relaxed space-y-3">
                <p>We collect information you provide directly: name, email address, phone number, and health-related information shared during therapy sessions.</p>
                <p>We also automatically collect device information, IP addresses, and usage patterns to improve our service.</p>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">2. How We Use Your Information</h2>
              <div className="text-text-secondary text-sm leading-relaxed space-y-3">
                <p>Your information is used to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Provide and maintain our therapy services</li>
                  <li>Schedule and manage your appointments</li>
                  <li>Process payments securely through Razorpay</li>
                  <li>Send appointment reminders and important notifications</li>
                  <li>Improve our platform and user experience</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">3. Data Security</h2>
              <div className="text-text-secondary text-sm leading-relaxed space-y-3">
                <p>We implement industry-standard security measures including:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>End-to-end encryption for all therapy sessions</li>
                  <li>Encrypted data storage using AES-256</li>
                  <li>Secure HTTPS connections at all times</li>
                  <li>Regular security audits and vulnerability assessments</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">4. Data Sharing</h2>
              <div className="text-text-secondary text-sm leading-relaxed space-y-3">
                <p>We do not sell your personal data. We may share data with:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Your assigned therapist for treatment purposes</li>
                  <li>Payment processors (Razorpay) for transaction processing</li>
                  <li>Email service providers (Brevo) for sending notifications</li>
                  <li>Law enforcement when legally required</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">5. Your Rights</h2>
              <div className="text-text-secondary text-sm leading-relaxed space-y-3">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Access your personal data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your account and data</li>
                  <li>Export your data in a portable format</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display font-bold text-xl text-text-primary mb-3">6. Contact Us</h2>
              <div className="text-text-secondary text-sm leading-relaxed">
                <p>For privacy concerns, contact us at <a href="mailto:privacy@yourtherapist.com" className="text-primary font-medium hover:underline">privacy@yourtherapist.com</a></p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
