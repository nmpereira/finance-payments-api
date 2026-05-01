import express, { Application, Request, Response } from "express";
import { errorHandler } from "./middleware/errorHandler";
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

app.use(errorHandler);

app.listen(parseInt(PORT, 10), () => {
  console.log(`Finance rules API listening on http://localhost:${PORT}`);
});
