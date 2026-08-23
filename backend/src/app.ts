import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth/authRoutes.js";

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Campus Clash API is running",
  });
});

app.use("/api/auth", authRoutes);

export default app;