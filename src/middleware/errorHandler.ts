import { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Unhandled error:", err);

  res.status(500).json({
    financeable: false,
    errors: [
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred."
      }
    ]
  });
}
