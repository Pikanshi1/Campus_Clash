import { Router } from "express";

import {
  register,
  login,
} from "../../controllers/auth/authController.js";

import { getMe } from "../../controllers/auth/authMeController.js";

import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.get(
  "/me",
  authMiddleware,
  getMe
);

export default router;