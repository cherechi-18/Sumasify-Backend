import { z } from "zod";
import { toInternationalFormat } from "../../middleware/utils/phoneNumber.js";

const phoneNumberSchema = z
  .string()
  .regex(
    /^(0|\+?234)[7-9][01]\d{8}$/,
    "Please enter a valid Nigerian phone number"
  )
  .transform(toInternationalFormat);

const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address");

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const registerSchema = z.object({
  fullname: z
    .string()
    .trim()
    .min(5, "Full name must be at least 5 characters"),

  email: emailSchema,

  password: passwordSchema,

  phone: phoneNumberSchema.optional(),

  agreedtotermsandconditions: z
    .literal(true, {
      errorMap: () => ({
        message: "You must agree to the terms and conditions",
      }),
    }),

  agreedtoprivacypolicy: z
    .literal(true, {
      errorMap: () => ({
        message: "You must agree to the privacy policy",
      }),
    }),
});

export const loginSchema = z.object({
  email: emailSchema,

  password: passwordSchema,
});

export const googleAuthSchema = z.object({
  credential: z
    .string()
    .min(1, "Google credential is required"),

  agreedtotermsandconditions: z.literal(true, {
    errorMap: () => ({
      message: "You must agree to the terms and conditions",
    }),
  }),

  agreedtoprivacypolicy: z.literal(true, {
    errorMap: () => ({
      message: "You must agree to the privacy policy",
    }),
  }),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, "Reset token is required"),

  newpassword: passwordSchema,
});




