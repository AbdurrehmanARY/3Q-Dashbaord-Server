import { Router } from "express";
import { analyticsController } from "@api/controllers/analytics.controller";

const router = Router();

/** Dashboard KPIs. The reporting endpoints that used to sit here went with the Reports module. */
router.get("/kpis", analyticsController.getKpis);

export default router;
