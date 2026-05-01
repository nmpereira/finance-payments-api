import { Router, Request, Response } from "express";

const router = Router();

router.get("/decision", (_req: Request, res: Response) => {
    res.status(200).json({ decision: true });
});

export default router;