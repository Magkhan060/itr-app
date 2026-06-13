import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));


// ── Health check ────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", env: env.nodeEnv, timestamp: new Date().toISOString() });
});

// ── Routes (add as modules are built) ───────────────────────
import authRoutes from "./modules/auth/auth.routes.js";
app.use("/api/auth", authRoutes);

import taxRoutes from "./modules/tax-engine/engine.routes.js";
app.use("/api/tax", taxRoutes);

import filingRoutes from "./modules/itr/filing.routes.js";
app.use("/api/filing", filingRoutes);

import documentRoutes from "./modules/documents/documents.routes.js";
app.use("/api/documents", documentRoutes);


// ── Error handler ───────────────────────────────────────────
app.use(errorHandler);

// ── Start ───────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(env.port, () => {
    console.log(`🚀 API running at http://localhost:${env.port}`);
  });
});



