import { Router } from "express";
import { threadDyeingController } from "@api/controllers/thread-dyeing.controller";
import { validateRequest, validateParams } from "@api/middleware/validateRequest";
import {
  createDyeingSendSchema,
  receiveDyeingSchema,
} from "@api/validations/thread-dyeing.validation";
import { idParamsSchema } from "@api/validations/common.validation";

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
