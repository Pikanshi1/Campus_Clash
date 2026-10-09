import { Request, Response } from "express";
import {
  isStrongPassword,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword as updatePassword,
} from "../../services/auth/authService.ts";

export async function register(
  req: Request,
  res: Response
) {
  try {
    const { username, email, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Username, email and password are required",
      });
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3 to 24 characters and contain only letters, numbers, and underscores",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol characters",
      });
    }

    const user = await registerUser({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(409).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Registration failed",
    });
  }
}


export async function login(
  req: Request,
  res: Response
) {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await loginUser({
      email: email.trim().toLowerCase(),
      password,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(401).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Login failed",
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const email = req.body?.email;

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, message: "Enter a valid email address" });
  }

  try {
    await requestPasswordReset(email.trim().toLowerCase());
    return res.json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return res.json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body ?? {};

  if (typeof token !== "string" || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Reset token and new password are required" });
  }

  try {
    await updatePassword(token, password);
    return res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Password reset failed",
    });
  }
}