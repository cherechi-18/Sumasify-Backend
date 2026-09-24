import { Router } from "express";

import {
  register,
  login,
  googleLogin,
  refresh,
  logout,
  getMe,
  handleForgotPassword,
  handleResetPassword,
} from "./auth.controller.js";

import { authenticate } from "../../middleware/utils/authenticate.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);
router.post("/forgot-password", handleForgotPassword);
router.post("/reset-password", handleResetPassword);

export default router;