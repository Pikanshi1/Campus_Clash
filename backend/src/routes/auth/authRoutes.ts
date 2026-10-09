import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  forgotPassword,
  register,
  login,
  resetPassword,
} from "../../controllers/auth/authController.js";

import { getMe } from "../../controllers/auth/authMeController.js";

import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", register);

router.post("/login", loginLimiter, login);

router.post("/forgot-password", passwordResetLimiter, forgotPassword);

router.post("/reset-password", passwordResetLimiter, resetPassword);

router.get(
  "/me",
  authMiddleware,
  getMe
);

export default router;