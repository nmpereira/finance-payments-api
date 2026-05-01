import express, { Application, Request, Response } from "express";
import financeRoutes from "./routes/financeRoutes";

const PORT = process.env.PORT ?? "3000";

const app: Application = express();

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ message: "OK", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/v1", financeRoutes);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
