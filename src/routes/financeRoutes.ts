import { Router } from "express";
import { postFinanceDecision } from "../controllers/financeController";

const router = Router();

router.post("/finance/decision", postFinanceDecision);

export default router;
