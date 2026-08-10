import { Router } from "express";
import indexRoutes from "./index.routes";
import healthRoutes from "./health.routes";
import companiesRoutes from "./companies.routes";
import brandsRoutes from "./brands.routes";
import materialsRoutes from "./materials.routes";
import {
  stickerMaterialsRouter,
  localSheetsRouter,
  labelSheetsRouter,
} from "./material-receipts.routes";
import machinesRoutes from "./machines.routes";
import operatorsRoutes from "./operators.routes";
import usersRoutes from "./users.routes";
import workOrdersRoutes from "./work-orders.routes";
import productionOrdersRoutes from "./production-orders.routes";
import wovenProductionRoutes from "./woven-production.routes";
import inventoryRoutes from "./inventory.routes";
import threadInventoryRoutes from "./thread-inventory.routes";
import threadServiceProviderRoutes from "./thread-service-provider.routes";
import threadDyeingRoutes from "./thread-dyeing.routes";
import inkRoutes from "./ink.routes";
import analyticsRoutes from "./analytics.routes";

const router = Router();

router.use("/", indexRoutes);
router.use("/health", healthRoutes);
router.use("/companies", companiesRoutes);
router.use("/brands", brandsRoutes);
/* Specific /materials/* receipt ledgers mount BEFORE /materials so they aren't swallowed
   by the materials router's own /:code route. */
router.use("/materials/stickers", stickerMaterialsRouter);
router.use("/materials/local-sheets", localSheetsRouter);
router.use("/materials/label-sheets", labelSheetsRouter);
router.use("/materials", materialsRoutes);
router.use("/machines", machinesRoutes);
router.use("/operators", operatorsRoutes);
router.use("/users", usersRoutes);
router.use("/work-orders", workOrdersRoutes);
router.use("/production-orders", productionOrdersRoutes);
/** Woven workflow — same production_orders header, woven-specific stages. */
router.use("/woven-production", wovenProductionRoutes);
router.use("/inventory", inventoryRoutes);
/** Thread stock, receiving and dyeing — the woven side of inventory. */
router.use("/thread", threadInventoryRoutes);
/** External dyeing service providers (master data for the dyeing send/receive workflow). */
router.use("/thread-service-providers", threadServiceProviderRoutes);
/** Thread dyeing send/receive workflow — deducts undyed stock, credits dyed stock per colour. */
router.use("/thread-dyeing", threadDyeingRoutes);
/** Ink purchasing, derived stock and consumption. */
router.use("/ink", inkRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
