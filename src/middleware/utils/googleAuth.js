import { OAuth2Client } from "google-auth-library";

import { env } from "../config/env.js";

const googleClient = new OAuth2Client(
  env.googleClientId
);

export async function verifyGoogleCredential(credential) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      const err = new Error("Invalid Google credential");
      err.status = 401;
      throw err;
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      fullName: payload.name,
      emailVerified: payload.email_verified,
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }

    const err = new Error("Invalid Google credential");
    err.status = 401;
    throw err;
  }
}