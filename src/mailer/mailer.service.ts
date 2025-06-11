import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private otpStorage: Map<string, { otp: string; expiresAt: Date }> = new Map();

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  // Generate and send OTP
  async sendOTP(email: string): Promise<string> {
    const otp = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP valid for 10 minutes

    this.otpStorage.set(email, { otp, expiresAt });

    const mailOptions = {
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject: 'Your Verification OTP',
      text: `Your OTP for verification is: ${otp}\n\nThis OTP is valid for 10 minutes.`,
      html: `
        <p>Your OTP for verification is: <strong>${otp}</strong></p>
        <p>This OTP is valid for 10 minutes.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return otp; // For testing purposes, in production you might not want to return this
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw error;
    }
  }

  // Verify OTP
  verifyOTP(email: string, userOTP: string): boolean {
    const storedOTP = this.otpStorage.get(email);

    if (!storedOTP) {
      return false;
    }

    // Check if OTP matches and isn't expired
    if (storedOTP.otp === userOTP && storedOTP.expiresAt > new Date()) {
      this.otpStorage.delete(email); // Remove used OTP
      return true;
    }

    return false;
  }

  // Send welcome email (only after OTP verification)
  async sendWelcomeEmailWithAttachment(
    email: string,
    name: string,
    attachmentPath: string,
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject: 'Welcome to the Email Notification System',
      text:
        `Hi ${name},\n\n` +
        'Welcome to our Notification System!\n\n' +
        'This is a test email to verify that your Nodemailer setup is working correctly.\n\n' +
        'Please find the attached Holiday Calendar for reference.\n\n' +
        'Best Regards,\n' +
        'Aryan',
      attachments: [
        {
          filename: 'Holiday_Calendar.pdf',
          path: attachmentPath,
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }
}
