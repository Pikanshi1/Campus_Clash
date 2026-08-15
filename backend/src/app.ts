import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth/authRoutes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Campus Clash API is running",
  });
});

app.use("/api/auth", authRoutes);

export default app;