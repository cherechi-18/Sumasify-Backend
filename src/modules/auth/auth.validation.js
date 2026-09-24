
// auth.validation.js

import { z } from "zod";

import { toInternationalFormat } from "../../utils/phoneNumber.js";

const phoneNumberSchema = z
  .string()
  .regex(
    /^(0|\+?234)[7-9][01]\d{8}$/,
    "Please enter a valid Nigerian phone number"
  )
  .transform(toInternationalFormat);

const emailSchema = z
  .string()
  .email("Please enter a valid email address");

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const registerSchema = z.object({
  fullname: z
    .string()
    .min(2, "Full name must be at least 2 characters"),

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




// auth.validation.js
// import { z } from "zod";
// import { toInternationalFormat } from "../../utils/phoneNumber.js";

// const phoneNumberSchema = z
//   .string()
//   .regex(/^(0|\+?234)[7-9][01]\d{8}$/, "Please enter a valid Nigerian phone number")
//   .transform(toInternationalFormat); // runs AFTER regex validation passes

// const emailSchema = z
//   .string()
//   .email("Please enter a valid email address");

// export const registerSchema = z.object({
//   intent: z.enum(["organizer", "member"]),
//   full_name: z.string().min(2),
//   phone_number: phoneNumberSchema,
//   password: z.string().min(6),
//   email: emailSchema,
// });

// export const loginSchema = z.object({
//   phone_number: phoneNumberSchema,
//   password: z.string().min(6),
// });

// export const forgotPasswordSchema = z.object({
//   phone_number: phoneNumberSchema,
// });

// export const verifyResetOtpSchema = z.object({
//   phone_number: phoneNumberSchema,
//   otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
// });

// export const resetPasswordSchema = z.object({
//   reset_token: z.string().min(1, "reset_token is required"),
//   new_password: z.string().min(6, "Password must be at least 6 characters"),
// });


