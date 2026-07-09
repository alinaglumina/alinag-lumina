import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../lib/http.js";
import { logger } from "../lib/logger.js";
import { ZodError } from "zod";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "not_found", message: "Route not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "validation_error", issues: err.flatten() });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.code ?? "error", message: err.message });
  }
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "internal_error", message: "Something went wrong" });
}
