import { NextFunction, Request, Response } from "express";
import { performance } from "node:perf_hooks";

/**
 * Logs each HTTP request with method, path, status, and wall time until the
 * response is finished (headers sent).
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = performance.now();
  res.on("finish", () => {
    const durationMs = performance.now() - start;
    const line = [
      req.method,
      req.originalUrl ?? req.url,
      res.statusCode,
      `${durationMs.toFixed(2)}ms`
    ].join(" ");
    console.log(line);
  });
  next();
}
