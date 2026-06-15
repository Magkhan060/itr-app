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
  // ITD e-Filing API — optional; if absent the service runs in mock mode
  itdApiBaseUrl: process.env.ITD_API_BASE_URL || null,
  itdApiKey:     process.env.ITD_API_KEY     || null,
  // Gmail SMTP — for approval emails and notifications
  gmailUser: process.env.GMAIL_USER || null,
  gmailPass: process.env.GMAIL_APP_PASSWORD || null,
  // Twilio SMS — optional; if absent SMS is skipped silently
  twilioSid:   process.env.TWILIO_ACCOUNT_SID  || null,
  twilioToken: process.env.TWILIO_AUTH_TOKEN   || null,
  twilioFrom:  process.env.TWILIO_FROM_NUMBER  || null,
  // App public URL — used in approval email links
  appUrl: process.env.APP_URL || "http://localhost:5173",
};
