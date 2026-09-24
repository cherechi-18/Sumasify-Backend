import nodemailer from "nodemailer";
import dns from "node:dns/promises";

import { env } from "../config/env.js";

let cachedIp = null;

async function getGmailIps() {
  const addresses = await dns.lookup(
    "smtp.gmail.com",
    { all: true }
  );

  return addresses.map((address) => address.address);
}

async function createTransporter() {
  const addresses = await getGmailIps();

  const ipsToTry = cachedIp
    ? [cachedIp, ...addresses.filter((ip) => ip !== cachedIp)]
    : addresses;

  let lastError;

  for (const ip of ipsToTry) {
    try {
      const transporter = nodemailer.createTransport({
        host: ip,
        port: 465,
        secure: true,
        tls: {
          servername: "smtp.gmail.com",
        },
        auth: {
          user: env.gmailUser,
          pass: env.gmailAppPassword,
        },
      });

      await transporter.verify();

      cachedIp = ip;

      return transporter;
    } catch (error) {
      lastError = error;

      console.warn(
        `Gmail SMTP connection failed for ${ip}:`,
        error.message
      );
    }
  }

  throw lastError || new Error("Unable to connect to Gmail SMTP");
}

export async function sendPasswordResetEmail(
  email,
  rawToken
) {
  try {
    const transporter = await createTransporter();

    const resetUrl =
      `${env.frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await transporter.sendMail({
      from: `"SUMASIFY" <${env.gmailUser}>`,
      to: email,
      subject: "Reset Your SUMASIFY Password",

      text: `
You requested to reset your SUMASIFY password.

Use the link below to create a new password:

${resetUrl}

This link expires in 15 minutes.

If you did not request this password reset, you can safely ignore this email.
      `,

      html: `
        <p>You requested to reset your SUMASIFY password.</p>

        <p>
          Click the link below to create a new password:
        </p>

        <p>
          <a href="${resetUrl}">
            Reset Your Password
          </a>
        </p>

        <p>
          This link expires in <strong>15 minutes</strong>.
        </p>

        <p>
          If you did not request this password reset,
          you can safely ignore this email.
        </p>
      `,
    });
  } catch (error) {
    console.error(
      "Password reset email error:",
      error.message
    );

    const err = new Error(
      "Failed to send password reset email"
    );

    err.status = 500;

    throw err;
  }
}