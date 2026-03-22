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

    private sendOtpEmail(otp: string) {
       return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9; }
                .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 30px; background-color: white; }
                .otp-box { background-color: #ecf0f1; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
                .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2c3e50; }
                .footer { margin-top: 20px; text-align: center; font-size: 0.85em; color: #7f8c8d; }
                .warning { color: #e74c3c; font-size: 0.9em; margin-top: 15px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your OTP Code</h1>
                </div>
                <div class="content">
                    <p>Hi,</p>
                    <p>You have requested a One-Time Password (OTP) to proceed with your action on Salon Store LK.</p>
                    <div class="otp-box">
                        <p style="margin: 0; font-size: 14px; color: #7f8c8d;">Your OTP Code is:</p>
                        <p class="otp-code">${otp}</p>
                    </div>
                    <p>This code will expire in 10 minutes for security purposes.</p>
                    <p class="warning">⚠️ Please do not share this code with anyone. Our team will never ask for your OTP.</p>
                    <p>If you didn't request this code, please ignore this email or contact our support team.</p>
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
    async sendPasswordResetEmail(email: string, otp: string) {

        await this.resend.emails.send({
            from: 'SalonStore <noreply@salonstore.lk>',
            to: email,
            subject: 'Password Reset - Salon Store LK',
            html: this.sendOtpEmail(otp),
        })
    }

    private getSalonRejectionEmailTemplate(ownerName: string, salonName: string, rejectionReason: string) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9; }
                .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 30px; background-color: white; }
                .details-box { background-color: #ecf0f1; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #e74c3c; }
                .details-box p { margin: 8px 0; }
                .label { font-weight: bold; color: #2c3e50; }
                .footer { margin-top: 20px; text-align: center; font-size: 0.85em; color: #7f8c8d; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Salon Submission Status</h1>
                </div>
                <div class="content">
                    <p>Hi ${ownerName},</p>
                    <p>Thank you for your interest in joining Salon Store LK. Unfortunately, after reviewing your salon submission, we are unable to approve it at this time.</p>
                    <div class="details-box">
                        <p><span class="label">Salon Name:</span> ${salonName}</p>
                        <p><span class="label">Reason for Rejection:</span></p>
                        <p>${rejectionReason}</p>
                    </div>
                    <p>If you have any questions or would like more information about the reasons for this decision, please don't hesitate to contact our support team.</p>
                    <p>We encourage you to address the feedback and reapply in the future. We'd love to have your salon on our platform!</p>
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

    async sendSalonRejectionEmail(ownerEmail: string, ownerName: string, salonName: string, rejectionReason: string) {
        await this.resend.emails.send({
            from: 'SalonStore <noreply@salonstore.lk>',
            to: ownerEmail,
            subject: 'Salon Submission Status - Salon Store LK',
            html: this.getSalonRejectionEmailTemplate(ownerName, salonName, rejectionReason),
        });
    }
    private getSalonSuspensionEmailTemplate(ownerName: string, salonName: string, suspensionReason: string, suspensionDate: string) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9; }
                .header { background-color: #e67e22; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 30px; background-color: white; }
                .details-box { background-color: #fef9f0; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #e67e22; }
                .details-box p { margin: 8px 0; }
                .label { font-weight: bold; color: #2c3e50; }
                .warning-box { background-color: #fff3cd; padding: 12px 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #ffc107; font-size: 0.95em; }
                .footer { margin-top: 20px; text-align: center; font-size: 0.85em; color: #7f8c8d; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠ Salon Account Suspended</h1>
                </div>
                <div class="content">
                    <p>Hi ${ownerName},</p>
                    <p>We are writing to inform you that your salon account on <strong>Salon Store LK</strong> has been temporarily suspended, effective <strong>${suspensionDate}</strong>.</p>
                    <div class="details-box">
                        <p><span class="label">Salon Name:</span> ${salonName}</p>
                        <p><span class="label">Suspension Date:</span> ${suspensionDate}</p>
                        <p><span class="label">Reason for Suspension:</span></p>
                        <p>${suspensionReason}</p>
                    </div>
                    <div class="warning-box">
                        <strong>What this means:</strong> During the suspension period, your salon listing will not be visible to customers and no new bookings can be made.
                    </div>
                    <p>If you believe this suspension was made in error, or if you have taken steps to resolve the issue, please contact our support team as soon as possible so we can review your case.</p>
                    <p>We value your partnership and hope to restore your account once the matter has been addressed.</p>
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

    async sendSalonSuspensionEmail(ownerEmail: string, ownerName: string, salonName: string, suspensionReason: string, suspensionDate: string) {
        await this.resend.emails.send({
            from: 'SalonStore <noreply@salonstore.lk>',
            to: ownerEmail,
            subject: 'Salon Account Suspended - Salon Store LK',
            html: this.getSalonSuspensionEmailTemplate(ownerName, salonName, suspensionReason, suspensionDate),
        });
    }

    private getSalonUnsuspensionEmailTemplate(ownerName: string, salonName: string) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9; }
                .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 30px; background-color: white; }
                .details-box { background-color: #f0fdf4; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #27ae60; }
                .details-box p { margin: 8px 0; }
                .label { font-weight: bold; color: #2c3e50; }
                .success-box { background-color: #d4edda; padding: 12px 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #28a745; font-size: 0.95em; color: #155724; }
                .footer { margin-top: 20px; text-align: center; font-size: 0.85em; color: #7f8c8d; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✓ Salon Account Restored</h1>
                </div>
                <div class="content">
                    <p>Hi ${ownerName},</p>
                    <p>Great news! We are pleased to inform you that your salon account on <strong>Salon Store LK</strong> has been restored and is now active again.</p>
                    <div class="details-box">
                        <p><span class="label">Salon Name:</span> ${salonName}</p>
                        <p><span class="label">Status:</span> <strong style="color: #27ae60;">Active</strong></p>
                    </div>
                    <div class="success-box">
                        <strong>Your account is now live!</strong> Your salon listing is visible to customers and you can accept new bookings.
                    </div>
                    <p>Thank you for resolving the issue. We appreciate your cooperation and partnership with Salon Store LK.</p>
                    <p>If you have any questions or need further assistance, please don't hesitate to contact our support team.</p>
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

    async sendSalonUnsuspensionEmail(ownerEmail: string, ownerName: string, salonName: string) {
        await this.resend.emails.send({
            from: 'SalonStore <noreply@salonstore.lk>',
            to: ownerEmail,
            subject: 'Salon Account Restored - Salon Store LK',
            html: this.getSalonUnsuspensionEmailTemplate(ownerName, salonName),
        });
    }

}