import nodemailer from "nodemailer";

// Create transporter function - creates fresh transporter each time to ensure env vars are loaded
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Send verification code email
export const sendVerificationEmail = async (
  email,
  code,
  teamName,
  adminName
) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `${process.env.FROM_NAME || "Team Manager"} <${
      process.env.FROM_EMAIL || process.env.SMTP_MAIL
    }>`,
    to: email,
    subject: "Verify Your Email - Sports Team Manager",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 Welcome to Sports Team Manager!</h1>
          </div>
          <div class="content">
            <h2>Hello ${adminName},</h2>
            <p>Thank you for registering <strong>${teamName}</strong> with Sports Team Manager!</p>
            <p>To complete your registration and activate your account, please verify your email address using the code below:</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            
            <p><strong>This code will expire in 15 minutes.</strong></p>
            
            <p>If you didn't create this account, please ignore this email.</p>
            
            <p>Best regards,<br>The Sports Team Manager Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${adminName},

Thank you for registering ${teamName} with Sports Team Manager!

Your verification code is: ${code}

This code will expire in 15 minutes.

If you didn't create this account, please ignore this email.

Best regards,
The Sports Team Manager Team
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send account verified confirmation email
export const sendAccountVerifiedEmail = async (
  email,
  teamName,
  adminName
) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `${process.env.FROM_NAME || "Team Manager"} <${
      process.env.FROM_EMAIL || process.env.SMTP_MAIL
    }>`,
    to: email,
    subject: "Account Verified - Welcome to Sports Team Manager!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-icon { font-size: 48px; margin-bottom: 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✅</div>
            <h1>Account Verified!</h1>
          </div>
          <div class="content">
            <h2>Congratulations ${adminName}!</h2>
            <p>Your email has been successfully verified and your account for <strong>${teamName}</strong> is now active.</p>
            <p>You can now log in and start managing your team:</p>
            <ul>
              <li>Add players and coaches</li>
              <li>Create training groups</li>
              <li>Schedule sessions and games</li>
              <li>Track attendance and performance</li>
            </ul>
            <p>We're excited to have you on board!</p>
            <p>Best regards,<br>The Sports Team Manager Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Congratulations ${adminName}!

Your email has been successfully verified and your account for ${teamName} is now active.

You can now log in and start managing your team.

Best regards,
The Sports Team Manager Team
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Account verified email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending account verified email:', error);
    // Don't throw error here, verification already succeeded
    return { success: false, error: error.message };
  }
};
