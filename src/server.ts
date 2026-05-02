import express, { Application, Request, Response } from "express";
import { authMiddleware } from "./middleware/authMiddleware";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import adminRoutes from "./routes/adminRoutes";
import financeRoutes from "./routes/financeRoutes";

const PORT = process.env.PORT ?? "3000";

export const app: Application = express();

app.use(requestLogger);
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime()
  });
});

app.use("/api/v1", authMiddleware, adminRoutes);
app.use("/api/v1", financeRoutes);

app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(parseInt(PORT, 10), () => {
    console.log(`Finance rules API listening on http://localhost:${PORT}`);
  });
}
