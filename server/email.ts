// Email service using Resend
import { Resend } from 'resend';

async function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }
  
  return new Resend(apiKey);
}

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  try {
    const client = await getResendClient();
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:5000';
    
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
    
    const { error } = await client.emails.send({
      from: 'ForexAI <noreply@silverock.co.za>',
      to: [to],
      subject: 'Verify your ForexAI account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify your email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0066ff; margin: 0;">ForexAI</h1>
            <p style="color: #666; margin-top: 5px;">AI-Powered Trading Intelligence</p>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #333;">Verify your email address</h2>
            <p style="color: #555; line-height: 1.6;">
              Thanks for signing up for ForexAI! Please click the button below to verify your email address and activate your account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" 
                 style="background: #0066ff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #888; font-size: 14px;">
              This link will expire in 24 hours. If you didn't create an account with ForexAI, you can safely ignore this email.
            </p>
            
            <p style="color: #888; font-size: 14px; margin-top: 15px;">
              <strong>Note:</strong> If you don't see this email in your inbox, please check your spam or junk folder.
            </p>
          </div>
          
          <div style="text-align: center; color: #888; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} ForexAI. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}
