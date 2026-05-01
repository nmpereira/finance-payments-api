import express, {
  Application,
  Request,
  Response,
  NextFunction
} from "express";
import financeRoutes from "./routes/financeRoutes";

const PORT = process.env.PORT ?? "3000";

const app: Application = express();

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime()
  });
});

app.use("/api/v1", financeRoutes);

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
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
);

app.listen(parseInt(PORT, 10), () => {
  console.log(`Finance rules API listening on http://localhost:${PORT}`);
});
