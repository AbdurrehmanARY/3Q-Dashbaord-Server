import { Router } from "express";
import { threadDyeingController } from "./thread-dyeing.controller";
import { validateRequest, validateParams } from "@shared/middleware/validateRequest";
import {
  createDyeingSendSchema,
  receiveDyeingSchema,
} from "./thread-dyeing.schema";
import { idParamsSchema } from "@shared/validation/common.schema";

const router = Router();

router.get("/sends", threadDyeingController.listSends);
router.post("/sends", validateRequest(createDyeingSendSchema), threadDyeingController.send);
router.post(
  "/sends/:id/receive",
  validateParams(idParamsSchema),
  validateRequest(receiveDyeingSchema),
  threadDyeingController.receive
);

export default router;
