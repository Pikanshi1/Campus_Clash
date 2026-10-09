import express from "express";
import cors from "cors";
import { corsOptions } from "./config/cors.js";
import authRoutes from "./routes/auth/authRoutes.js";

const app = express();
app.use(cors(corsOptions));

app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Campus Clash API is running",
  });
});

app.use("/api/auth", authRoutes);

export default app;