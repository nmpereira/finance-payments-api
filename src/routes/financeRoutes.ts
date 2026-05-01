import { Router } from "express";
import {
  getPartnerRules,
  postFinanceDecision
} from "../controllers/financeController";

const router = Router();

router.post("/finance/decision", postFinanceDecision);
router.get("/partner-rules", getPartnerRules);

export default router;
