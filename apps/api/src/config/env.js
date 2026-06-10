import dotenv from "dotenv";
dotenv.config();

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const env = {
  port:          process.env.PORT || 5000,
  mongoUri:      required("MONGODB_URI"),
  jwtSecret:     required("JWT_SECRET"),
  jwtExpiresIn:  process.env.JWT_EXPIRES_IN || "7d",
  nodeEnv:       process.env.NODE_ENV || "development",
  encryptionKey: required("ENCRYPTION_KEY"),
  isDev:         process.env.NODE_ENV !== "production",
};
