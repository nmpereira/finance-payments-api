import { Router } from "express";
import {
  deletePartnerRules,
  getPartnerRules,
  listPartners,
  putPartnerRules
} from "../controllers/adminController";

const router = Router();

router.get("/partners", listPartners);
router.get("/partners/:partnerId/rules", getPartnerRules);
router.put("/partners/:partnerId/rules", putPartnerRules);
router.delete("/partners/:partnerId/rules", deletePartnerRules);

export default router;
