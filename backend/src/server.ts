import "dotenv/config";

import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { setupGameServer } from "./game/gameServer.js";

const PORT =
  Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const httpServer =
  http.createServer(app);

const io =
  new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

setupGameServer(io);

io.on("connection", (socket) => {
  console.log(
    "Socket connected:",
    socket.id
  );

  socket.on("disconnect", (reason) => {
    console.log(
      "Socket disconnected:",
      socket.id,
      reason
    );
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Campus Clash server running on http://localhost:${PORT}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);

  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));