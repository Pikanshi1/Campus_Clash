import { io } from "socket.io-client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

console.log("🔵 SOCKET URL:", API_URL);

export const socket = io(API_URL, {
  autoConnect: false,
  transports: ["polling", "websocket"],
});

