import "dotenv/config";

import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import app from "./app.js";
import { corsOptions } from "./config/cors.js";
import { setupGameServer } from "./game/gameServer.js";
import { setupMultiplayerServer } from "./game/multiplayerServer.js";

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { ...corsOptions, methods: ["GET", "POST"] },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const jwtSecret = process.env.JWT_SECRET;

  if (typeof token !== "string" || !jwtSecret) {
    next(new Error("Authentication required"));
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (typeof payload !== "object" || !("userId" in payload)) {
      next(new Error("Invalid authentication token"));
      return;
    }

    socket.data.userId = String(payload.userId);
    socket.data.username = "username" in payload
      ? String(payload.username)
      : "Player";
    next();
  } catch {
    next(new Error("Invalid or expired authentication token"));
  }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", socket.id, reason);
  });
});

let stopMultiplayerServer: (() => Promise<void>) | undefined;

async function startServer() {
  stopMultiplayerServer = await setupMultiplayerServer(io);
  setupGameServer(io);
  httpServer.listen(PORT, HOST, () => {
    console.log(`Campus Clash server running on port ${PORT}`);
  });
}

void startServer().catch((error: unknown) => {
  console.error("Failed to restore multiplayer rooms:", error);
  process.exitCode = 1;
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);

  io.close(() => {
    void stopMultiplayerServer?.().then(() => {
      process.exit(0);
    }).catch((error: unknown) => {
      console.error("Failed to flush multiplayer room snapshots:", error);
      process.exit(1);
    });
  });
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));