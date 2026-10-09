import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import prisma from "../../config/prisma.ts";
import jwt from "jsonwebtoken";

const PASSWORD_MIN_LENGTH = 12;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isStrongPassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export async function registerUser(data: RegisterData) {
  const { username, email, password } = data;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    throw new Error("Username or email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      level: true,
      xp: true,
      score: true,
      wins: true,
      matches: true,
    },
  });

  return user;
}

interface LoginData {
  email: string;
  password: string;
}

export async function loginUser(data: LoginData) {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatch = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      username: user.username,
    },
    jwtSecret,
    {
      expiresIn: "7d",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      level: user.level,
      xp: user.xp,
      score: user.score,
      wins: user.wins,
      matches: user.matches,
    },
  };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!host || !smtpUser || !smtpPassword) {
    throw new Error("Password reset email is not configured");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: { tokenHash, userId: user.id, expiresAt },
  });

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")[0]
    .trim()
    .replace(/\/$/, "");
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to: user.email,
      subject: "Reset your Campus Clash password",
      text: `Use this link to reset your password within 30 minutes: ${resetUrl}`,
      html: `<p>Use this link to reset your Campus Clash password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`,
    });
  } catch (error) {
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
    throw error;
  }
}

export async function resetPassword(token: string, password: string) {
  if (!isStrongPassword(password)) {
    throw new Error("Password must be at least 12 characters and include uppercase, lowercase, number, and symbol characters");
  }

  const tokenHash = hashResetToken(token);
  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetRecord || resetRecord.expiresAt <= new Date()) {
    throw new Error("Reset link is invalid or expired");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    });
    const deleted = await transaction.passwordResetToken.deleteMany({
      where: { id: resetRecord.id, expiresAt: { gt: new Date() } },
    });
    if (deleted.count !== 1) {
      throw new Error("Reset link is invalid or expired");
    }
  });
}