import { NextFunction, Request, Response } from "express";

/**
 * Placeholder for production auth (e.g. API keys, JWT, mTLS).
 * Currently a non-functional placeholder so routes remain usable without credentials.
 */
export function authMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Implement auth logic
  next();
}
