/**
 * Send an email using Brevo (Sendinblue) API via direct REST call
 * @param {Object} options 
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - HTML content of the email
 */
export const sendEmail = async ({ to, subject, htmlContent }) => {
  const MAX_ATTEMPTS = 2;
  const REQUEST_TIMEOUT_MS = 15000;

  const shouldRetry = (status) => status === 429 || status >= 500;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_SENDER_NAME || 'YourTherapist',
            email: process.env.BREVO_SENDER_EMAIL || 'noreply@yourtherapist.com',
          },
          to: [{ email: to }],
          subject,
          htmlContent,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(`❌ Brevo API Error (attempt ${attempt}/${MAX_ATTEMPTS}):`, data);
        if (attempt < MAX_ATTEMPTS && shouldRetry(response.status)) {
          continue;
        }
        throw new Error(data.message || `Failed to send email (status ${response.status})`);
      }

      console.log(`📧 Email sent successfully to ${to}. Message ID: ${data.messageId || 'n/a'}`);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      const isAbort = error?.name === 'AbortError';
      const msg = isAbort ? 'Request timed out' : error.message;
      console.error(`❌ Error sending email via Brevo (attempt ${attempt}/${MAX_ATTEMPTS}):`, msg);

      if (attempt < MAX_ATTEMPTS) {
        continue;
      }
      throw new Error(`Email could not be sent: ${msg}`);
    }
  }
};
