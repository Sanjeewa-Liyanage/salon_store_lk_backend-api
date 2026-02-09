import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendMailService {
    private resend: Resend;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            Logger.error('Resend API key is not set in environment variables');
            throw new Error('Resend API key is required');
        }
        this.resend = new Resend(apiKey);
    }
    private getWelcomeEmailTemplate(userName: string, verificationLink: string) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9; }
                .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 30px; background-color: white; }
                .button { display: inline-block; padding: 12px 24px; color: white; background-color: #3498db; text-decoration: none; border-radius: 4px; font-weight: bold; }
                .footer { margin-top: 20px; text-align: center; font-size: 0.85em; color: #7f8c8d; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to Salon Store LK!</h1>
                </div>
                <div class="content">
                    <p>Hi ${userName},</p>
                    <p>We're thrilled to have you join our community at Salon Store LK.</p>
                    <p>To ensure we have the correct email address and to activate your account, please click the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}" class="button">Verify Email Address</a>
                    </div>
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                    <p>Best Regards,<br>The Salon Store LK Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Salon Store LK. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

 async sendVerificationEmail(email: string, token: string) {
  const verificationUrl =
    `https://salonstore.lk/auth/verify-email?token=${token}`;

  await this.resend.emails.send({
    from: 'SalonStore <noreply@salonstore.lk>',
    to: email,
    subject: 'Verify your SalonStore account',
    html: this.getWelcomeEmailTemplate(email, verificationUrl),
  });
}



}