/**
 * Email Service
 * 
 * This service handles sending emails using SendGrid.
 */

import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key if available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY is not set. Email sending is disabled.');
}

// Check if SendGrid is configured
export function isEmailServiceConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY);
}

// Email interface
export interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!isEmailServiceConfigured()) {
    console.warn('Attempted to send email but SendGrid is not configured');
    return false;
  }

  try {
    await sgMail.send({
      to: options.to,
      from: options.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@property-intelligence.com',
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, '<br />')
    });
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send a property insight share email
 */
export async function sendPropertyInsightShareEmail(
  recipient: string,
  subject: string,
  message: string,
  shareUrl: string,
  propertyId: string,
  propertyName?: string,
  propertyAddress?: string
): Promise<boolean> {
  // Create HTML version with nicer formatting
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Property Insight Share</h2>
      <p>${message.replace(/\n/g, '<br />')}</p>
      
      <div style="margin: 20px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px; background-color: #f9f9f9;">
        <p style="margin: 5px 0;"><strong>Property ID:</strong> ${propertyId}</p>
        ${propertyName ? `<p style="margin: 5px 0;"><strong>Property Name:</strong> ${propertyName}</p>` : ''}
        ${propertyAddress ? `<p style="margin: 5px 0;"><strong>Address:</strong> ${propertyAddress}</p>` : ''}
      </div>
      
      <p>
        <a href="${shareUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4a5568; color: white; text-decoration: none; border-radius: 5px;">
          View Property Insight
        </a>
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
        This is an automated message from the Benton County Assessor's Office Property Intelligence Platform.
      </p>
    </div>
  `;

  return sendEmail({
    to: recipient,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@property-intelligence.com',
    subject,
    text: message,
    html: htmlContent
  });
}