import 'dotenv/config';
import nodemailer from 'nodemailer';

// Create a transporter with environment variables
const createTransporter = () => {
  // Log SMTP config for debugging (do not log passwords in production)
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  // Do not log SMTP_PASS for security

  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }

  // Otherwise fallback to a test account that we create if needed
  console.log('No SMTP settings found, using test account');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'demo@ethereal.email', // this is a fake account for testing
      pass: 'demo123',
    },
  });
};

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  try {
    // If we're in development, log the OTP for easy testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV MODE] The OTP for ${email} is: ${otp}`);
    }

    const transporter = createTransporter();
    console.log('Created transporter, verifying connection...');
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully.');
    } catch (verifyErr) {
      console.error('SMTP connection verification failed:', verifyErr);
    }
    // Prepare email content
    const mailOptions = {
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: 'Your verification code',
      text: `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3abff8; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Chunumunu Ads</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <h2>Your verification code</h2>
            <p>Please use the following code to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 10px 20px; background-color: #f5f5f5; border-radius: 5px;">${otp}</span>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #777; font-size: 12px;">
            <p>© ${new Date().getFullYear()} ChunuMunu. All rights reserved.</p>
          </div>
        </div>
      `,
    };
    console.log('Prepared mailOptions:', mailOptions);
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    throw new Error('Failed to send email');
  }
}
