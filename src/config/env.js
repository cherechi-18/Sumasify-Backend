import "dotenv/config";

function required(key) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }

  return value;
}

export const env = {
  // Application
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",

  // Database
  databaseUrl: required("DATABASE_URL"),
  databasePassword: process.env.DATABASE_PASSWORD || "",

  // JWT
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "900s",
  jwtExpiresInSeconds: 900,

  // Google OAuth
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || "",

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS || "",

  // Email
  gmailUser: process.env.GMAIL_USER || "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || "",

  // Super Admin
  superAdminEmail: required("SUPER_ADMIN_EMAIL"),
  superAdminPassword: required("SUPER_ADMIN_PASSWORD"),
  superAdminName: required("SUPER_ADMIN_NAME"),
  superAdminPhone: required("SUPER_ADMIN_PHONE"),
};