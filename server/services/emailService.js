import nodemailer from "nodemailer";

// Optional Resend fallback (only used if SMTP is not configured)
const sendEmailWithResend = async (to, subject, html, text) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Resend API key is invalid");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${process.env.FROM_NAME || "Team Manager"} <${
        process.env.FROM_EMAIL || "onboarding@resend.dev"
      }>`,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return await response.json();
};

// Create a nodemailer transporter using env settings
function createSmtpTransporter() {
  if (!process.env.SMTP_HOST) return null;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE
    ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
    : port === 465;
  const user = process.env.SMTP_USER || process.env.SMTP_MAIL;
  const pass = process.env.SMTP_PASSWORD;

  const transportOptions = {
    host,
    port,
    secure,
    auth: user
      ? {
          user,
          pass,
        }
      : undefined,
  };

  return nodemailer.createTransport(transportOptions);
}

async function sendWithSMTP(to, subject, html, text) {
  const transporter = createSmtpTransporter();
  if (!transporter) throw new Error("SMTP not configured");

  const from = `${process.env.FROM_NAME || "Team Manager"} <${
    process.env.FROM_EMAIL || process.env.SMTP_USER || process.env.SMTP_MAIL
  }>`;

  const info = await transporter.sendMail({ from, to, subject, html, text });
  return { success: true, messageId: info.messageId };
}

// Send verification code email
export const sendVerificationEmail = async (email, code, teamName, adminName) => {
  const subject = "Verify Your Email - Sports Team Manager";
  const html = `
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
  `;

  const text = `
Hello ${adminName},

Thank you for registering ${teamName} with Sports Team Manager!

Your verification code is: ${code}

This code will expire in 15 minutes.

If you didn't create this account, please ignore this email.

Best regards,
The Sports Team Manager Team
  `;

  try {
    // Prefer SMTP if configured
    if (process.env.SMTP_HOST) {
      const result = await sendWithSMTP(email, subject, html, text);
      console.log("✅ Verification email sent via SMTP:", result.messageId);
      return result;
    }

    // Fallback to Resend if configured
    if (process.env.RESEND_API_KEY) {
      const result = await sendEmailWithResend(email, subject, html, text);
      console.log("✅ Verification email sent via Resend:", result.id);
      return { success: true, messageId: result.id };
    }

    // Last resort: JSON transport (no network) for local debug
    const jsonTransporter = nodemailer.createTransport({ jsonTransport: true });
    const info = await jsonTransporter.sendMail({
      from: `${process.env.FROM_NAME || "Team Manager"} <${
        process.env.FROM_EMAIL || "dev@example.com"
      }>`,
      to: email,
      subject,
      html,
      text,
    });
    console.log("📄 Verification email (jsonTransport):", info.message);
    return { success: true, messageId: "json-transport" };
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    // Fallback: JSON transport to avoid blocking local flows
    try {
      const jsonTransporter = nodemailer.createTransport({ jsonTransport: true });
      const info = await jsonTransporter.sendMail({
        from: `${process.env.FROM_NAME || "Team Manager"} <${
          process.env.FROM_EMAIL || "dev@example.com"
        }>`,
        to: email,
        subject,
        html,
        text,
      });
      console.log("📄 Verification email fallback (jsonTransport):", info.message);
      return { success: true, messageId: "json-transport" };
    } catch (fallbackError) {
      console.error("�� Fallback jsonTransport failed:", fallbackError);
      return { success: false, error: error.message };
    }
  }
};

// Send account verified confirmation email
export const sendAccountVerifiedEmail = async (email, teamName, adminName) => {
  const subject = "Account Verified - Welcome to Sports Team Manager!";
  const html = `
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
  `;

  const text = `
Congratulations ${adminName}!

Your email has been successfully verified and your account for ${teamName} is now active.

You can now log in and start managing your team.

Best regards,
The Sports Team Manager Team
  `;

  try {
    if (process.env.SMTP_HOST) {
      const result = await sendWithSMTP(email, subject, html, text);
      console.log("✅ Account verified email sent via SMTP:", result.messageId);
      return result;
    }

    if (process.env.RESEND_API_KEY) {
      const result = await sendEmailWithResend(email, subject, html, text);
      console.log("✅ Account verified email sent via Resend:", result.id);
      return { success: true, messageId: result.id };
    }

    const jsonTransporter = nodemailer.createTransport({ jsonTransport: true });
    const info = await jsonTransporter.sendMail({
      from: `${process.env.FROM_NAME || "Team Manager"} <${
        process.env.FROM_EMAIL || "dev@example.com"
      }>`,
      to: email,
      subject,
      html,
      text,
    });
    console.log("📄 Account verified email (jsonTransport):", info.message);
    return { success: true, messageId: "json-transport" };
  } catch (error) {
    console.error("❌ Error sending account verified email:", error);
    // Don't throw error here, verification already succeeded
    return { success: false, error: error.message };
  }
};
