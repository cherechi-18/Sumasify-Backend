import { asyncHandler } from "../../middleware/utils/asyncHandler.js";

import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation.js";

import {
  registerUser,
  loginUser,
  googleAuth,
  refreshUserSession,
  getUserById,
  forgotPassword,
  resetPassword,
  logoutUser,
} from "./auth.service.js";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const result = await registerUser(data, req);

  res.cookie(
    REFRESH_COOKIE_NAME,
    result.refreshToken,
    refreshCookieOptions
  );

  res.status(201).json({
    data: {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const result = await loginUser(data, req);

  res.cookie(
    REFRESH_COOKIE_NAME,
    result.refreshToken,
    refreshCookieOptions
  );

  res.status(200).json({
    data: {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    },
  });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const data = googleAuthSchema.parse(req.body);

  const result = await googleAuth(data, req);

  res.cookie(
    REFRESH_COOKIE_NAME,
    result.refreshToken,
    refreshCookieOptions
  );

  res.status(200).json({
    data: {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  const result = await refreshUserSession(
    refreshToken,
    req
  );

  res.cookie(
    REFRESH_COOKIE_NAME,
    result.refreshToken,
    refreshCookieOptions
  );

  res.status(200).json({
    data: {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  await logoutUser(refreshToken);

  res.clearCookie(
    REFRESH_COOKIE_NAME,
    refreshCookieOptions
  );

  res.status(204).send();
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);

  res.status(200).json({
    data: {
      user,
    },
  });
});

export const handleForgotPassword = asyncHandler(
  async (req, res) => {
    const data = forgotPasswordSchema.parse(req.body);

    const result = await forgotPassword(data);

    res.status(202).json({
      data: result,
    });
  }
);

export const handleResetPassword = asyncHandler(
  async (req, res) => {
    const data = resetPasswordSchema.parse(req.body);

    await resetPassword(data);

    res.status(204).send();
  }
);