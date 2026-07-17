import type { Request, Response, NextFunction } from "express";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}
export const badRequest = (m: string) => new ApiError(400, m, "bad_request");
export const unauthorized = (m = "Unauthorized") => new ApiError(401, m, "unauthorized");
export const forbidden = (m = "Forbidden") => new ApiError(403, m, "forbidden");
export const notFound = (m = "Not found") => new ApiError(404, m, "not_found");

// Wrap async route handlers so thrown errors reach the error middleware.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
