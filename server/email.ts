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
      from: 'Forex Edge <noreply@silverock.co.za>',
      to: [to],
      subject: 'Verify your Forex Edge account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify your email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #111;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #00E396; margin: 0;">FOREX EDGE</h1>
            <p style="color: #888; margin-top: 5px; letter-spacing: 2px;">TRADE SMART</p>
          </div>
          
          <div style="background: #1a1a1a; border-radius: 8px; padding: 30px; margin-bottom: 20px; border: 1px solid #333;">
            <h2 style="margin-top: 0; color: #fff;">Verify your email address</h2>
            <p style="color: #aaa; line-height: 1.6;">
              Thanks for signing up for Forex Edge! Please click the button below to verify your email address and activate your account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" 
                 style="background: #00E396; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #888; font-size: 14px;">
              This link will expire in 24 hours. If you didn't create an account with Forex Edge, you can safely ignore this email.
            </p>
            
            <p style="color: #888; font-size: 14px; margin-top: 15px;">
              <strong style="color: #aaa;">Note:</strong> If you don't see this email in your inbox, please check your spam or junk folder.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Forex Edge. All rights reserved.</p>
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
