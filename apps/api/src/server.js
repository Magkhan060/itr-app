import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: "[localhost](http://localhost:5173)", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", env: env.nodeEnv, timestamp: new Date().toISOString() });
});

// ── Routes (add as modules are built) ───────────────────────
// import authRoutes from "./modules/auth/auth.routes.js";
// app.use("/api/auth", authRoutes);

// ── Error handler ───────────────────────────────────────────
app.use(errorHandler);

// ── Start ───────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(env.port, () => {
    console.log(`🚀 API running at http://localhost:${env.port}`);
  });
});
