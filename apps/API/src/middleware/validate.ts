import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

// Validate + coerce req.body / query / params against a Zod schema.
export const validate =
  (schema: ZodTypeAny, where: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse((req as any)[where]);
    if (!parsed.success) return next(parsed.error);
    (req as any)[where] = parsed.data;
    next();
  };
