import bcrypt from "bcryptjs";
import prisma from "../../config/prisma.ts";
import jwt from "jsonwebtoken";

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