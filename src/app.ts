import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import path from "path";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimit";

import authRoutes from "./routes/authRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import productRoutes from "./routes/productRoutes";
import customerRoutes from "./routes/customerRoutes";
import orderRoutes from "./routes/orderRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import pushRoutes from "./routes/pushRoutes";
import webPushRoutes from "./routes/webPushRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

export function createApp() {
  const app = express();

  // Most production hosts (Render, Railway, Fly, a load balancer in front of
  // a VM, etc.) sit behind a reverse proxy - without this, rate limiting and
  // any IP-based logic would see the proxy's IP for every request instead of
  // the real client. Only trust the first hop, and only in production.
  if (env.isProduction) app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.corsOrigin, exposedHeaders: ["X-Total-Count", "X-Page", "X-Has-More"] }));
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  if (!env.isProduction) app.use(morgan("dev"));

  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));

  app.use("/api", apiLimiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/invoices", invoiceRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/push-tokens", pushRoutes);
  app.use("/api/web-push", webPushRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
