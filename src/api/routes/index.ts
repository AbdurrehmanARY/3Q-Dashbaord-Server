import { Router } from "express";
import indexRoutes from "./index.routes";
import healthRoutes from "./health.routes";
import companiesRoutes from "./companies.routes";
import brandsRoutes from "./brands.routes";
import materialsRoutes from "./materials.routes";
import machinesRoutes from "./machines.routes";
import operatorsRoutes from "./operators.routes";
import usersRoutes from "./users.routes";
import workOrdersRoutes from "./work-orders.routes";
import productionOrdersRoutes from "./production-orders.routes";
import wovenProductionRoutes from "./woven-production.routes";
import inventoryRoutes from "./inventory.routes";
import threadInventoryRoutes from "./thread-inventory.routes";
import analyticsRoutes from "./analytics.routes";

const router = Router();

router.use("/", indexRoutes);
router.use("/health", healthRoutes);
router.use("/companies", companiesRoutes);
router.use("/brands", brandsRoutes);
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
router.use("/analytics", analyticsRoutes);

export default router;
