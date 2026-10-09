import type { CorsOptions } from "cors";

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`Invalid frontend origin in FRONTEND_URL: ${value}`);
  }
}

const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

const developmentOrigins = process.env.NODE_ENV === "production"
  ? []
  : ["http://localhost:3000", "http://localhost:5173"];

export function createCorsConfig(frontendUrl: string | undefined, nodeEnvironment: string | undefined) {
  const configuredOrigins = (frontendUrl || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
  const developmentOrigins = nodeEnvironment === "production"
    ? []
    : ["http://localhost:3000", "http://localhost:5173"];
  const allowedOrigins = [...new Set([...configuredOrigins, ...developmentOrigins])];
  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  };

  return { allowedOrigins, corsOptions };
}

export const { allowedOrigins, corsOptions } = createCorsConfig(
  process.env.FRONTEND_URL,
  process.env.NODE_ENV,
);