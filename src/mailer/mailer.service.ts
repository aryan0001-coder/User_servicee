import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MailerService {
  private readonly transporter: nodemailer.Transporter;
  private readonly otpStorage: Map<string, { otp: string; expiresAt: Date }> =
    new Map();

  constructor(private readonly configService: ConfigService) {
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
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

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
      return otp;
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw error;
    }
  }

  verifyOTP(email: string, userOTP: string): boolean {
    const storedOTP = this.otpStorage.get(email);

    if (!storedOTP) {
      return false;
    }

    if (storedOTP.otp === userOTP && storedOTP.expiresAt > new Date()) {
      this.otpStorage.delete(email); // Remove used OTP
      return true;
    }

    return false;
  }

  async sendWelcomeEmailWithAttachment(
    email: string,
    name: string,
    attachmentPath: string,
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject: 'Welcome to our Social Media Platform!',
      text:
        `Hi ${name},\n\n` +
        'Welcome to our Social Media Platform!\n\n' +
        'You have been sucessfully registered with our platform.\n\n' +
        'Best Regards,\n' +
        'Social Media Team',
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

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject: 'Welcome to our Social Media Platform!',
      text:
        `Hi ${name},\n\n` +
        'Welcome to our Social Media Platform!\n\n' +
        'You have been sucessfully registered with our platform.\n\n' +
        'Best Regards,\n' +
        'Social Media Team',
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }
}
