/**
 * Send an email using Brevo (Sendinblue) API via direct REST call
 * @param {Object} options 
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - HTML content of the email
 */
export const sendEmail = async ({ to, subject, htmlContent }) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'YourTherapist',
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@yourtherapist.com'
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo API Error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log(`📧 Email sent successfully to ${to}. Message ID: ${data.messageId}`);
    return data;
  } catch (error) {
    console.error('❌ Error sending email via Brevo:', error.message);
    throw new Error('Email could not be sent');
  }
};
