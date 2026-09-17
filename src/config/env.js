import "dotenv/config";

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const env = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  superAdminEmail: required("SUPER_ADMIN_EMAIL"),
  superAdminPassword: required("SUPER_ADMIN_PASSWORD"),
  superAdminName: required("SUPER_ADMIN_NAME"),
  superAdminPhone: required("SUPER_ADMIN_PHONE")
};