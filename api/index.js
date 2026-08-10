var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/api-entry.ts
import "dotenv/config";

// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

// src/config/env.ts
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5e3),
  DATABASE_URL: z.string().url(),
  // JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  CORS_ORIGIN: z.string().default("*"),
  SMTP_HOST: z.string().default("mail.3qfacility.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().default("info@3qfacility.com"),
  SMTP_PASS: z.string().default("2021@g8021A"),
  SMTP_FROM: z.string().default('"3Q Facility" <info@3qfacility.com>'),
  CEO_EMAIL: z.string().default("ceo@3qfacility.com")
});
var env = envSchema.parse(process.env);
var isDevelopment = env.NODE_ENV === "development";
var isProduction = env.NODE_ENV === "production";
var isTest = env.NODE_ENV === "test";

// src/config/logger.ts
var colors = {
  debug: (text11) => `\x1B[36m[DEBUG]\x1B[0m ${text11}`,
  info: (text11) => `\x1B[32m[INFO]\x1B[0m ${text11}`,
  warn: (text11) => `\x1B[33m[WARN]\x1B[0m ${text11}`,
  error: (text11) => `\x1B[31m[ERROR]\x1B[0m ${text11}`
};
var Logger = class {
  formatMessage(level, message) {
    const timestamp30 = (/* @__PURE__ */ new Date()).toISOString();
    return `${timestamp30} ${colors[level](level.toUpperCase())} ${message}`;
  }
  debug(message, ...args) {
    console.log(this.formatMessage("debug", message), ...args);
  }
  info(message, ...args) {
    console.log(this.formatMessage("info", message), ...args);
  }
  warn(message, ...args) {
    console.warn(this.formatMessage("warn", message), ...args);
  }
  error(message, ...args) {
    console.error(this.formatMessage("error", message), ...args);
  }
};
var logger = new Logger();

// src/api/utils/ApiError.ts
var ApiError = class extends Error {
  statusCode;
  isOperational;
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
};
var BadRequestError = class extends ApiError {
  constructor(message = "Bad request") {
    super(message, 400);
  }
};
var NotFoundError = class extends ApiError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
};
var ConflictError = class extends ApiError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
};

// src/api/utils/asyncHandler.ts
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// src/api/utils/production-formula.ts
var DEFAULT_ROLL_LENGTH_M = 200;
function calculateRequiredRolls(quantity, labelSizeMm, rollLength = DEFAULT_ROLL_LENGTH_M) {
  const length = rollLength > 0 ? rollLength : DEFAULT_ROLL_LENGTH_M;
  if (!(quantity > 0) || !(labelSizeMm > 0)) return 0;
  const labelsPerRoll = length * 39 / (labelSizeMm / 25);
  if (!(labelsPerRoll > 0)) return 0;
  return quantity / labelsPerRoll;
}
function calculateTotalRolls(requiredRolls, extraRolls) {
  const extra = extraRolls > 0 ? extraRolls : 0;
  return Math.ceil(requiredRolls + extra);
}
function calculateTotalWeight(weightPerRoll, totalRolls) {
  if (!(weightPerRoll > 0) || !(totalRolls > 0)) return 0;
  return weightPerRoll * totalRolls;
}
function completionPct(packagedRolls, totalRolls) {
  if (!(totalRolls > 0)) return 0;
  return Math.round(packagedRolls / totalRolls * 1e4) / 100;
}

// src/api/utils/purchase-formula.ts
function calculateTotalRollPer200m(totalRoll, rollLengthM) {
  if (!(totalRoll > 0) || !(rollLengthM > 0)) return 0;
  return totalRoll * (rollLengthM / 200);
}
function calculateInvoiceWeight(netWeight, totalRoll, rollLengthM) {
  if (!(netWeight > 0) || !(totalRoll > 0) || !(rollLengthM > 0)) return 0;
  return netWeight * 200 / (totalRoll * rollLengthM);
}

// src/api/middleware/validateRequest.ts
import { z as z2 } from "zod";
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      if ("body" in parsed) req.validatedBody = parsed.body;
      if ("query" in parsed) req.validatedQuery = parsed.query;
      if ("params" in parsed) req.validatedParams = parsed.params;
      next();
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const message = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        next(new ApiError(message, 400));
        return;
      }
      next(error);
    }
  };
}
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.validatedQuery = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const message = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        next(new ApiError(message, 400));
        return;
      }
      next(error);
    }
  };
}
function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.validatedParams = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const message = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        next(new ApiError(message, 400));
        return;
      }
      next(error);
    }
  };
}

// src/api/utils/errorHandler.ts
function notFound(req, res, next) {
  const error = new ApiError(`Not found - ${req.originalUrl}`, 404);
  next(error);
}
function asPgError(err) {
  if (typeof err === "object" && err !== null && typeof err.code === "string") {
    return err;
  }
  return null;
}
function handlePgError(err, res) {
  const pg = asPgError(err);
  if (!pg) return false;
  switch (pg.code) {
    case "23505":
      res.status(409).json({ status: "error", message: "A record with these details already exists" });
      return true;
    case "23503":
      res.status(400).json({ status: "error", message: "That record is referenced by other data and cannot be changed or removed" });
      return true;
    case "23502":
    // not_null_violation
    case "23514":
      res.status(400).json({ status: "error", message: "One or more values are invalid" });
      return true;
    default:
      return false;
  }
}
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    logger.warn(`ApiError ${err.statusCode}: ${err.message}`);
    res.status(err.statusCode).json({
      status: "error",
      message: err.message
    });
    return;
  }
  if (handlePgError(err, res)) {
    logger.warn(`DB constraint error mapped to ${res.statusCode}`, err);
    return;
  }
  logger.error("Unhandled error", err);
  res.status(500).json({
    status: "error",
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
  });
}

// src/api/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
var apiRateLimiter = rateLimit({
  windowMs: 60 * 1e3,
  limit: 1e3,
  // requests per IP per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please slow down and try again shortly." }
});
var authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { status: "error", message: "Too many attempts, please try again later." }
});

// src/api/routes/index.ts
import { Router as Router20 } from "express";

// src/api/routes/index.routes.ts
import { Router } from "express";
var router = Router();
router.get("/", (req, res) => {
  res.json({ message: "API is running" });
});
var index_routes_default = router;

// src/api/routes/health.routes.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var health_routes_default = router2;

// src/api/routes/companies.routes.ts
import { Router as Router3 } from "express";

// src/db/drizzle.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  brands: () => brands,
  brandsRelations: () => brandsRelations,
  companies: () => companies,
  companiesRelations: () => companiesRelations,
  inkConsumptions: () => inkConsumptions,
  inkPurchases: () => inkPurchases,
  inventoryRollMovements: () => inventoryRollMovements,
  inventoryRolls: () => inventoryRolls,
  inventoryRollsRelations: () => inventoryRollsRelations,
  labelSheets: () => labelSheets,
  localSheets: () => localSheets,
  machines: () => machines,
  machinesRelations: () => machinesRelations,
  materials: () => materials,
  materialsRelations: () => materialsRelations,
  operatorTypeEnum: () => operatorTypeEnum,
  operators: () => operators,
  operatorsRelations: () => operatorsRelations,
  productTypeEnum: () => productTypeEnum,
  productionEventTypeEnum: () => productionEventTypeEnum,
  productionOrderLines: () => productionOrderLines,
  productionOrderLinesRelations: () => productionOrderLinesRelations,
  productionOrderStatusEnum: () => productionOrderStatusEnum,
  productionOrders: () => productionOrders,
  productionOrdersRelations: () => productionOrdersRelations,
  productionRollIssuances: () => productionRollIssuances,
  productionRollIssuancesRelations: () => productionRollIssuancesRelations,
  productionRunReasonEnum: () => productionRunReasonEnum,
  productionRuns: () => productionRuns,
  productionRunsRelations: () => productionRunsRelations,
  productionStageEvents: () => productionStageEvents,
  productionStageEventsRelations: () => productionStageEventsRelations,
  productionStatusEnum: () => productionStatusEnum,
  purchaseRecords: () => purchaseRecords,
  purchaseRecordsRelations: () => purchaseRecordsRelations,
  rollMovementTypeEnum: () => rollMovementTypeEnum,
  stickerMaterials: () => stickerMaterials,
  threadBaseColorEnum: () => threadBaseColorEnum,
  threadDenierEnum: () => threadDenierEnum,
  threadDyeBatches: () => threadDyeBatches,
  threadDyeBatchesRelations: () => threadDyeBatchesRelations,
  threadDyeingAllocations: () => threadDyeingAllocations,
  threadDyeingAllocationsRelations: () => threadDyeingAllocationsRelations,
  threadDyeingReceives: () => threadDyeingReceives,
  threadDyeingReceivesRelations: () => threadDyeingReceivesRelations,
  threadDyeingSendStatusEnum: () => threadDyeingSendStatusEnum,
  threadDyeingSends: () => threadDyeingSends,
  threadDyeingSendsRelations: () => threadDyeingSendsRelations,
  threadMovementTypeEnum: () => threadMovementTypeEnum,
  threadPurchases: () => threadPurchases,
  threadServiceProviders: () => threadServiceProviders,
  threadServiceProvidersRelations: () => threadServiceProvidersRelations,
  threadStockMovements: () => threadStockMovements,
  threadStockMovementsRelations: () => threadStockMovementsRelations,
  threadStockTypeEnum: () => threadStockTypeEnum,
  threadStocks: () => threadStocks,
  threadStocksRelations: () => threadStocksRelations,
  userRoleEnum: () => userRoleEnum,
  users: () => users,
  usersRelations: () => usersRelations,
  workOrderStatusEnum: () => workOrderStatusEnum,
  workOrders: () => workOrders,
  workOrdersRelations: () => workOrdersRelations,
  wovenProductionLines: () => wovenProductionLines,
  wovenProductionLinesRelations: () => wovenProductionLinesRelations,
  wovenThreadPlanItems: () => wovenThreadPlanItems,
  wovenThreadPlanItemsRelations: () => wovenThreadPlanItemsRelations,
  wovenWorkOrderDetails: () => wovenWorkOrderDetails,
  wovenWorkOrderDetailsRelations: () => wovenWorkOrderDetailsRelations
});

// src/db/tables/companies.table.ts
import { pgTable, serial, varchar, boolean, timestamp, unique } from "drizzle-orm/pg-core";
var companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    contactPerson: varchar("contact_person", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    nameIdx: unique("companies_name_idx").on(table.name)
  })
);

// src/db/tables/brands.table.ts
import { pgTable as pgTable2, serial as serial2, varchar as varchar2, timestamp as timestamp2, index, unique as unique2, integer } from "drizzle-orm/pg-core";
var brands = pgTable2(
  "brands",
  {
    id: serial2("id").primaryKey(),
    companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    name: varchar2("name", { length: 255 }).notNull(),
    createdAt: timestamp2("created_at").defaultNow().notNull(),
    updatedAt: timestamp2("updated_at").defaultNow().notNull()
  },
  (table) => ({
    companyIdx: index("brands_company_idx").on(table.companyId),
    companyNameIdx: unique2("brands_company_name_idx").on(table.companyId, table.name)
  })
);

// src/db/tables/materials.table.ts
import { pgTable as pgTable3, serial as serial3, varchar as varchar3, text, decimal, integer as integer2, boolean as boolean2, timestamp as timestamp3, unique as unique3 } from "drizzle-orm/pg-core";
var materials = pgTable3(
  "materials",
  {
    id: serial3("id").primaryKey(),
    code: varchar3("code", { length: 100 }).notNull().unique(),
    type: varchar3("type", { length: 100 }).notNull(),
    description: text("description"),
    weightPerRoll: decimal("weight_per_roll", { precision: 10, scale: 4 }).notNull(),
    minStockLevel: integer2("min_stock_level").default(10).notNull(),
    reorderQty: integer2("reorder_qty").default(50).notNull(),
    isActive: boolean2("is_active").default(true).notNull(),
    createdAt: timestamp3("created_at").defaultNow().notNull(),
    updatedAt: timestamp3("updated_at").defaultNow().notNull()
  },
  (table) => ({
    codeIdx: unique3("materials_code_idx").on(table.code)
  })
);

// src/db/tables/machines.table.ts
import { pgTable as pgTable6, serial as serial6, varchar as varchar6, timestamp as timestamp6, integer as integer4, boolean as boolean5 } from "drizzle-orm/pg-core";

// src/db/tables/operators.table.ts
import { pgTable as pgTable5, serial as serial5, varchar as varchar5, timestamp as timestamp5, boolean as boolean4, integer as integer3, text as text2, index as index3 } from "drizzle-orm/pg-core";

// src/db/tables/users.table.ts
import { pgTable as pgTable4, serial as serial4, varchar as varchar4, boolean as boolean3, timestamp as timestamp4, pgEnum, index as index2 } from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("user_role", [
  "office_staff",
  "production_manager",
  "production_operator"
]);
var users = pgTable4(
  "users",
  {
    id: serial4("id").primaryKey(),
    name: varchar4("name", { length: 255 }).notNull(),
    employeeCode: varchar4("employee_code", { length: 100 }),
    email: varchar4("email", { length: 255 }).unique(),
    role: userRoleEnum("role").notNull(),
    isActive: boolean3("is_active").default(true).notNull(),
    createdAt: timestamp4("created_at").defaultNow().notNull(),
    updatedAt: timestamp4("updated_at").defaultNow().notNull()
  },
  (table) => ({
    roleIdx: index2("users_role_idx").on(table.role)
  })
);

// src/db/tables/operator-type.enum.ts
import { pgEnum as pgEnum2 } from "drizzle-orm/pg-core";
var operatorTypeEnum = pgEnum2("operator_type", ["printed", "woven", "both"]);

// src/db/tables/operators.table.ts
var operators = pgTable5("operators", {
  id: serial5("id").primaryKey(),
  name: varchar5("name", { length: 255 }).notNull().unique(),
  employeeCode: varchar5("employee_code", { length: 100 }),
  /** Which stage they work: Printing / Cutting / Packaging. */
  designation: varchar5("designation", { length: 50 }).notNull().default("Printing"),
  /**
   * Which product line they are trained for. Production pickers filter on this so a woven
   * job never offers a printed-only operator. Defaults to `both` — see the enum.
   */
  operatorType: operatorTypeEnum("operator_type").default("both").notNull(),
  /**
   * Avatar image URL. Plain text today (paste any URL); swapping in a Cloudinary-hosted URL
   * later needs no schema change — only the upload path that produces the URL.
   */
  avatarUrl: text2("avatar_url"),
  shift: varchar5("shift", { length: 50 }),
  status: varchar5("status", { length: 50 }).notNull().default("Active"),
  /** Optional link to the staff directory, so floor activity can be attributed to a user. */
  userId: integer3("user_id").references(() => users.id),
  isActive: boolean4("is_active").default(true).notNull(),
  createdAt: timestamp5("created_at").defaultNow().notNull(),
  updatedAt: timestamp5("updated_at").defaultNow().notNull()
}, (table) => ({
  operatorTypeIdx: index3("operators_operator_type_idx").on(table.operatorType),
  designationIdx: index3("operators_designation_idx").on(table.designation)
}));

// src/db/tables/machines.table.ts
var machines = pgTable6("machines", {
  id: serial6("id").primaryKey(),
  name: varchar6("name", { length: 255 }).notNull().unique(),
  machineCode: varchar6("machine_code", { length: 100 }).notNull().unique(),
  machineOperatorId: integer4("machine_operator_id").references(() => operators.id),
  machineType: varchar6("machine_type", { length: 50 }).notNull().default("Other"),
  /** Which product line the machine is built for: printed / woven / both. Defaults to `both`. */
  productType: operatorTypeEnum("product_type").default("both").notNull(),
  machineName: varchar6("machine_name", { length: 255 }).notNull(),
  capacityPerHour: integer4("capacity_per_hour"),
  status: varchar6("status", { length: 50 }).notNull().default("Active"),
  isActive: boolean5("is_active").default(true).notNull(),
  createdAt: timestamp6("created_at").defaultNow().notNull(),
  updatedAt: timestamp6("updated_at").defaultNow().notNull()
});

// src/db/tables/work-orders.table.ts
import { pgTable as pgTable7, serial as serial7, varchar as varchar7, date, integer as integer5, timestamp as timestamp7, unique as unique4, text as text3, index as index4, pgEnum as pgEnum4 } from "drizzle-orm/pg-core";

// src/db/tables/product-type.enum.ts
import { pgEnum as pgEnum3 } from "drizzle-orm/pg-core";
var productTypeEnum = pgEnum3("product_type", ["printed", "woven"]);

// src/db/tables/work-orders.table.ts
var workOrderStatusEnum = pgEnum4("work_order_status", [
  "initiate_production",
  "production",
  "complete",
  /**
   * Goods have left the facility. Reached only by recording the dispatch paperwork
   * (DC number, LC number and FBR invoice number) against a `complete` order — it is the
   * one status that dispatch, not production, decides. Terminal: production re-syncs never
   * downgrade a dispatched order.
   */
  "dispatched"
]);
var workOrders = pgTable7(
  "work_orders",
  {
    id: serial7("id").primaryKey(),
    soNumber: varchar7("so_number", { length: 100 }).notNull().unique(),
    poNumber: varchar7("po_number", { length: 100 }),
    orderDate: date("order_date").notNull(),
    dueDate: date("due_date"),
    totalQty: integer5("total_qty").notNull(),
    brandId: integer5("brand_id").references(() => brands.id),
    comment: text3("comment"),
    /**
     * Artwork / reference image for the order, rendered on the detail page. Plain URL text
     * today; a Cloudinary-hosted URL would drop in here unchanged.
     */
    imageUrl: text3("image_url"),
    status: workOrderStatusEnum("status").default("initiate_production").notNull(),
    /**
     * Scheduling priority, set by office staff on any order (woven or printed).
     * Stored as a plain varchar (not a pg enum) so the value set is easy to extend —
     * validated to `normal | urgent | emergency` by the Zod schema. Default `normal`.
     */
    priority: varchar7("priority", { length: 20 }).default("normal").notNull(),
    /**
     * Why this order exists. Validated to
     * `normal order | shortfall | additional order | recut order`. Default `normal order`.
     */
    orderType: varchar7("order_type", { length: 30 }).default("normal order").notNull(),
    /**
     * Which manufacturing workflow this order runs through. Defaults to `printed`, so every
     * pre-existing row keeps its current behaviour untouched. Woven orders additionally
     * carry a `woven_work_order_details` row with the loom specification.
     */
    productType: productTypeEnum("product_type").default("printed").notNull(),
    /** Dispatch chalan number — required to complete dispatch, and searchable. */
    dcNumber: varchar7("dc_number", { length: 100 }),
    /** Letter-of-credit number — required to complete dispatch, and searchable. */
    lcNumber: varchar7("lc_number", { length: 100 }),
    /** FBR (tax authority) invoice number — required to complete dispatch, and searchable. */
    fbrInvoiceNumber: varchar7("fbr_invoice_number", { length: 100 }),
    /** Dispatch date — captured against a completed order. */
    dispatchedDate: date("dispatched_date"),
    /** Quantity actually dispatched; may differ from `totalQty` on a short shipment. */
    dispatchedQty: integer5("dispatched_qty"),
    createdAt: timestamp7("created_at").defaultNow().notNull(),
    updatedAt: timestamp7("updated_at").defaultNow().notNull()
  },
  (table) => ({
    soNumberIdx: unique4("work_orders_so_number_idx").on(table.soNumber),
    brandIdx: index4("work_orders_brand_idx").on(table.brandId),
    statusIdx: index4("work_orders_status_idx").on(table.status),
    productTypeIdx: index4("work_orders_product_type_idx").on(table.productType),
    // Dispatch paperwork is searchable, so both numbers get an index.
    dcNumberIdx: index4("work_orders_dc_number_idx").on(table.dcNumber),
    lcNumberIdx: index4("work_orders_lc_number_idx").on(table.lcNumber),
    fbrInvoiceIdx: index4("work_orders_fbr_invoice_idx").on(table.fbrInvoiceNumber)
  })
);

// src/db/tables/production-status.enum.ts
import { pgEnum as pgEnum5 } from "drizzle-orm/pg-core";
var productionStatusEnum = pgEnum5("production_status", [
  "pending",
  "active",
  "paused",
  "completed",
  "cancelled"
]);

// src/db/tables/production-orders.table.ts
import { pgTable as pgTable8, serial as serial8, integer as integer6, varchar as varchar8, text as text4, timestamp as timestamp8, index as index5, pgEnum as pgEnum6 } from "drizzle-orm/pg-core";
var productionOrderStatusEnum = pgEnum6("production_order_status", [
  "planned",
  "production",
  "complete"
]);
var productionOrders = pgTable8(
  "production_orders",
  {
    id: serial8("id").primaryKey(),
    productionNumber: varchar8("production_number", { length: 100 }).notNull().unique(),
    workOrderId: integer6("work_order_id").notNull().unique().references(() => workOrders.id, { onDelete: "restrict" }),
    totalQty: integer6("total_qty").notNull(),
    status: productionOrderStatusEnum("status").default("planned").notNull(),
    notes: text4("notes"),
    createdByUserId: integer6("created_by_user_id").references(() => users.id),
    plannedAt: timestamp8("planned_at"),
    completedAt: timestamp8("completed_at"),
    createdAt: timestamp8("created_at").defaultNow().notNull(),
    updatedAt: timestamp8("updated_at").defaultNow().notNull()
  },
  (table) => ({
    workOrderIdx: index5("production_orders_work_order_idx").on(table.workOrderId),
    statusIdx: index5("production_orders_status_idx").on(table.status)
  })
);

// src/db/tables/production-order-lines.table.ts
import { pgTable as pgTable9, serial as serial9, integer as integer7, varchar as varchar9, decimal as decimal2, text as text5, timestamp as timestamp9, index as index6 } from "drizzle-orm/pg-core";
var productionOrderLines = pgTable9(
  "production_order_lines",
  {
    id: serial9("id").primaryKey(),
    productionOrderId: integer7("production_order_id").notNull().references(() => productionOrders.id, { onDelete: "cascade" }),
    labelType: varchar9("label_type", { length: 255 }).notNull(),
    /* --- Planning (Phase 2) --- */
    quantity: decimal2("quantity", { precision: 12, scale: 2 }).notNull(),
    /* --- Roll planning (Phase 3) --- */
    /** Label size in millimetres — an input to the required-rolls formula. */
    labelSize: decimal2("label_size", { precision: 10, scale: 2 }).notNull(),
    /** Roll length in metres. Retained for back-compat only — no longer part of any formula. */
    rollLength: decimal2("roll_length", { precision: 10, scale: 2 }),
    /** Calculated server-side: quantity / (7800 / (labelSize / 25)). Never client-supplied. */
    requiredRolls: decimal2("required_rolls", { precision: 12, scale: 4 }).notNull(),
    /** Manual buffer added by the production manager. */
    extraRolls: decimal2("extra_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    /** Total rolls issued = ceil(requiredRolls + extraRolls); a whole number. Recomputed on every plan write. */
    totalRolls: decimal2("total_rolls", { precision: 10, scale: 2 }).notNull(),
    /** Total weight = materials.weightPerRoll * totalRolls, captured at plan time. Read-only. */
    totalWeight: decimal2("total_weight", { precision: 14, scale: 4 }),
    /* --- Material issuance from inventory --- */
    /** Raw material this label type is printed on. Required before rolls can be issued. */
    materialCode: varchar9("material_code", { length: 100 }).references(() => materials.code),
    /** Denormalized running sum of `production_roll_issuances`; kept in sync transactionally. */
    issuedRolls: decimal2("issued_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    /* --- Cumulative roll flow (Phases 4-8) --- */
    printedRolls: decimal2("printed_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    sentToCuttingRolls: decimal2("sent_to_cutting_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    cutRolls: decimal2("cut_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    sentToPackagingRolls: decimal2("sent_to_packaging_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    packagedRolls: decimal2("packaged_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    /* --- Output in labels --- */
    packagedQty: decimal2("packaged_qty", { precision: 12, scale: 2 }).default("0").notNull(),
    /* --- Resource assignment. Packaging has an operator but no machine. --- */
    printingMachineId: integer7("printing_machine_id").references(() => machines.id),
    printingOperatorId: integer7("printing_operator_id").references(() => operators.id),
    cuttingMachineId: integer7("cutting_machine_id").references(() => machines.id),
    cuttingOperatorId: integer7("cutting_operator_id").references(() => operators.id),
    packagingOperatorId: integer7("packaging_operator_id").references(() => operators.id),
    /**
     * When each stage finished — stamped the moment its counter first reaches the planned
     * roll count, and cleared if the count is later corrected back below it. Together with
     * the operator columns above these give a finished order full traceability: who did
     * each stage, and when it completed.
     */
    printingCompletedAt: timestamp9("printing_completed_at"),
    cuttingCompletedAt: timestamp9("cutting_completed_at"),
    packagingCompletedAt: timestamp9("packaging_completed_at"),
    /* --- Stock Reconciliation after completion --- */
    usedRolls: decimal2("used_rolls", { precision: 10, scale: 2 }).default("0").notNull(),
    usedWeight: decimal2("used_weight", { precision: 14, scale: 4 }).default("0").notNull(),
    extraRollsReturned: decimal2("extra_rolls_returned", { precision: 10, scale: 2 }).default("0").notNull(),
    extraWeight: decimal2("extra_weight", { precision: 14, scale: 4 }).default("0").notNull(),
    reconciledAt: timestamp9("reconciled_at"),
    status: productionStatusEnum("status").default("pending").notNull(),
    notes: text5("notes"),
    createdAt: timestamp9("created_at").defaultNow().notNull(),
    updatedAt: timestamp9("updated_at").defaultNow().notNull()
  },
  (table) => ({
    productionOrderIdx: index6("production_order_lines_order_idx").on(table.productionOrderId),
    statusIdx: index6("production_order_lines_status_idx").on(table.status),
    materialCodeIdx: index6("production_order_lines_material_code_idx").on(table.materialCode),
    printingMachineIdx: index6("production_order_lines_printing_machine_idx").on(table.printingMachineId),
    printingOperatorIdx: index6("production_order_lines_printing_operator_idx").on(table.printingOperatorId),
    cuttingMachineIdx: index6("production_order_lines_cutting_machine_idx").on(table.cuttingMachineId),
    cuttingOperatorIdx: index6("production_order_lines_cutting_operator_idx").on(table.cuttingOperatorId),
    packagingOperatorIdx: index6("production_order_lines_packaging_operator_idx").on(table.packagingOperatorId)
  })
);

// src/db/tables/production-stage-events.table.ts
import { pgTable as pgTable10, serial as serial10, integer as integer8, decimal as decimal3, text as text6, timestamp as timestamp10, index as index7, pgEnum as pgEnum7 } from "drizzle-orm/pg-core";
var productionEventTypeEnum = pgEnum7("production_event_type", [
  "printing_progress",
  "transfer_to_cutting",
  "cutting_progress",
  "transfer_to_packaging",
  "packaging_progress",
  "assignment",
  "row_update"
]);
var productionStageEvents = pgTable10(
  "production_stage_events",
  {
    id: serial10("id").primaryKey(),
    productionOrderLineId: integer8("production_order_line_id").notNull().references(() => productionOrderLines.id, { onDelete: "cascade" }),
    eventType: productionEventTypeEnum("event_type").notNull(),
    previousValue: decimal3("previous_value", { precision: 12, scale: 2 }),
    newValue: decimal3("new_value", { precision: 12, scale: 2 }),
    delta: decimal3("delta", { precision: 12, scale: 2 }),
    actorUserId: integer8("actor_user_id").references(() => users.id),
    note: text6("note"),
    createdAt: timestamp10("created_at").defaultNow().notNull()
  },
  (table) => ({
    lineIdx: index7("production_stage_events_line_idx").on(table.productionOrderLineId),
    actorIdx: index7("production_stage_events_actor_idx").on(table.actorUserId),
    createdAtIdx: index7("production_stage_events_created_at_idx").on(table.createdAt)
  })
);

// src/db/tables/production-roll-issuances.table.ts
import { pgTable as pgTable11, serial as serial11, integer as integer9, varchar as varchar10, decimal as decimal4, text as text7, timestamp as timestamp11, index as index8 } from "drizzle-orm/pg-core";
var productionRollIssuances = pgTable11(
  "production_roll_issuances",
  {
    id: serial11("id").primaryKey(),
    productionOrderLineId: integer9("production_order_line_id").notNull().references(() => productionOrderLines.id, { onDelete: "cascade" }),
    materialCode: varchar10("material_code", { length: 100 }).notNull().references(() => materials.code),
    rolls: decimal4("rolls", { precision: 10, scale: 2 }).notNull(),
    note: text7("note"),
    actorUserId: integer9("actor_user_id").references(() => users.id),
    createdAt: timestamp11("created_at").defaultNow().notNull()
  },
  (table) => ({
    lineIdx: index8("production_roll_issuances_line_idx").on(table.productionOrderLineId),
    materialCodeIdx: index8("production_roll_issuances_material_code_idx").on(table.materialCode)
  })
);

// src/db/tables/purchase-record.table.ts
import { pgTable as pgTable12, serial as serial12, date as date2, varchar as varchar11, integer as integer10, decimal as decimal5, timestamp as timestamp12, index as index9 } from "drizzle-orm/pg-core";
var purchaseRecords = pgTable12(
  "purchase_records",
  {
    id: serial12("id").primaryKey(),
    reportDate: date2("report_date").notNull(),
    materialCode: varchar11("material_code", { length: 100 }).notNull().references(() => materials.code),
    materialType: varchar11("material_type", { length: 100 }),
    itemName: varchar11("item_name", { length: 255 }),
    invoiceNumber: varchar11("invoice_number", { length: 255 }),
    vendor: varchar11("vendor", { length: 255 }).notNull(),
    cartonQty: integer10("carton_qty").notNull(),
    rollsPerCarton: integer10("rolls_per_carton").notNull(),
    totalRoll: decimal5("total_roll", { precision: 12, scale: 2 }),
    rollLength: decimal5("roll_length", { precision: 10, scale: 2 }).notNull(),
    netWeight: decimal5("net_weight", { precision: 10, scale: 2 }).notNull(),
    efs: varchar11("efs", { length: 100 }),
    /** = totalRoll * (rollLength / 200). Always server-calculated — see purchase-formula.ts. */
    totalRollPer200m: decimal5("total_roll_per_200m", { precision: 12, scale: 2 }),
    /** = (netWeight * 200) / (totalRoll * rollLength). Always server-calculated. */
    invoiceWeight: decimal5("invoice_weight", { precision: 10, scale: 2 }),
    /** Copied from `materials.weightPerRoll` for the purchase's material. Never user-entered. */
    localWeight: decimal5("local_weight", { precision: 10, scale: 4 }),
    gdNumber: varchar11("gd_number", { length: 100 }),
    createdAt: timestamp12("created_at").defaultNow().notNull(),
    updatedAt: timestamp12("updated_at").defaultNow().notNull()
  },
  (table) => ({
    materialCodeIdx: index9("purchase_records_material_code_idx").on(table.materialCode)
  })
);

// src/db/tables/inventory-rolls.table.ts
import { pgTable as pgTable13, serial as serial13, varchar as varchar12, decimal as decimal6, timestamp as timestamp13, unique as unique5 } from "drizzle-orm/pg-core";
var inventoryRolls = pgTable13(
  "inventory_rolls",
  {
    id: serial13("id").primaryKey(),
    materialCode: varchar12("material_code", { length: 100 }).notNull().unique().references(() => materials.code),
    openingStock: decimal6("opening_stock", { precision: 12, scale: 2 }).default("0").notNull(),
    receivedRolls: decimal6("received_rolls", { precision: 12, scale: 2 }).default("0").notNull(),
    issuedRolls: decimal6("issued_rolls", { precision: 12, scale: 2 }).default("0").notNull(),
    balanceRolls: decimal6("balance_rolls", { precision: 12, scale: 2 }).default("0").notNull(),
    /** Rolls per kilogram for this material — user input. Drives the computed per-SKU balance. */
    rollPerKg: decimal6("roll_per_kg", { precision: 12, scale: 4 }).default("0").notNull(),
    createdAt: timestamp13("created_at").defaultNow().notNull(),
    updatedAt: timestamp13("updated_at").defaultNow().notNull()
  },
  (table) => ({
    materialCodeIdx: unique5("inventory_rolls_material_code_idx").on(table.materialCode)
  })
);

// src/db/tables/inventory-roll-movements.table.ts
import { pgTable as pgTable14, serial as serial14, integer as integer11, varchar as varchar13, decimal as decimal7, timestamp as timestamp14, index as index10, pgEnum as pgEnum8 } from "drizzle-orm/pg-core";
var rollMovementTypeEnum = pgEnum8("roll_movement_type", [
  "opening_balance",
  // ledger created with an opening stock
  "purchase_receipt",
  // credited by a purchase record
  "purchase_reversal",
  // purchase edited down or deleted
  "production_issue",
  // debited by production planning / issuance
  "production_release",
  // credited back when a plan is changed or cancelled
  "adjustment"
  // manual correction from the stock screen
]);
var inventoryRollMovements = pgTable14(
  "inventory_roll_movements",
  {
    id: serial14("id").primaryKey(),
    inventoryRollId: integer11("inventory_roll_id").notNull().references(() => inventoryRolls.id, { onDelete: "cascade" }),
    /** Denormalised so history stays readable even if the ledger row is later removed. */
    materialCode: varchar13("material_code", { length: 100 }).notNull(),
    movementType: rollMovementTypeEnum("movement_type").notNull(),
    /** Signed: + credits the ledger, - debits it. */
    rolls: decimal7("rolls", { precision: 12, scale: 2 }).notNull(),
    /** Balance immediately after this movement — makes the history readable on its own. */
    balanceAfter: decimal7("balance_after", { precision: 12, scale: 2 }).notNull(),
    referenceType: varchar13("reference_type", { length: 50 }),
    referenceId: integer11("reference_id"),
    note: varchar13("note", { length: 500 }),
    actorUserId: integer11("actor_user_id").references(() => users.id),
    createdAt: timestamp14("created_at").defaultNow().notNull()
  },
  (table) => ({
    rollIdx: index10("inventory_roll_movements_roll_idx").on(table.inventoryRollId),
    materialIdx: index10("inventory_roll_movements_material_idx").on(table.materialCode),
    createdIdx: index10("inventory_roll_movements_created_idx").on(table.createdAt)
  })
);

// src/db/tables/ink-purchases.table.ts
import { pgTable as pgTable15, serial as serial15, varchar as varchar14, date as date3, decimal as decimal8, timestamp as timestamp15, index as index11 } from "drizzle-orm/pg-core";
var inkPurchases = pgTable15(
  "ink_purchases",
  {
    id: serial15("id").primaryKey(),
    reportDate: date3("report_date").notNull(),
    materialCode: varchar14("material_code", { length: 100 }).notNull(),
    vendor: varchar14("vendor", { length: 200 }).notNull(),
    invoiceNumber: varchar14("invoice_number", { length: 100 }),
    /** Units purchased (cans / tins / kg-lots — whatever the facility counts ink in). */
    quantity: decimal8("quantity", { precision: 12, scale: 2 }).notNull(),
    /** Weight per unit. */
    weightPerQty: decimal8("weight_per_qty", { precision: 12, scale: 3 }).notNull(),
    /** Server-calculated `quantity × weightPerQty`. */
    totalWeight: decimal8("total_weight", { precision: 14, scale: 3 }).notNull(),
    createdAt: timestamp15("created_at").defaultNow().notNull()
  },
  (table) => ({
    materialCodeIdx: index11("ink_purchases_material_code_idx").on(table.materialCode)
  })
);

// src/db/tables/ink-consumptions.table.ts
import { pgTable as pgTable16, serial as serial16, varchar as varchar15, integer as integer12, decimal as decimal9, text as text8, timestamp as timestamp16, index as index12 } from "drizzle-orm/pg-core";
var inkConsumptions = pgTable16(
  "ink_consumptions",
  {
    id: serial16("id").primaryKey(),
    materialCode: varchar15("material_code", { length: 100 }).notNull(),
    /** Units drawn. */
    qtyAssigned: decimal9("qty_assigned", { precision: 12, scale: 2 }).notNull(),
    operatorId: integer12("operator_id").references(() => operators.id),
    operatorName: varchar15("operator_name", { length: 200 }),
    /** Weight consumed — this is what debits ink stock. */
    weight: decimal9("weight", { precision: 14, scale: 3 }).notNull(),
    note: text8("note"),
    consumedAt: timestamp16("consumed_at").defaultNow().notNull()
  },
  (table) => ({
    materialCodeIdx: index12("ink_consumptions_material_code_idx").on(table.materialCode),
    operatorIdx: index12("ink_consumptions_operator_idx").on(table.operatorId)
  })
);

// src/db/tables/production-run-reason.enum.ts
import { pgEnum as pgEnum9 } from "drizzle-orm/pg-core";
var productionRunReasonEnum = pgEnum9("production_run_reason", [
  "initial",
  "shortfall",
  "additional_order",
  "recut",
  "rework",
  "retry",
  "other"
]);

// src/db/tables/production-runs.table.ts
import { pgTable as pgTable17, uuid, integer as integer13, varchar as varchar16, decimal as decimal10, text as text9, timestamp as timestamp17, index as index13 } from "drizzle-orm/pg-core";
var productionRuns = pgTable17(
  "production_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleOrderId: integer13("sale_order_id").notNull().references(() => workOrders.id, { onDelete: "cascade" }),
    /** Label type / product specification this pass produced. */
    productId: varchar16("product_id", { length: 150 }),
    machineId: integer13("machine_id").references(() => machines.id),
    operatorId: integer13("operator_id").references(() => operators.id),
    quantityProduced: decimal10("quantity_produced", { precision: 12, scale: 2 }).notNull(),
    runReason: productionRunReasonEnum("run_reason").default("initial").notNull(),
    notes: text9("notes"),
    producedAt: timestamp17("produced_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: integer13("created_by").references(() => users.id),
    /** Client-supplied token for duplicate-submission protection. */
    idempotencyKey: varchar16("idempotency_key", { length: 100 }),
    createdAt: timestamp17("created_at").defaultNow().notNull(),
    updatedAt: timestamp17("updated_at").defaultNow().notNull()
  },
  (table) => ({
    saleOrderIdx: index13("production_runs_sale_order_idx").on(table.saleOrderId),
    producedAtIdx: index13("production_runs_produced_at_idx").on(table.producedAt),
    idempotencyIdx: index13("production_runs_idempotency_idx").on(table.idempotencyKey)
  })
);

// src/db/tables/sticker-materials.table.ts
import { pgTable as pgTable18, serial as serial17, varchar as varchar17, numeric, date as date4, timestamp as timestamp18, index as index14 } from "drizzle-orm/pg-core";
var stickerMaterials = pgTable18(
  "sticker_materials",
  {
    id: serial17("id").primaryKey(),
    invoiceDate: date4("invoice_date").notNull(),
    /** e.g. "4 x 6". */
    stickerSize: varchar17("sticker_size", { length: 100 }).notNull(),
    materialCode: varchar17("material_code", { length: 100 }).notNull(),
    rollQuantity: numeric("roll_quantity", { precision: 12, scale: 2 }).notNull(),
    weightPerRoll: numeric("weight_per_roll", { precision: 12, scale: 3 }).notNull(),
    /** Server-calculated: rollQuantity × weightPerRoll. */
    totalWeight: numeric("total_weight", { precision: 14, scale: 3 }).notNull(),
    createdAt: timestamp18("created_at").defaultNow().notNull(),
    updatedAt: timestamp18("updated_at").defaultNow().notNull()
  },
  (table) => ({
    materialCodeIdx: index14("sticker_materials_material_code_idx").on(table.materialCode),
    dateIdx: index14("sticker_materials_date_idx").on(table.invoiceDate)
  })
);

// src/db/tables/local-sheets.table.ts
import { pgTable as pgTable19, serial as serial18, varchar as varchar18, numeric as numeric2, date as date5, timestamp as timestamp19, index as index15 } from "drizzle-orm/pg-core";
var localSheets = pgTable19(
  "local_sheets",
  {
    id: serial18("id").primaryKey(),
    date: date5("date").notNull(),
    /** e.g. "20 x 30". */
    materialCode: varchar18("material_code", { length: 100 }).notNull(),
    packetQuantity: numeric2("packet_quantity", { precision: 12, scale: 2 }).notNull(),
    packetWeight: numeric2("packet_weight", { precision: 12, scale: 3 }).notNull(),
    /** Server-calculated: packetQuantity × packetWeight. */
    totalWeight: numeric2("total_weight", { precision: 14, scale: 3 }).notNull(),
    createdAt: timestamp19("created_at").defaultNow().notNull(),
    updatedAt: timestamp19("updated_at").defaultNow().notNull()
  },
  (table) => ({
    materialCodeIdx: index15("local_sheets_material_code_idx").on(table.materialCode),
    dateIdx: index15("local_sheets_date_idx").on(table.date)
  })
);

// src/db/tables/label-sheets.table.ts
import { pgTable as pgTable20, serial as serial19, varchar as varchar19, numeric as numeric3, date as date6, timestamp as timestamp20, index as index16 } from "drizzle-orm/pg-core";
var labelSheets = pgTable20(
  "label_sheets",
  {
    id: serial19("id").primaryKey(),
    date: date6("date").notNull(),
    materialCode: varchar19("material_code", { length: 100 }).notNull(),
    sheetQuantity: numeric3("sheet_quantity", { precision: 12, scale: 2 }).notNull(),
    weightPerSheet: numeric3("weight_per_sheet", { precision: 12, scale: 3 }).notNull(),
    /** Server-calculated: sheetQuantity × weightPerSheet. */
    totalWeight: numeric3("total_weight", { precision: 14, scale: 3 }).notNull(),
    createdAt: timestamp20("created_at").defaultNow().notNull(),
    updatedAt: timestamp20("updated_at").defaultNow().notNull()
  },
  (table) => ({
    materialCodeIdx: index16("label_sheets_material_code_idx").on(table.materialCode),
    dateIdx: index16("label_sheets_date_idx").on(table.date)
  })
);

// src/db/tables/woven-work-order-details.table.ts
import { pgTable as pgTable21, serial as serial20, integer as integer14, varchar as varchar20, numeric as numeric4, jsonb, timestamp as timestamp21, index as index17 } from "drizzle-orm/pg-core";
var wovenWorkOrderDetails = pgTable21(
  "woven_work_order_details",
  {
    id: serial20("id").primaryKey(),
    workOrderId: integer14("work_order_id").notNull().unique().references(() => workOrders.id, { onDelete: "cascade" }),
    /** Customer-facing design identifier, e.g. "Guess 13R". Unique across the facility. */
    designCode: varchar20("design_code", { length: 100 }).notNull().unique(),
    /** Weft picks per unit, e.g. 853. */
    pick: integer14("pick").notNull(),
    /** Design repeat length, e.g. 60. */
    repeat: numeric4("repeat", { precision: 12, scale: 2 }).notNull(),
    /** Warp density, e.g. 560. */
    density: integer14("density").notNull(),
    /** Extra allowance added on top of the ordered quantity, e.g. 150. */
    extra: numeric4("extra", { precision: 12, scale: 2 }).default("0").notNull(),
    /** Size labels woven on this order, e.g. ["10", "12", "XL", "34/34"]. */
    sizeLabels: jsonb("size_labels").$type().default([]).notNull(),
    createdAt: timestamp21("created_at").defaultNow().notNull(),
    updatedAt: timestamp21("updated_at").defaultNow().notNull()
  },
  (table) => ({
    workOrderIdx: index17("woven_wo_details_work_order_idx").on(table.workOrderId),
    designCodeIdx: index17("woven_wo_details_design_code_idx").on(table.designCode)
  })
);

// src/db/tables/woven-production-lines.table.ts
import { pgTable as pgTable22, serial as serial21, integer as integer15, numeric as numeric5, date as date7, timestamp as timestamp22, index as index18 } from "drizzle-orm/pg-core";
var wovenProductionLines = pgTable22(
  "woven_production_lines",
  {
    id: serial21("id").primaryKey(),
    productionOrderId: integer15("production_order_id").notNull().references(() => productionOrders.id, { onDelete: "cascade" }),
    /** Pieces to produce — copied from the sales order quantity at planning time. */
    quantity: numeric5("quantity", { precision: 14, scale: 2 }).notNull(),
    /* ---------- Planning ---------- */
    /** Sum of every thread plan item's weight. Server-calculated, never client-supplied. */
    totalThreadWeightKg: numeric5("total_thread_weight_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    /** True once thread colours + machine + operator are all set and stock is reserved. */
    planningCompletedAt: timestamp22("planning_completed_at"),
    /* ---------- Weaving ---------- */
    weavingMachineId: integer15("weaving_machine_id").references(() => machines.id),
    weavingOperatorId: integer15("weaving_operator_id").references(() => operators.id),
    wovenQty: numeric5("woven_qty", { precision: 14, scale: 2 }).default("0").notNull(),
    weavingStatus: productionStatusEnum("weaving_status").default("pending").notNull(),
    weavingStartedAt: timestamp22("weaving_started_at"),
    weavingEndedAt: timestamp22("weaving_ended_at"),
    /* ---------- Cutting ---------- */
    cuttingOperatorId: integer15("cutting_operator_id").references(() => operators.id),
    cutQty: numeric5("cut_qty", { precision: 14, scale: 2 }).default("0").notNull(),
    cuttingDate: date7("cutting_date"),
    /* ---------- Packaging ---------- */
    packagingOperatorId: integer15("packaging_operator_id").references(() => operators.id),
    packagedQty: numeric5("packaged_qty", { precision: 14, scale: 2 }).default("0").notNull(),
    packagedWeightKg: numeric5("packaged_weight_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    packagingDate: date7("packaging_date"),
    /** Derived from the stage counters, exactly like the printed line's status. */
    status: productionStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp22("created_at").defaultNow().notNull(),
    updatedAt: timestamp22("updated_at").defaultNow().notNull()
  },
  (table) => ({
    orderIdx: index18("woven_production_lines_order_idx").on(table.productionOrderId),
    statusIdx: index18("woven_production_lines_status_idx").on(table.status)
  })
);

// src/db/tables/woven-thread-plan-items.table.ts
import { pgTable as pgTable24, serial as serial23, integer as integer16, varchar as varchar22, numeric as numeric7, timestamp as timestamp24, unique as unique7, index as index20 } from "drizzle-orm/pg-core";

// src/db/tables/thread.enums.ts
import { pgEnum as pgEnum10 } from "drizzle-orm/pg-core";
var threadDenierEnum = pgEnum10("thread_denier", ["45", "75", "100", "150"]);
var threadBaseColorEnum = pgEnum10("thread_base_color", ["White", "Black"]);
var threadStockTypeEnum = pgEnum10("thread_stock_type", ["primary", "secondary"]);
var threadMovementTypeEnum = pgEnum10("thread_movement_type", [
  "purchase_receipt",
  // primary stock credited from a receiving record
  "dye_consume",
  // primary stock debited by a dye batch
  "dye_produce",
  // secondary stock credited by a dye batch
  "production_issue",
  // stock debited by woven planning
  "production_release",
  // stock credited back when planning is changed or cancelled
  "adjustment"
  // manual correction
]);

// src/db/tables/thread-stocks.table.ts
import { pgTable as pgTable23, serial as serial22, varchar as varchar21, numeric as numeric6, timestamp as timestamp23, unique as unique6, index as index19 } from "drizzle-orm/pg-core";
var threadStocks = pgTable23(
  "thread_stocks",
  {
    id: serial22("id").primaryKey(),
    stockType: threadStockTypeEnum("stock_type").notNull(),
    denier: threadDenierEnum("denier").notNull(),
    /** "White"/"Black" for primary; the dyed colour name (e.g. "Brown") for secondary. */
    colorName: varchar21("color_name", { length: 100 }).notNull(),
    /** Dye lot colour code, e.g. "22783". Null for undyed primary stock. */
    colorCode: varchar21("color_code", { length: 100 }),
    balanceKg: numeric6("balance_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    /** Running totals, for reporting — derived from the movement history. */
    receivedKg: numeric6("received_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    consumedKg: numeric6("consumed_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    createdAt: timestamp23("created_at").defaultNow().notNull(),
    updatedAt: timestamp23("updated_at").defaultNow().notNull()
  },
  (table) => ({
    // One ledger row per distinct thread. Postgres treats NULLs as distinct in a unique
    // index, so primary rows (colorCode null) are additionally guarded in the service.
    identity: unique6("thread_stocks_identity_idx").on(
      table.stockType,
      table.denier,
      table.colorName,
      table.colorCode
    ),
    typeIdx: index19("thread_stocks_type_idx").on(table.stockType),
    denierIdx: index19("thread_stocks_denier_idx").on(table.denier)
  })
);

// src/db/tables/woven-thread-plan-items.table.ts
var wovenThreadPlanItems = pgTable24(
  "woven_thread_plan_items",
  {
    id: serial23("id").primaryKey(),
    wovenProductionLineId: integer16("woven_production_line_id").notNull().references(() => wovenProductionLines.id, { onDelete: "cascade" }),
    /** 1-8 — the colour slot, unique within the line. */
    sortOrder: integer16("sort_order").notNull(),
    colorName: varchar22("color_name", { length: 100 }).notNull(),
    denier: threadDenierEnum("denier").notNull(),
    colorCode: varchar22("color_code", { length: 100 }).notNull(),
    weightKg: numeric7("weight_kg", { precision: 14, scale: 3 }).notNull(),
    /** The stock row this colour was drawn from — null until planning reserves it. */
    threadStockId: integer16("thread_stock_id").references(() => threadStocks.id, {
      onDelete: "set null"
    }),
    /** Unused thread weight returned after completion. */
    remainingWeightKg: numeric7("remaining_weight_kg", { precision: 14, scale: 3 }).default("0").notNull(),
    /** Net weight consumed = weightKg - remainingWeightKg. */
    actualConsumedWeightKg: numeric7("actual_consumed_weight_kg", { precision: 14, scale: 3 }),
    createdAt: timestamp24("created_at").defaultNow().notNull(),
    updatedAt: timestamp24("updated_at").defaultNow().notNull()
  },
  (table) => ({
    slot: unique7("woven_thread_plan_items_slot_idx").on(table.wovenProductionLineId, table.sortOrder),
    lineIdx: index20("woven_thread_plan_items_line_idx").on(table.wovenProductionLineId)
  })
);

// src/db/tables/thread-purchases.table.ts
import { pgTable as pgTable25, serial as serial24, varchar as varchar23, integer as integer17, numeric as numeric8, date as date8, timestamp as timestamp25, index as index21 } from "drizzle-orm/pg-core";
var threadPurchases = pgTable25(
  "thread_purchases",
  {
    id: serial24("id").primaryKey(),
    receivedDate: date8("received_date").notNull(),
    /** Always "Thread" today; kept explicit so other raw items can join this table later. */
    itemName: varchar23("item_name", { length: 100 }).default("Thread").notNull(),
    /** The item code IS the denier — 45 / 75 / 100 / 150. */
    denier: threadDenierEnum("denier").notNull(),
    threadColor: threadBaseColorEnum("thread_color").notNull(),
    vendor: varchar23("vendor", { length: 255 }).notNull(),
    invoiceNumber: varchar23("invoice_number", { length: 100 }).notNull(),
    /** Cartons received. */
    totalCtns: integer17("total_ctns").notNull(),
    /** Weight of a single carton, in kg. */
    weightPerCtnKg: numeric8("weight_per_ctn_kg", { precision: 12, scale: 3 }).notNull(),
    /** Server-calculated: weightPerCtnKg * totalCtns. */
    totalWeightKg: numeric8("total_weight_kg", { precision: 14, scale: 3 }).notNull(),
    notes: varchar23("notes", { length: 500 }),
    createdAt: timestamp25("created_at").defaultNow().notNull(),
    updatedAt: timestamp25("updated_at").defaultNow().notNull()
  },
  (table) => ({
    vendorIdx: index21("thread_purchases_vendor_idx").on(table.vendor),
    invoiceIdx: index21("thread_purchases_invoice_idx").on(table.invoiceNumber),
    dateIdx: index21("thread_purchases_date_idx").on(table.receivedDate)
  })
);

// src/db/tables/thread-dye-batches.table.ts
import { pgTable as pgTable26, serial as serial25, integer as integer18, varchar as varchar24, numeric as numeric9, timestamp as timestamp26, index as index22 } from "drizzle-orm/pg-core";
var threadDyeBatches = pgTable26(
  "thread_dye_batches",
  {
    id: serial25("id").primaryKey(),
    batchNumber: varchar24("batch_number", { length: 100 }).notNull().unique(),
    /** The primary (undyed) stock row consumed. */
    fromStockId: integer18("from_stock_id").notNull().references(() => threadStocks.id, { onDelete: "restrict" }),
    /** The secondary (dyed) stock row credited. */
    toStockId: integer18("to_stock_id").notNull().references(() => threadStocks.id, { onDelete: "restrict" }),
    denier: threadDenierEnum("denier").notNull(),
    /** Resulting colour, denormalised onto the batch so history survives a stock rename. */
    colorName: varchar24("color_name", { length: 100 }).notNull(),
    colorCode: varchar24("color_code", { length: 100 }).notNull(),
    inputWeightKg: numeric9("input_weight_kg", { precision: 14, scale: 3 }).notNull(),
    outputWeightKg: numeric9("output_weight_kg", { precision: 14, scale: 3 }).notNull(),
    notes: varchar24("notes", { length: 500 }),
    actorUserId: integer18("actor_user_id").references(() => users.id),
    createdAt: timestamp26("created_at").defaultNow().notNull()
  },
  (table) => ({
    fromIdx: index22("thread_dye_batches_from_idx").on(table.fromStockId),
    toIdx: index22("thread_dye_batches_to_idx").on(table.toStockId)
  })
);

// src/db/tables/thread-stock-movements.table.ts
import { pgTable as pgTable27, serial as serial26, integer as integer19, varchar as varchar25, numeric as numeric10, timestamp as timestamp27, index as index23 } from "drizzle-orm/pg-core";
var threadStockMovements = pgTable27(
  "thread_stock_movements",
  {
    id: serial26("id").primaryKey(),
    threadStockId: integer19("thread_stock_id").notNull().references(() => threadStocks.id, { onDelete: "cascade" }),
    movementType: threadMovementTypeEnum("movement_type").notNull(),
    /** Signed: + credits the stock, - debits it. */
    weightKg: numeric10("weight_kg", { precision: 14, scale: 3 }).notNull(),
    /** Balance immediately after this movement — makes the history readable on its own. */
    balanceAfterKg: numeric10("balance_after_kg", { precision: 14, scale: 3 }).notNull(),
    referenceType: varchar25("reference_type", { length: 50 }),
    referenceId: integer19("reference_id"),
    note: varchar25("note", { length: 500 }),
    actorUserId: integer19("actor_user_id").references(() => users.id),
    createdAt: timestamp27("created_at").defaultNow().notNull()
  },
  (table) => ({
    stockIdx: index23("thread_stock_movements_stock_idx").on(table.threadStockId),
    typeIdx: index23("thread_stock_movements_type_idx").on(table.movementType),
    createdIdx: index23("thread_stock_movements_created_idx").on(table.createdAt)
  })
);

// src/db/tables/thread-service-providers.table.ts
import { pgTable as pgTable28, serial as serial27, varchar as varchar26, text as text10, timestamp as timestamp28, index as index24 } from "drizzle-orm/pg-core";
var threadServiceProviders = pgTable28(
  "thread_service_providers",
  {
    id: serial27("id").primaryKey(),
    name: varchar26("name", { length: 255 }).notNull(),
    contact: varchar26("contact", { length: 100 }),
    address: text10("address"),
    notes: text10("notes"),
    createdAt: timestamp28("created_at").defaultNow().notNull(),
    updatedAt: timestamp28("updated_at").defaultNow().notNull()
  },
  (table) => ({
    nameIdx: index24("thread_service_providers_name_idx").on(table.name)
  })
);

// src/db/tables/thread-dyeing-workflow.table.ts
import { pgTable as pgTable29, serial as serial28, integer as integer20, varchar as varchar27, numeric as numeric11, date as date9, timestamp as timestamp29, pgEnum as pgEnum11, index as index25 } from "drizzle-orm/pg-core";
var threadDyeingSendStatusEnum = pgEnum11("thread_dyeing_send_status", [
  "sent",
  "partially_received",
  "received"
]);
var threadDyeingSends = pgTable29(
  "thread_dyeing_sends",
  {
    id: serial28("id").primaryKey(),
    serviceProviderId: integer20("service_provider_id").notNull().references(() => threadServiceProviders.id),
    sendingDate: date9("sending_date").notNull(),
    senderTrackingNumber: varchar27("sender_tracking_number", { length: 100 }),
    denier: threadDenierEnum("denier").notNull(),
    baseThreadColor: threadBaseColorEnum("base_thread_color").notNull(),
    totalWeightSent: numeric11("total_weight_sent", { precision: 14, scale: 3 }).notNull(),
    status: threadDyeingSendStatusEnum("status").default("sent").notNull(),
    createdAt: timestamp29("created_at").defaultNow().notNull(),
    updatedAt: timestamp29("updated_at").defaultNow().notNull()
  },
  (table) => ({
    providerIdx: index25("thread_dyeing_sends_provider_idx").on(table.serviceProviderId),
    dateIdx: index25("thread_dyeing_sends_date_idx").on(table.sendingDate)
  })
);
var threadDyeingAllocations = pgTable29(
  "thread_dyeing_allocations",
  {
    id: serial28("id").primaryKey(),
    threadDyeingSendId: integer20("thread_dyeing_send_id").notNull().references(() => threadDyeingSends.id, { onDelete: "cascade" }),
    colorName: varchar27("color_name", { length: 100 }).notNull(),
    pantone: varchar27("pantone", { length: 50 }),
    colorCode: varchar27("color_code", { length: 50 }),
    /** Weight sent for this colour (the "before" weight). */
    allocatedWeight: numeric11("allocated_weight", { precision: 14, scale: 3 }).notNull(),
    /** Actual dyed weight received back (the "after" weight). Set at receive time; this is
     *  what gets credited to dyed stock. Null until received. */
    receivedWeight: numeric11("received_weight", { precision: 14, scale: 3 }),
    createdAt: timestamp29("created_at").defaultNow().notNull()
  },
  (table) => ({
    sendIdx: index25("thread_dyeing_allocations_send_idx").on(table.threadDyeingSendId)
  })
);
var threadDyeingReceives = pgTable29(
  "thread_dyeing_receives",
  {
    id: serial28("id").primaryKey(),
    threadDyeingSendId: integer20("thread_dyeing_send_id").notNull().references(() => threadDyeingSends.id, { onDelete: "cascade" }),
    receivingDate: date9("receiving_date").notNull(),
    receiverTrackingNumber: varchar27("receiver_tracking_number", { length: 100 }),
    invoiceNumber: varchar27("invoice_number", { length: 100 }),
    createdAt: timestamp29("created_at").defaultNow().notNull(),
    updatedAt: timestamp29("updated_at").defaultNow().notNull()
  },
  (table) => ({
    sendIdx: index25("thread_dyeing_receives_send_idx").on(table.threadDyeingSendId)
  })
);

// src/db/relations/index.ts
import { relations } from "drizzle-orm";
var companiesRelations = relations(companies, ({ many }) => ({
  brands: many(brands)
}));
var brandsRelations = relations(brands, ({ one, many }) => ({
  company: one(companies, {
    fields: [brands.companyId],
    references: [companies.id]
  }),
  workOrders: many(workOrders)
}));
var workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  brand: one(brands, {
    fields: [workOrders.brandId],
    references: [brands.id]
  }),
  productionOrders: many(productionOrders),
  /** Present only when `productType` is `woven`. */
  wovenDetail: one(wovenWorkOrderDetails, {
    fields: [workOrders.id],
    references: [wovenWorkOrderDetails.workOrderId]
  })
}));
var usersRelations = relations(users, ({ many }) => ({
  operators: many(operators),
  createdProductionOrders: many(productionOrders),
  stageEvents: many(productionStageEvents),
  rollIssuances: many(productionRollIssuances)
}));
var productionOrdersRelations = relations(productionOrders, ({ one, many }) => ({
  workOrder: one(workOrders, {
    fields: [productionOrders.workOrderId],
    references: [workOrders.id]
  }),
  createdBy: one(users, {
    fields: [productionOrders.createdByUserId],
    references: [users.id]
  }),
  /** Printed-labels lines. Woven orders use `wovenLines` instead — never both. */
  lines: many(productionOrderLines),
  wovenLines: many(wovenProductionLines)
}));
var productionOrderLinesRelations = relations(productionOrderLines, ({ one, many }) => ({
  productionOrder: one(productionOrders, {
    fields: [productionOrderLines.productionOrderId],
    references: [productionOrders.id]
  }),
  material: one(materials, {
    fields: [productionOrderLines.materialCode],
    references: [materials.code]
  }),
  printingMachine: one(machines, {
    fields: [productionOrderLines.printingMachineId],
    references: [machines.id],
    relationName: "linePrintingMachine"
  }),
  printingOperator: one(operators, {
    fields: [productionOrderLines.printingOperatorId],
    references: [operators.id],
    relationName: "linePrintingOperator"
  }),
  cuttingMachine: one(machines, {
    fields: [productionOrderLines.cuttingMachineId],
    references: [machines.id],
    relationName: "lineCuttingMachine"
  }),
  cuttingOperator: one(operators, {
    fields: [productionOrderLines.cuttingOperatorId],
    references: [operators.id],
    relationName: "lineCuttingOperator"
  }),
  packagingOperator: one(operators, {
    fields: [productionOrderLines.packagingOperatorId],
    references: [operators.id],
    relationName: "linePackagingOperator"
  }),
  stageEvents: many(productionStageEvents),
  rollIssuances: many(productionRollIssuances)
}));
var productionStageEventsRelations = relations(productionStageEvents, ({ one }) => ({
  line: one(productionOrderLines, {
    fields: [productionStageEvents.productionOrderLineId],
    references: [productionOrderLines.id]
  }),
  actor: one(users, {
    fields: [productionStageEvents.actorUserId],
    references: [users.id]
  })
}));
var productionRollIssuancesRelations = relations(productionRollIssuances, ({ one }) => ({
  line: one(productionOrderLines, {
    fields: [productionRollIssuances.productionOrderLineId],
    references: [productionOrderLines.id]
  }),
  material: one(materials, {
    fields: [productionRollIssuances.materialCode],
    references: [materials.code]
  }),
  actor: one(users, {
    fields: [productionRollIssuances.actorUserId],
    references: [users.id]
  })
}));
var materialsRelations = relations(materials, ({ many }) => ({
  purchaseRecords: many(purchaseRecords),
  inventoryRolls: many(inventoryRolls),
  productionOrderLines: many(productionOrderLines),
  rollIssuances: many(productionRollIssuances)
}));
var purchaseRecordsRelations = relations(purchaseRecords, ({ one }) => ({
  material: one(materials, {
    fields: [purchaseRecords.materialCode],
    references: [materials.code]
  })
}));
var inventoryRollsRelations = relations(inventoryRolls, ({ one }) => ({
  material: one(materials, {
    fields: [inventoryRolls.materialCode],
    references: [materials.code]
  })
}));
var machinesRelations = relations(machines, ({ one, many }) => ({
  operator: one(operators, {
    fields: [machines.machineOperatorId],
    references: [operators.id]
  }),
  cuttingLines: many(productionOrderLines, {
    relationName: "lineCuttingMachine"
  }),
  printingLines: many(productionOrderLines, {
    relationName: "linePrintingMachine"
  }),
  wovenWeavingLines: many(wovenProductionLines, { relationName: "wovenWeavingMachine" })
}));
var wovenWorkOrderDetailsRelations = relations(wovenWorkOrderDetails, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [wovenWorkOrderDetails.workOrderId],
    references: [workOrders.id]
  })
}));
var wovenProductionLinesRelations = relations(wovenProductionLines, ({ one, many }) => ({
  productionOrder: one(productionOrders, {
    fields: [wovenProductionLines.productionOrderId],
    references: [productionOrders.id]
  }),
  weavingMachine: one(machines, {
    fields: [wovenProductionLines.weavingMachineId],
    references: [machines.id],
    relationName: "wovenWeavingMachine"
  }),
  weavingOperator: one(operators, {
    fields: [wovenProductionLines.weavingOperatorId],
    references: [operators.id],
    relationName: "wovenWeavingOperator"
  }),
  cuttingOperator: one(operators, {
    fields: [wovenProductionLines.cuttingOperatorId],
    references: [operators.id],
    relationName: "wovenCuttingOperator"
  }),
  packagingOperator: one(operators, {
    fields: [wovenProductionLines.packagingOperatorId],
    references: [operators.id],
    relationName: "wovenPackagingOperator"
  }),
  threadPlan: many(wovenThreadPlanItems)
}));
var wovenThreadPlanItemsRelations = relations(wovenThreadPlanItems, ({ one }) => ({
  line: one(wovenProductionLines, {
    fields: [wovenThreadPlanItems.wovenProductionLineId],
    references: [wovenProductionLines.id]
  }),
  threadStock: one(threadStocks, {
    fields: [wovenThreadPlanItems.threadStockId],
    references: [threadStocks.id]
  })
}));
var threadStocksRelations = relations(threadStocks, ({ many }) => ({
  movements: many(threadStockMovements),
  planItems: many(wovenThreadPlanItems),
  dyedFrom: many(threadDyeBatches, { relationName: "dyeBatchFromStock" }),
  dyedInto: many(threadDyeBatches, { relationName: "dyeBatchToStock" })
}));
var threadStockMovementsRelations = relations(threadStockMovements, ({ one }) => ({
  stock: one(threadStocks, {
    fields: [threadStockMovements.threadStockId],
    references: [threadStocks.id]
  }),
  actor: one(users, {
    fields: [threadStockMovements.actorUserId],
    references: [users.id]
  })
}));
var threadDyeBatchesRelations = relations(threadDyeBatches, ({ one }) => ({
  fromStock: one(threadStocks, {
    fields: [threadDyeBatches.fromStockId],
    references: [threadStocks.id],
    relationName: "dyeBatchFromStock"
  }),
  toStock: one(threadStocks, {
    fields: [threadDyeBatches.toStockId],
    references: [threadStocks.id],
    relationName: "dyeBatchToStock"
  }),
  actor: one(users, {
    fields: [threadDyeBatches.actorUserId],
    references: [users.id]
  })
}));
var productionRunsRelations = relations(productionRuns, ({ one }) => ({
  saleOrder: one(workOrders, {
    fields: [productionRuns.saleOrderId],
    references: [workOrders.id]
  }),
  machine: one(machines, {
    fields: [productionRuns.machineId],
    references: [machines.id]
  }),
  operator: one(operators, {
    fields: [productionRuns.operatorId],
    references: [operators.id]
  }),
  createdBy: one(users, {
    fields: [productionRuns.createdBy],
    references: [users.id]
  })
}));
var threadServiceProvidersRelations = relations(threadServiceProviders, ({ many }) => ({
  sends: many(threadDyeingSends)
}));
var threadDyeingSendsRelations = relations(threadDyeingSends, ({ one, many }) => ({
  serviceProvider: one(threadServiceProviders, {
    fields: [threadDyeingSends.serviceProviderId],
    references: [threadServiceProviders.id]
  }),
  allocations: many(threadDyeingAllocations),
  receives: many(threadDyeingReceives)
}));
var threadDyeingAllocationsRelations = relations(threadDyeingAllocations, ({ one }) => ({
  send: one(threadDyeingSends, {
    fields: [threadDyeingAllocations.threadDyeingSendId],
    references: [threadDyeingSends.id]
  })
}));
var threadDyeingReceivesRelations = relations(threadDyeingReceives, ({ one }) => ({
  send: one(threadDyeingSends, {
    fields: [threadDyeingReceives.threadDyeingSendId],
    references: [threadDyeingSends.id]
  })
}));
var operatorsRelations = relations(operators, ({ one, many }) => ({
  machines: many(machines),
  user: one(users, {
    fields: [operators.userId],
    references: [users.id]
  }),
  productionRuns: many(productionRuns),
  wovenWeavingLines: many(wovenProductionLines, { relationName: "wovenWeavingOperator" }),
  wovenCuttingLines: many(wovenProductionLines, { relationName: "wovenCuttingOperator" }),
  wovenPackagingLines: many(wovenProductionLines, { relationName: "wovenPackagingOperator" }),
  cuttingLines: many(productionOrderLines, {
    relationName: "lineCuttingOperator"
  }),
  printingLines: many(productionOrderLines, {
    relationName: "linePrintingOperator"
  }),
  packagingLines: many(productionOrderLines, {
    relationName: "linePackagingOperator"
  })
}));

// src/config/database.ts
var databaseConfig = {
  url: env.DATABASE_URL,
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? "10", 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT ?? "30000", 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? "5000", 10)
};

// src/db/drizzle.ts
var dbInstance = null;
var clientInstance = null;
function getPgPool() {
  if (!clientInstance) {
    logger.info("Creating new PostgreSQL connection pool");
    clientInstance = postgres(env.DATABASE_URL, {
      prepare: false,
      max: databaseConfig.maxConnections,
      idle_timeout: databaseConfig.idleTimeoutMillis,
      connect_timeout: databaseConfig.connectionTimeoutMillis
    });
  }
  return clientInstance;
}
function getDb() {
  if (!dbInstance) {
    logger.info("Initializing Drizzle database instance");
    dbInstance = drizzle(getPgPool(), { schema: schema_exports });
  }
  return dbInstance;
}

// src/db/index.ts
var db = getDb();

// src/api/repositories/company.repository.ts
import { eq, asc } from "drizzle-orm";
var CompanyRepository = class {
  async findAll(filters) {
    return db.select().from(companies).where(filters?.includeInactive ? void 0 : eq(companies.isActive, true)).orderBy(asc(companies.createdAt));
  }
  async findById(id) {
    const [company] = await db.select().from(companies).where(eq(companies.id, Number(id)));
    return company;
  }
  async findByCompanyName(name) {
    const [company] = await db.select().from(companies).where(eq(companies.name, name));
    return company;
  }
  async create(data) {
    const [company] = await db.insert(companies).values(data).returning();
    return company;
  }
  async update(id, data) {
    const [company] = await db.update(companies).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(companies.id, Number(id))).returning();
    return company;
  }
  async softDelete(id) {
    const [company] = await db.update(companies).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(companies.id, Number(id))).returning();
    return company;
  }
};
var BrandRepository = class {
  async findAll() {
    return db.select({
      id: brands.id,
      companyId: brands.companyId,
      name: brands.name,
      createdAt: brands.createdAt,
      updatedAt: brands.updatedAt,
      companyName: companies.name
    }).from(brands).innerJoin(companies, eq(brands.companyId, companies.id)).orderBy(asc(companies.name), asc(brands.name));
  }
  async findById(id) {
    const [brand] = await db.select().from(brands).where(eq(brands.id, Number(id)));
    return brand;
  }
  async findByName(name) {
    const [brand] = await db.select().from(brands).where(eq(brands.name, name));
    return brand;
  }
  async findByCompanyId(companyId) {
    return db.select().from(brands).where(eq(brands.companyId, Number(companyId))).orderBy(asc(brands.name));
  }
  async create(data) {
    const [brand] = await db.insert(brands).values(data).returning();
    return brand;
  }
  async update(id, data) {
    const [brand] = await db.update(brands).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(brands.id, Number(id))).returning();
    return brand;
  }
  async delete(id) {
    await db.delete(brands).where(eq(brands.id, Number(id)));
  }
};
var companyRepository = new CompanyRepository();
var brandRepository = new BrandRepository();

// src/api/constants/messages.ts
var Messages = {
  alreadyExists: (entity) => `${entity} already exists`,
  notFound: (entity) => `${entity} not found`,
  created: (entity) => `${entity} created successfully`,
  updated: (entity) => `${entity} updated successfully`,
  deleted: (entity) => `${entity} deleted successfully`
};
var Entity = {
  COMPANY: "Company",
  BRAND: "Brand",
  MATERIAL: "Material",
  MACHINE: "Machine",
  OPERATOR: "Operator",
  WORK_ORDER: "Work order",
  PURCHASE_RECORD: "Purchase record",
  MATERIAL_ISSUE: "Material issue",
  USER: "User",
  PRODUCTION_ORDER: "Production order",
  PRODUCTION_ORDER_LINE: "Production order line",
  PRODUCTION_RUN: "Production run",
  STICKER_MATERIAL: "Sticker material",
  LOCAL_SHEET: "Local sheet",
  LABEL_SHEET: "Label sheet",
  THREAD_SERVICE_PROVIDER: "Thread service provider",
  THREAD_DYEING_SEND: "Thread dyeing send",
  INK_PURCHASE: "Ink purchase",
  INK_CONSUMPTION: "Ink consumption"
};

// src/api/services/company.service.ts
var CompanyService = class {
  async getCompanies(filters) {
    return companyRepository.findAll(filters);
  }
  async getCompanyById(id) {
    const company = await companyRepository.findById(id);
    if (!company) throw new NotFoundError(Messages.notFound(Entity.COMPANY));
    return company;
  }
  async getCompanyByName(name) {
    return companyRepository.findByCompanyName(name);
  }
  async createCompany(data) {
    const existing = await companyRepository.findByCompanyName(data.name);
    if (existing) throw new ConflictError(Messages.alreadyExists(Entity.COMPANY));
    return companyRepository.create(data);
  }
  async updateCompany(id, data) {
    const company = await companyRepository.findById(id);
    if (!company) throw new NotFoundError(Messages.notFound(Entity.COMPANY));
    const updated = await companyRepository.update(id, data);
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.COMPANY));
    return updated;
  }
  async deleteCompany(id) {
    const company = await companyRepository.findById(id);
    if (!company) throw new NotFoundError(Messages.notFound(Entity.COMPANY));
    await companyRepository.softDelete(id);
  }
};
var BrandService = class {
  async getBrands() {
    return brandRepository.findAll();
  }
  async getBrand(id) {
    const brand = await brandRepository.findById(id);
    if (!brand) throw new NotFoundError(Messages.notFound(Entity.BRAND));
    return brand;
  }
  async getBrandsByCompany(companyId) {
    return brandRepository.findByCompanyId(companyId);
  }
  async createBrand(data) {
    const existing = await brandRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError(Messages.alreadyExists(Entity.BRAND));
    }
    return brandRepository.create(data);
  }
  async updateBrand(id, data) {
    const brand = await brandRepository.findById(id);
    if (!brand) throw new NotFoundError(Messages.notFound(Entity.BRAND));
    const updated = await brandRepository.update(id, data);
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.BRAND));
    return updated;
  }
  async deleteBrand(id) {
    const brand = await brandRepository.findById(id);
    if (!brand) throw new NotFoundError(Messages.notFound(Entity.BRAND));
    await brandRepository.delete(id);
  }
};
var companyService = new CompanyService();
var brandService = new BrandService();

// src/api/controllers/company.controller.ts
var CompanyController = class {
  getCompanies = asyncHandler(async (req, res) => {
    const { includeInactive } = req.validatedQuery ?? req.query;
    const data = await companyService.getCompanies({ includeInactive });
    res.json({ data });
  });
  getCompany = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await companyService.getCompanyById(id);
    res.json({ data });
  });
  createCompany = asyncHandler(async (req, res) => {
    const body = req.validatedBody;
    const data = await companyService.createCompany(body);
    res.status(201).json({ data });
  });
  updateCompany = asyncHandler(async (req, res, next) => {
    const { id } = req.validatedParams ?? req.params;
    const body = req.validatedBody;
    const data = await companyService.updateCompany(id, body);
    res.json({ data });
  });
  deleteCompany = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await companyService.deleteCompany(id);
    res.status(204).send();
  });
};
var companyController = new CompanyController();

// src/api/validations/companies.validation.ts
import { z as z3 } from "zod";
var createCompanySchema = z3.object({
  body: z3.object({
    name: z3.string().min(1, "Name is required"),
    email: z3.string().email("Invalid email"),
    location: z3.string().min(1, "Location is required"),
    contactPerson: z3.string().optional(),
    phone: z3.string().optional()
  })
});
var updateCompanySchema = z3.object({
  body: z3.object({
    name: z3.string().min(1, "Name is required").optional(),
    email: z3.string().email("Invalid email").optional(),
    location: z3.string().min(1, "Location is required").optional(),
    contactPerson: z3.string().optional(),
    phone: z3.string().optional(),
    isActive: z3.coerce.boolean().optional()
  })
});

// src/api/validations/query.validation.ts
import { z as z4 } from "zod";
var listMaterialsQuerySchema = z4.object({
  type: z4.string().optional(),
  includeInactive: z4.coerce.boolean().optional()
});
var listMachinesQuerySchema = z4.object({
  type: z4.string().optional(),
  includeInactive: z4.coerce.boolean().optional()
});
var listOperatorsQuerySchema = z4.object({
  designation: z4.string().optional(),
  /** Capability filter used by production: matches the line plus `both`. */
  productType: z4.enum(["printed", "woven"]).optional(),
  /** Exact match, for the operator master-data list's own filter. */
  operatorType: z4.enum(["printed", "woven", "both"]).optional(),
  search: z4.string().optional(),
  includeInactive: z4.coerce.boolean().optional()
});
var listCompaniesQuerySchema = z4.object({
  includeInactive: z4.coerce.boolean().optional()
});
var listWorkOrdersQuerySchema = z4.object({
  soNumber: z4.string().optional(),
  poNumber: z4.string().optional(),
  status: z4.enum(["initiate_production", "production", "complete"]).optional(),
  /** Filters the shared list down to one workflow. Omitted = both. */
  productType: z4.enum(["printed", "woven"]).optional(),
  /** Dispatch paperwork is searchable. */
  dcNumber: z4.string().optional(),
  lcNumber: z4.string().optional(),
  /** Woven-only search. */
  designCode: z4.string().optional(),
  startDate: z4.string().optional(),
  endDate: z4.string().optional()
});
var listProductionOrdersQuerySchema = z4.object({
  status: z4.string().optional(),
  soNumber: z4.string().optional(),
  poNumber: z4.string().optional()
});
var listUsersQuerySchema = z4.object({
  role: z4.enum(["office_staff", "production_manager", "production_operator"]).optional(),
  includeInactive: z4.coerce.boolean().optional()
});
var listPurchasesQuerySchema = z4.object({
  startDate: z4.string().optional(),
  endDate: z4.string().optional(),
  vendor: z4.string().optional(),
  materialCode: z4.string().optional()
});
var listStockQuerySchema = z4.object({
  materialCode: z4.string().optional(),
  type: z4.string().optional()
});

// src/api/validations/common.validation.ts
import { z as z5 } from "zod";
var idParamsSchema = z5.object({
  id: z5.coerce.number().int().positive("A valid numeric id is required")
});
var lineIdParamsSchema = z5.object({
  lineId: z5.coerce.number().int().positive("A valid numeric line id is required")
});
var companyIdParamsSchema = z5.object({
  companyId: z5.coerce.number().int().positive("A valid numeric company id is required")
});
var paginationQuerySchema = z5.object({
  limit: z5.coerce.number().int().positive().max(500).optional(),
  offset: z5.coerce.number().int().min(0).optional()
});

// src/api/routes/companies.routes.ts
var router3 = Router3();
router3.get("/", validateQuery(listCompaniesQuerySchema), companyController.getCompanies);
router3.get("/:id", validateParams(idParamsSchema), companyController.getCompany);
router3.post("/", validateRequest(createCompanySchema), companyController.createCompany);
router3.put("/:id", validateParams(idParamsSchema), validateRequest(updateCompanySchema), companyController.updateCompany);
router3.delete("/:id", validateParams(idParamsSchema), companyController.deleteCompany);
var companies_routes_default = router3;

// src/api/routes/brands.routes.ts
import { Router as Router4 } from "express";

// src/api/controllers/brand.controller.ts
var BrandController = class {
  getBrands = asyncHandler(async (req, res) => {
    const data = await brandService.getBrands();
    res.json({ data });
  });
  getBrand = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await brandService.getBrand(id);
    res.json({ data });
  });
  getBrandsByCompany = asyncHandler(async (req, res) => {
    const { companyId } = req.validatedParams ?? req.params;
    const data = await brandService.getBrandsByCompany(companyId);
    res.json({ data });
  });
  createBrand = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await brandService.createBrand(input);
    res.status(201).json({ data });
  });
  updateBrand = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.validatedParams ?? req.params;
      const input = req.validatedBody ?? req.body;
      const data = await brandService.updateBrand(id, input);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });
  deleteBrand = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await brandService.deleteBrand(id);
    res.status(204).send();
  });
};
var brandController = new BrandController();

// src/api/validations/brands.validation.ts
import { z as z6 } from "zod";
var createBrandSchema = z6.object({
  body: z6.object({
    companyId: z6.coerce.number().int().positive("Company is required"),
    name: z6.string().min(1, "Name is required")
  })
});
var updateBrandSchema = z6.object({
  body: z6.object({
    companyId: z6.coerce.number().int().positive().optional(),
    name: z6.string().min(1, "Name is required").optional()
  })
});

// src/api/routes/brands.routes.ts
var router4 = Router4();
router4.get("/", brandController.getBrands);
router4.get("/:id", validateParams(idParamsSchema), brandController.getBrand);
router4.get("/company/:companyId", validateParams(companyIdParamsSchema), brandController.getBrandsByCompany);
router4.post("/", validateRequest(createBrandSchema), brandController.createBrand);
router4.put("/:id", validateParams(idParamsSchema), validateRequest(updateBrandSchema), brandController.updateBrand);
router4.delete("/:id", validateParams(idParamsSchema), brandController.deleteBrand);
var brands_routes_default = router4;

// src/api/routes/materials.routes.ts
import { Router as Router5 } from "express";

// src/api/repositories/material.repository.ts
import { eq as eq2, asc as asc2, and } from "drizzle-orm";
var MaterialRepository = class {
  async findAll(filters) {
    const conditions = [];
    if (filters?.type) conditions.push(eq2(materials.type, filters.type));
    if (!filters?.includeInactive) conditions.push(eq2(materials.isActive, true));
    return db.select().from(materials).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(asc2(materials.code));
  }
  async findByCode(code) {
    const [material] = await db.select().from(materials).where(eq2(materials.code, code));
    return material;
  }
  async findById(id) {
    const [material] = await db.select().from(materials).where(eq2(materials.id, Number(id)));
    return material;
  }
  async create(data) {
    const [material] = await db.insert(materials).values(data).returning();
    return material;
  }
  async update(id, data) {
    const [material] = await db.update(materials).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(materials.id, Number(id))).returning();
    return material;
  }
  async softDelete(id) {
    const [material] = await db.update(materials).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(materials.id, Number(id))).returning();
    return material;
  }
};
var materialRepository = new MaterialRepository();

// src/api/services/material.service.ts
var MaterialService = class {
  async getMaterials(filters) {
    return materialRepository.findAll(filters);
  }
  async getMaterialByCode(code) {
    const material = await materialRepository.findByCode(code);
    if (!material) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    return material;
  }
  async getMaterialById(id) {
    const material = await materialRepository.findById(id);
    if (!material) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    return material;
  }
  async createMaterial(data) {
    const existing = await materialRepository.findByCode(data.code);
    if (existing) throw new ConflictError(Messages.alreadyExists(Entity.MATERIAL));
    return materialRepository.create({
      code: data.code,
      type: data.type,
      description: data.description,
      weightPerRoll: String(data.weightPerRoll),
      minStockLevel: data.minStockLevel,
      reorderQty: data.reorderQty
    });
  }
  async updateMaterial(id, data) {
    const material = await materialRepository.findById(id);
    if (!material) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    const updated = await materialRepository.update(id, {
      ...data,
      weightPerRoll: data.weightPerRoll !== void 0 ? String(data.weightPerRoll) : void 0
    });
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    return updated;
  }
  async deleteMaterial(id) {
    const material = await materialRepository.findById(id);
    if (!material) throw new NotFoundError(Messages.notFound(Entity.MATERIAL));
    await materialRepository.softDelete(id);
  }
};
var materialService = new MaterialService();

// src/api/controllers/material.controller.ts
var MaterialController = class {
  getMaterials = asyncHandler(async (req, res) => {
    const { type, includeInactive } = req.validatedQuery ?? req.query;
    const data = await materialService.getMaterials({ type, includeInactive });
    res.json({ data });
  });
  getMaterial = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await materialService.getMaterialById(id);
    res.json({ data });
  });
  createMaterial = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await materialService.createMaterial(input);
    res.status(201).json({ data });
  });
  updateMaterial = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.validatedParams ?? req.params;
      const body = req.validatedBody ?? req.body;
      const { code, ...data } = body;
      const updated = await materialService.updateMaterial(id, data);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  });
  deleteMaterial = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await materialService.deleteMaterial(id);
    res.status(204).send();
  });
};
var materialController = new MaterialController();

// src/api/validations/materials.validation.ts
import { z as z7 } from "zod";
var createMaterialSchema = z7.object({
  body: z7.object({
    code: z7.string().min(1, "Code is required"),
    type: z7.string().min(1, "Type is required"),
    description: z7.string().optional(),
    weightPerRoll: z7.coerce.number().positive("Weight per roll must be positive"),
    minStockLevel: z7.coerce.number().int().min(0).optional(),
    reorderQty: z7.coerce.number().int().min(0).optional()
  })
});
var updateMaterialSchema = z7.object({
  body: z7.object({
    code: z7.string().optional(),
    type: z7.string().min(1, "Type is required").optional(),
    description: z7.string().optional(),
    weightPerRoll: z7.coerce.number().positive("Weight per roll must be positive").optional(),
    minStockLevel: z7.coerce.number().int().min(0).optional(),
    reorderQty: z7.coerce.number().int().min(0).optional(),
    isActive: z7.coerce.boolean().optional()
  })
});

// src/api/routes/materials.routes.ts
var router5 = Router5();
router5.get("/", validateQuery(listMaterialsQuerySchema), materialController.getMaterials);
router5.get("/:id", validateParams(idParamsSchema), materialController.getMaterial);
router5.post("/", validateRequest(createMaterialSchema), materialController.createMaterial);
router5.put("/:id", validateParams(idParamsSchema), validateRequest(updateMaterialSchema), materialController.updateMaterial);
router5.delete("/:id", validateParams(idParamsSchema), materialController.deleteMaterial);
var materials_routes_default = router5;

// src/api/routes/material-receipts.routes.ts
import { Router as Router6 } from "express";

// src/api/repositories/material-receipts.repository.ts
import { desc, eq as eq3 } from "drizzle-orm";
var StickerMaterialRepository = class {
  findAll() {
    return db.select().from(stickerMaterials).orderBy(desc(stickerMaterials.invoiceDate), desc(stickerMaterials.id));
  }
  async findById(id) {
    const [row] = await db.select().from(stickerMaterials).where(eq3(stickerMaterials.id, id));
    return row;
  }
  async create(data) {
    const [row] = await db.insert(stickerMaterials).values(data).returning();
    return row;
  }
  async update(id, data) {
    const [row] = await db.update(stickerMaterials).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(stickerMaterials.id, id)).returning();
    return row;
  }
  async remove(id) {
    const [row] = await db.delete(stickerMaterials).where(eq3(stickerMaterials.id, id)).returning();
    return row;
  }
};
var LocalSheetRepository = class {
  findAll() {
    return db.select().from(localSheets).orderBy(desc(localSheets.date), desc(localSheets.id));
  }
  async findById(id) {
    const [row] = await db.select().from(localSheets).where(eq3(localSheets.id, id));
    return row;
  }
  async create(data) {
    const [row] = await db.insert(localSheets).values(data).returning();
    return row;
  }
  async update(id, data) {
    const [row] = await db.update(localSheets).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(localSheets.id, id)).returning();
    return row;
  }
  async remove(id) {
    const [row] = await db.delete(localSheets).where(eq3(localSheets.id, id)).returning();
    return row;
  }
};
var LabelSheetRepository = class {
  findAll() {
    return db.select().from(labelSheets).orderBy(desc(labelSheets.date), desc(labelSheets.id));
  }
  async findById(id) {
    const [row] = await db.select().from(labelSheets).where(eq3(labelSheets.id, id));
    return row;
  }
  async create(data) {
    const [row] = await db.insert(labelSheets).values(data).returning();
    return row;
  }
  async update(id, data) {
    const [row] = await db.update(labelSheets).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(labelSheets.id, id)).returning();
    return row;
  }
  async remove(id) {
    const [row] = await db.delete(labelSheets).where(eq3(labelSheets.id, id)).returning();
    return row;
  }
};
var stickerMaterialRepository = new StickerMaterialRepository();
var localSheetRepository = new LocalSheetRepository();
var labelSheetRepository = new LabelSheetRepository();

// src/api/services/material-receipts.service.ts
var money = (n) => String(n);
var StickerMaterialService = class {
  getAll() {
    return stickerMaterialRepository.findAll();
  }
  async create(data) {
    const totalWeight = money(data.rollQuantity * data.weightPerRoll);
    return stickerMaterialRepository.create({
      invoiceDate: data.invoiceDate,
      stickerSize: data.stickerSize,
      materialCode: data.materialCode,
      rollQuantity: money(data.rollQuantity),
      weightPerRoll: money(data.weightPerRoll),
      totalWeight
    });
  }
  async update(id, data) {
    const existing = await stickerMaterialRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.STICKER_MATERIAL));
    const rollQuantity = data.rollQuantity ?? Number(existing.rollQuantity);
    const weightPerRoll = data.weightPerRoll ?? Number(existing.weightPerRoll);
    return stickerMaterialRepository.update(id, {
      ...data.invoiceDate !== void 0 && { invoiceDate: data.invoiceDate },
      ...data.stickerSize !== void 0 && { stickerSize: data.stickerSize },
      ...data.materialCode !== void 0 && { materialCode: data.materialCode },
      rollQuantity: money(rollQuantity),
      weightPerRoll: money(weightPerRoll),
      totalWeight: money(rollQuantity * weightPerRoll)
    });
  }
  async remove(id) {
    const existing = await stickerMaterialRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.STICKER_MATERIAL));
    await stickerMaterialRepository.remove(id);
  }
};
var LocalSheetService = class {
  getAll() {
    return localSheetRepository.findAll();
  }
  async create(data) {
    return localSheetRepository.create({
      date: data.date,
      materialCode: data.materialCode,
      packetQuantity: money(data.packetQuantity),
      packetWeight: money(data.packetWeight),
      totalWeight: money(data.packetQuantity * data.packetWeight)
    });
  }
  async update(id, data) {
    const existing = await localSheetRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.LOCAL_SHEET));
    const packetQuantity = data.packetQuantity ?? Number(existing.packetQuantity);
    const packetWeight = data.packetWeight ?? Number(existing.packetWeight);
    return localSheetRepository.update(id, {
      ...data.date !== void 0 && { date: data.date },
      ...data.materialCode !== void 0 && { materialCode: data.materialCode },
      packetQuantity: money(packetQuantity),
      packetWeight: money(packetWeight),
      totalWeight: money(packetQuantity * packetWeight)
    });
  }
  async remove(id) {
    const existing = await localSheetRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.LOCAL_SHEET));
    await localSheetRepository.remove(id);
  }
};
var LabelSheetService = class {
  getAll() {
    return labelSheetRepository.findAll();
  }
  async create(data) {
    return labelSheetRepository.create({
      date: data.date,
      materialCode: data.materialCode,
      sheetQuantity: money(data.sheetQuantity),
      weightPerSheet: money(data.weightPerSheet),
      totalWeight: money(data.sheetQuantity * data.weightPerSheet)
    });
  }
  async update(id, data) {
    const existing = await labelSheetRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.LABEL_SHEET));
    const sheetQuantity = data.sheetQuantity ?? Number(existing.sheetQuantity);
    const weightPerSheet = data.weightPerSheet ?? Number(existing.weightPerSheet);
    return labelSheetRepository.update(id, {
      ...data.date !== void 0 && { date: data.date },
      ...data.materialCode !== void 0 && { materialCode: data.materialCode },
      sheetQuantity: money(sheetQuantity),
      weightPerSheet: money(weightPerSheet),
      totalWeight: money(sheetQuantity * weightPerSheet)
    });
  }
  async remove(id) {
    const existing = await labelSheetRepository.findById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.LABEL_SHEET));
    await labelSheetRepository.remove(id);
  }
};
var stickerMaterialService = new StickerMaterialService();
var localSheetService = new LocalSheetService();
var labelSheetService = new LabelSheetService();

// src/api/controllers/material-receipts.controller.ts
var StickerMaterialController = class {
  getAll = asyncHandler(async (_req, res) => {
    res.json({ data: await stickerMaterialService.getAll() });
  });
  create = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    res.status(201).json({ data: await stickerMaterialService.create(input) });
  });
  update = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    res.json({ data: await stickerMaterialService.update(Number(id), input) });
  });
  remove = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await stickerMaterialService.remove(Number(id));
    res.status(204).send();
  });
};
var LocalSheetController = class {
  getAll = asyncHandler(async (_req, res) => {
    res.json({ data: await localSheetService.getAll() });
  });
  create = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    res.status(201).json({ data: await localSheetService.create(input) });
  });
  update = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    res.json({ data: await localSheetService.update(Number(id), input) });
  });
  remove = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await localSheetService.remove(Number(id));
    res.status(204).send();
  });
};
var LabelSheetController = class {
  getAll = asyncHandler(async (_req, res) => {
    res.json({ data: await labelSheetService.getAll() });
  });
  create = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    res.status(201).json({ data: await labelSheetService.create(input) });
  });
  update = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    res.json({ data: await labelSheetService.update(Number(id), input) });
  });
  remove = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await labelSheetService.remove(Number(id));
    res.status(204).send();
  });
};
var stickerMaterialController = new StickerMaterialController();
var localSheetController = new LocalSheetController();
var labelSheetController = new LabelSheetController();

// src/api/validations/material-receipts.validation.ts
import { z as z8 } from "zod";
var createStickerMaterialSchema = z8.object({
  body: z8.object({
    invoiceDate: z8.string().min(1, "Invoice date is required"),
    stickerSize: z8.string().trim().min(1, "Sticker size is required"),
    materialCode: z8.string().trim().min(1, "Material code is required"),
    rollQuantity: z8.coerce.number().positive("Roll quantity must be greater than 0"),
    weightPerRoll: z8.coerce.number().positive("Weight per roll must be greater than 0")
  })
});
var updateStickerMaterialSchema = z8.object({
  body: createStickerMaterialSchema.shape.body.partial()
});
var createLocalSheetSchema = z8.object({
  body: z8.object({
    date: z8.string().min(1, "Date is required"),
    materialCode: z8.string().trim().min(1, "Material code is required"),
    packetQuantity: z8.coerce.number().positive("Packet quantity must be greater than 0"),
    packetWeight: z8.coerce.number().positive("Packet weight must be greater than 0")
  })
});
var updateLocalSheetSchema = z8.object({
  body: createLocalSheetSchema.shape.body.partial()
});
var createLabelSheetSchema = z8.object({
  body: z8.object({
    date: z8.string().min(1, "Date is required"),
    materialCode: z8.string().trim().min(1, "Material code is required"),
    sheetQuantity: z8.coerce.number().positive("Sheet quantity must be greater than 0"),
    weightPerSheet: z8.coerce.number().positive("Weight per sheet must be greater than 0")
  })
});
var updateLabelSheetSchema = z8.object({
  body: createLabelSheetSchema.shape.body.partial()
});

// src/api/routes/material-receipts.routes.ts
var stickerMaterialsRouter = Router6();
stickerMaterialsRouter.get("/", stickerMaterialController.getAll);
stickerMaterialsRouter.post("/", validateRequest(createStickerMaterialSchema), stickerMaterialController.create);
stickerMaterialsRouter.put(
  "/:id",
  validateParams(idParamsSchema),
  validateRequest(updateStickerMaterialSchema),
  stickerMaterialController.update
);
stickerMaterialsRouter.delete("/:id", validateParams(idParamsSchema), stickerMaterialController.remove);
var localSheetsRouter = Router6();
localSheetsRouter.get("/", localSheetController.getAll);
localSheetsRouter.post("/", validateRequest(createLocalSheetSchema), localSheetController.create);
localSheetsRouter.put(
  "/:id",
  validateParams(idParamsSchema),
  validateRequest(updateLocalSheetSchema),
  localSheetController.update
);
localSheetsRouter.delete("/:id", validateParams(idParamsSchema), localSheetController.remove);
var labelSheetsRouter = Router6();
labelSheetsRouter.get("/", labelSheetController.getAll);
labelSheetsRouter.post("/", validateRequest(createLabelSheetSchema), labelSheetController.create);
labelSheetsRouter.put(
  "/:id",
  validateParams(idParamsSchema),
  validateRequest(updateLabelSheetSchema),
  labelSheetController.update
);
labelSheetsRouter.delete("/:id", validateParams(idParamsSchema), labelSheetController.remove);

// src/api/routes/machines.routes.ts
import { Router as Router7 } from "express";

// src/api/repositories/machine.repository.ts
import { eq as eq4, asc as asc3, and as and2, inArray } from "drizzle-orm";
var MachineRepository = class {
  async findAll(filters) {
    const conditions = [];
    if (filters?.type) conditions.push(eq4(machines.machineType, filters.type));
    if (filters?.productType) {
      conditions.push(inArray(machines.productType, [filters.productType, "both"]));
    }
    if (!filters?.includeInactive) conditions.push(eq4(machines.isActive, true));
    return db.select().from(machines).where(conditions.length > 0 ? and2(...conditions) : void 0).orderBy(asc3(machines.name));
  }
  async findById(id) {
    const [machine] = await db.select().from(machines).where(eq4(machines.id, Number(id)));
    return machine;
  }
  async create(data) {
    const [machine] = await db.insert(machines).values(data).returning();
    return machine;
  }
  async update(id, data) {
    const [machine] = await db.update(machines).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(machines.id, Number(id))).returning();
    return machine;
  }
  async softDelete(id) {
    const [machine] = await db.update(machines).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(machines.id, Number(id))).returning();
    return machine;
  }
};
var machineRepository = new MachineRepository();

// src/api/repositories/production-order.repository.ts
import { eq as eq5, desc as desc2, and as and3, sql, inArray as inArray2 } from "drizzle-orm";
var DEFAULT_HISTORY_LIMIT = 200;
function workOrderStatusFor(productionStatus) {
  return productionStatus === "complete" ? "complete" : "production";
}
async function syncWorkOrderStatusTx(tx, productionOrderId, productionStatus) {
  if (!productionStatus) return;
  const [order] = await tx.select({ workOrderId: productionOrders.workOrderId }).from(productionOrders).where(eq5(productionOrders.id, productionOrderId));
  if (!order) return;
  await tx.update(workOrders).set({ status: workOrderStatusFor(productionStatus), updatedAt: /* @__PURE__ */ new Date() }).where(and3(eq5(workOrders.id, order.workOrderId), sql`${workOrders.status} <> 'dispatched'`));
}
var productionOrderSelect = {
  id: productionOrders.id,
  productionNumber: productionOrders.productionNumber,
  workOrderId: productionOrders.workOrderId,
  totalQty: productionOrders.totalQty,
  status: productionOrders.status,
  notes: productionOrders.notes,
  createdByUserId: productionOrders.createdByUserId,
  plannedAt: productionOrders.plannedAt,
  completedAt: productionOrders.completedAt,
  createdAt: productionOrders.createdAt,
  updatedAt: productionOrders.updatedAt,
  soNumber: workOrders.soNumber,
  poNumber: workOrders.poNumber,
  orderDate: workOrders.orderDate,
  dueDate: workOrders.dueDate,
  salesOrderQty: workOrders.totalQty,
  priority: workOrders.priority,
  /** Which workflow this order runs — the dashboard branches on it. */
  productType: workOrders.productType,
  brandId: brands.id,
  brandName: brands.name,
  companyId: companies.id,
  companyName: companies.name
};
var ProductionOrderRepository = class {
  async findAll(filters) {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq5(productionOrders.status, filters.status));
    }
    if (filters?.soNumber) conditions.push(sql`${workOrders.soNumber} ILIKE ${"%" + filters.soNumber + "%"}`);
    if (filters?.poNumber) conditions.push(sql`${workOrders.poNumber} ILIKE ${"%" + filters.poNumber + "%"}`);
    if (filters?.workOrderId) conditions.push(eq5(productionOrders.workOrderId, filters.workOrderId));
    const orders = await db.select(productionOrderSelect).from(productionOrders).innerJoin(workOrders, eq5(productionOrders.workOrderId, workOrders.id)).leftJoin(brands, eq5(workOrders.brandId, brands.id)).leftJoin(companies, eq5(brands.companyId, companies.id)).where(conditions.length > 0 ? and3(...conditions) : void 0).orderBy(desc2(productionOrders.createdAt));
    if (orders.length === 0) return [];
    const orderIds = orders.map((o) => o.id);
    const lineData = await db.select({
      productionOrderId: productionOrderLines.productionOrderId,
      printingMachineId: productionOrderLines.printingMachineId,
      cuttingMachineId: productionOrderLines.cuttingMachineId,
      quantity: productionOrderLines.quantity
    }).from(productionOrderLines).where(inArray2(productionOrderLines.productionOrderId, orderIds));
    const allMachinesList = await db.select({ id: machines.id, name: machines.name }).from(machines);
    const machineById = new Map(allMachinesList.map((m) => [m.id, m.name]));
    const machineMap = /* @__PURE__ */ new Map();
    const plannedQtyMap = /* @__PURE__ */ new Map();
    for (const lm of lineData) {
      if (!machineMap.has(lm.productionOrderId)) {
        machineMap.set(lm.productionOrderId, /* @__PURE__ */ new Set());
      }
      const set = machineMap.get(lm.productionOrderId);
      if (lm.printingMachineId && machineById.has(lm.printingMachineId)) {
        set.add(machineById.get(lm.printingMachineId));
      }
      if (lm.cuttingMachineId && machineById.has(lm.cuttingMachineId)) {
        set.add(machineById.get(lm.cuttingMachineId));
      }
      const prevPlanned = plannedQtyMap.get(lm.productionOrderId) || 0;
      plannedQtyMap.set(lm.productionOrderId, prevPlanned + Number(lm.quantity || 0));
    }
    return orders.map((order) => {
      const set = machineMap.get(order.id);
      const machineName = set && set.size > 0 ? Array.from(set).join(", ") : null;
      const plannedQty = plannedQtyMap.get(order.id) || 0;
      const unplannedQty = Math.max(0, Number(order.totalQty || 0) - plannedQty);
      return { ...order, machineName, plannedQty, unplannedQty };
    });
  }
  async findById(id) {
    const [row] = await db.select(productionOrderSelect).from(productionOrders).innerJoin(workOrders, eq5(productionOrders.workOrderId, workOrders.id)).leftJoin(brands, eq5(workOrders.brandId, brands.id)).leftJoin(companies, eq5(brands.companyId, companies.id)).where(eq5(productionOrders.id, Number(id)));
    if (!row) return void 0;
    const rawLines = await db.select({
      printingMachineId: productionOrderLines.printingMachineId,
      cuttingMachineId: productionOrderLines.cuttingMachineId
    }).from(productionOrderLines).where(eq5(productionOrderLines.productionOrderId, Number(id)));
    const allMachinesList = await db.select({ id: machines.id, name: machines.name }).from(machines);
    const machineById = new Map(allMachinesList.map((m) => [m.id, m.name]));
    const set = /* @__PURE__ */ new Set();
    for (const l of rawLines) {
      if (l.printingMachineId && machineById.has(l.printingMachineId)) {
        set.add(machineById.get(l.printingMachineId));
      }
      if (l.cuttingMachineId && machineById.has(l.cuttingMachineId)) {
        set.add(machineById.get(l.cuttingMachineId));
      }
    }
    const machineName = set.size > 0 ? Array.from(set).join(", ") : null;
    return { ...row, machineName };
  }
  async findRawById(id) {
    const [row] = await db.select().from(productionOrders).where(eq5(productionOrders.id, Number(id)));
    return row;
  }
  async findByWorkOrderId(workOrderId) {
    const [row] = await db.select().from(productionOrders).where(eq5(productionOrders.workOrderId, Number(workOrderId)));
    return row;
  }
  async findLastProductionNumber() {
    const [row] = await db.select({ productionNumber: productionOrders.productionNumber }).from(productionOrders).orderBy(desc2(productionOrders.id)).limit(1);
    return row?.productionNumber;
  }
  async create(data) {
    const [row] = await db.insert(productionOrders).values(data).returning();
    return row;
  }
  /**
   * Creates a production order and flips its sales order to `production` in one
   * transaction, so the two can't be left disagreeing if the process dies between them.
   * A unique-violation (duplicate production number, or a concurrent order for the same
   * sales order) rolls the whole thing back and propagates to the caller.
   */
  async createWithWorkOrderStatusTx(data) {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(productionOrders).values(data).returning();
      await tx.update(workOrders).set({ status: "production", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(workOrders.id, data.workOrderId));
      return row;
    });
  }
  async update(id, data) {
    const [row] = await db.update(productionOrders).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(productionOrders.id, Number(id))).returning();
    return row;
  }
  async delete(id) {
    await db.delete(productionOrders).where(eq5(productionOrders.id, Number(id)));
  }
  /* ---------------- Lines ---------------- */
  async findLines(productionOrderId) {
    return db.select().from(productionOrderLines).where(eq5(productionOrderLines.productionOrderId, Number(productionOrderId))).orderBy(productionOrderLines.id);
  }
  async findLineById(lineId) {
    const [row] = await db.select().from(productionOrderLines).where(eq5(productionOrderLines.id, Number(lineId)));
    return row;
  }
  async updateLine(lineId, data) {
    const [row] = await db.update(productionOrderLines).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(productionOrderLines.id, Number(lineId))).returning();
    return row;
  }
  /**
   * Settles one line's inventory draw inside the caller's transaction.
   *
   * `SELECT ... FOR UPDATE` takes a row lock on the material's ledger first, so two
   * planners reserving the same material serialise here instead of both reading the same
   * balance and both passing the check. The post-write balance assertion is the backstop.
   */
  async drawStockTx(tx, lineId, materialCode, rolls, actorUserId) {
    if (!materialCode || !(rolls > 0)) return;
    await tx.select({ id: inventoryRolls.id }).from(inventoryRolls).where(eq5(inventoryRolls.materialCode, materialCode)).for("update");
    await tx.insert(productionRollIssuances).values({
      productionOrderLineId: lineId,
      materialCode,
      rolls: String(rolls),
      note: "Reserved during production planning",
      actorUserId: actorUserId ?? null
    });
    const [stock] = await tx.update(inventoryRolls).set({
      issuedRolls: sql`${inventoryRolls.issuedRolls} + ${rolls}`,
      balanceRolls: sql`${inventoryRolls.balanceRolls} - ${rolls}`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(inventoryRolls.materialCode, materialCode)).returning();
    if (!stock || Number(stock.balanceRolls) < 0) {
      throw new BadRequestError(
        `Cannot assign ${rolls} rolls of ${materialCode}: not enough stock`
      );
    }
  }
  /** Credits one line's entire draw back to stock and clears its issuance history. */
  async releaseLineStockTx(tx, lineId) {
    const drawn = await tx.select({
      materialCode: productionRollIssuances.materialCode,
      rolls: sql`sum(${productionRollIssuances.rolls})`
    }).from(productionRollIssuances).where(eq5(productionRollIssuances.productionOrderLineId, lineId)).groupBy(productionRollIssuances.materialCode);
    for (const row of drawn) {
      const rolls = Number(row.rolls);
      await tx.update(inventoryRolls).set({
        issuedRolls: sql`${inventoryRolls.issuedRolls} - ${rolls}`,
        balanceRolls: sql`${inventoryRolls.balanceRolls} + ${rolls}`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(inventoryRolls.materialCode, row.materialCode));
    }
    await tx.delete(productionRollIssuances).where(eq5(productionRollIssuances.productionOrderLineId, lineId));
  }
  /** Re-derives the order status from its lines and pushes it to the sales order. */
  async resyncOrderTx(tx, productionOrderId, derive) {
    const siblings = await tx.select().from(productionOrderLines).where(eq5(productionOrderLines.productionOrderId, productionOrderId));
    const patch = derive(siblings);
    await tx.update(productionOrders).set({ ...patch, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(productionOrders.id, productionOrderId));
    await syncWorkOrderStatusTx(tx, productionOrderId, patch.status);
  }
  /**
   * Serialises resource assignment. Locks the machine/operator rows being claimed (sorted
   * ascending, machines before operators, to avoid deadlocks between two assigning
   * transactions) and then re-checks — inside the same transaction — that none is already
   * held by another active line. Two planners racing for the same machine now serialise on
   * the row lock, and the loser gets a clean 400 instead of both silently sharing it. This
   * is the authoritative backstop; the service's pre-transaction check is just a fast-fail.
   */
  async lockResourcesTx(tx, machineIds, operatorIds, excludeLineId) {
    const machineSet = [...new Set(machineIds)].sort((a, b) => a - b);
    const operatorSet = [...new Set(operatorIds)].sort((a, b) => a - b);
    if (machineSet.length === 0 && operatorSet.length === 0) return;
    if (machineSet.length > 0) {
      await tx.select({ id: machines.id }).from(machines).where(inArray2(machines.id, machineSet)).for("update");
    }
    if (operatorSet.length > 0) {
      await tx.select({ id: operators.id }).from(operators).where(inArray2(operators.id, operatorSet)).for("update");
    }
    const conditions = [
      sql`${productionOrderLines.status} <> 'completed'`,
      sql`${productionOrders.status} <> 'complete'`
    ];
    if (excludeLineId != null) conditions.push(sql`${productionOrderLines.id} <> ${excludeLineId}`);
    const rows = await tx.select({
      productionNumber: productionOrders.productionNumber,
      labelType: productionOrderLines.labelType,
      printingMachineId: productionOrderLines.printingMachineId,
      cuttingMachineId: productionOrderLines.cuttingMachineId,
      printingOperatorId: productionOrderLines.printingOperatorId,
      cuttingOperatorId: productionOrderLines.cuttingOperatorId,
      packagingOperatorId: productionOrderLines.packagingOperatorId
    }).from(productionOrderLines).innerJoin(productionOrders, eq5(productionOrderLines.productionOrderId, productionOrders.id)).where(and3(...conditions));
    const heldMachines = /* @__PURE__ */ new Map();
    const heldOperators = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const where = `${r.productionNumber} \xB7 ${r.labelType}`;
      for (const id of [r.printingMachineId, r.cuttingMachineId]) if (id != null) heldMachines.set(id, where);
      for (const id of [r.printingOperatorId, r.cuttingOperatorId, r.packagingOperatorId]) {
        if (id != null) heldOperators.set(id, where);
      }
    }
    for (const id of machineSet) {
      const heldBy = heldMachines.get(id);
      if (heldBy) throw new BadRequestError(`That machine is already assigned to ${heldBy}`);
    }
    for (const id of operatorSet) {
      const heldBy = heldOperators.get(id);
      if (heldBy) throw new BadRequestError(`That operator is already assigned to ${heldBy}`);
    }
  }
  /** Machine/operator ids being set (to non-null) by a line patch — what needs locking. */
  resourceIdsFromPatch(patch) {
    const machineIds = [patch.printingMachineId, patch.cuttingMachineId].filter(
      (id) => id != null
    );
    const operatorIds = [
      patch.printingOperatorId,
      patch.cuttingOperatorId,
      patch.packagingOperatorId
    ].filter((id) => id != null);
    return { machineIds, operatorIds };
  }
  /**
   * Plans ONE label type and reserves everything it needs in a single transaction:
   * the line row, its material draw from inventory, and its printing machine and operator
   * (locked + re-checked via `lockResourcesTx`).
   *
   * Planning is per-label-type rather than all-at-once so that submitting "Care Label"
   * locks its resources immediately, before "Size Label" is even entered.
   */
  async createLinePlanTransaction(productionOrderId, row, derive, actorUserId) {
    const { assignedRolls, ...line } = row;
    return db.transaction(async (tx) => {
      const [inserted] = await tx.insert(productionOrderLines).values({ ...line, productionOrderId, issuedRolls: String(assignedRolls) }).returning();
      const { machineIds, operatorIds } = this.resourceIdsFromPatch(inserted);
      await this.lockResourcesTx(tx, machineIds, operatorIds, inserted.id);
      await this.drawStockTx(tx, inserted.id, line.materialCode, assignedRolls, actorUserId);
      await this.resyncOrderTx(tx, productionOrderId, derive);
      return inserted;
    });
  }
  /**
   * Re-plans ONE label type. Its previous draw is credited back before the new one is
   * taken, so changing the material or lowering the assigned rolls settles correctly
   * rather than double-counting.
   */
  async updateLinePlanTransaction(lineId, productionOrderId, row, derive, actorUserId) {
    const { assignedRolls, ...line } = row;
    return db.transaction(async (tx) => {
      await this.releaseLineStockTx(tx, lineId);
      const [updated] = await tx.update(productionOrderLines).set({ ...line, issuedRolls: String(assignedRolls), updatedAt: /* @__PURE__ */ new Date() }).where(eq5(productionOrderLines.id, lineId)).returning();
      const { machineIds, operatorIds } = this.resourceIdsFromPatch(updated);
      await this.lockResourcesTx(tx, machineIds, operatorIds, lineId);
      await this.drawStockTx(tx, lineId, line.materialCode, assignedRolls, actorUserId);
      await this.resyncOrderTx(tx, productionOrderId, derive);
      return updated;
    });
  }
  /**
   * Cancels ONE label type: its rolls go back to stock and its machine/operator are
   * released (they are only ever held *by* a line, so deleting the line frees them).
   */
  async deleteLineTransaction(lineId, productionOrderId, derive) {
    return db.transaction(async (tx) => {
      await this.releaseLineStockTx(tx, lineId);
      await tx.delete(productionOrderLines).where(eq5(productionOrderLines.id, lineId));
      await this.resyncOrderTx(tx, productionOrderId, derive);
    });
  }
  /** Credits an order's entire inventory draw back to stock — used when it is deleted. */
  async releaseOrderInventoryTransaction(productionOrderId) {
    return db.transaction(async (tx) => {
      const previous = await tx.select({
        materialCode: productionRollIssuances.materialCode,
        rolls: sql`sum(${productionRollIssuances.rolls})`
      }).from(productionRollIssuances).innerJoin(
        productionOrderLines,
        eq5(productionRollIssuances.productionOrderLineId, productionOrderLines.id)
      ).where(eq5(productionOrderLines.productionOrderId, productionOrderId)).groupBy(productionRollIssuances.materialCode);
      for (const row of previous) {
        const rolls = Number(row.rolls);
        await tx.update(inventoryRolls).set({
          issuedRolls: sql`${inventoryRolls.issuedRolls} - ${rolls}`,
          balanceRolls: sql`${inventoryRolls.balanceRolls} + ${rolls}`,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq5(inventoryRolls.materialCode, row.materialCode));
      }
      const [order] = await tx.select({ workOrderId: productionOrders.workOrderId }).from(productionOrders).where(eq5(productionOrders.id, productionOrderId));
      await tx.delete(productionOrders).where(eq5(productionOrders.id, productionOrderId));
      if (order) {
        await tx.update(workOrders).set({ status: "initiate_production", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(workOrders.id, order.workOrderId));
      }
    });
  }
  /**
   * Writes a counter change and its audit event atomically, then re-derives the parent
   * order's status from the resulting line set. Keeping all three in one transaction is
   * what stops the order status from drifting away from its lines.
   *
   * The line is locked `FOR UPDATE` and the patch is computed *inside* the lock, from the
   * freshly-read row, via `compute`. That is what prevents a lost update: two supervisors
   * editing the same line no longer both compute against a stale snapshot and let the later
   * write silently clobber the earlier one — the second edit waits for the lock, then
   * recomputes (and re-validates, throwing to roll back) against committed state.
   */
  async applyLineChangeTransaction(lineId, compute, deriveOrderPatch2) {
    return db.transaction(async (tx) => {
      const [locked] = await tx.select().from(productionOrderLines).where(eq5(productionOrderLines.id, lineId)).for("update");
      if (!locked) throw new NotFoundError("Production order line not found");
      const { linePatch, event } = compute(locked);
      const { machineIds, operatorIds } = this.resourceIdsFromPatch(linePatch);
      await this.lockResourcesTx(tx, machineIds, operatorIds, lineId);
      const [line] = await tx.update(productionOrderLines).set({ ...linePatch, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(productionOrderLines.id, lineId)).returning();
      await tx.insert(productionStageEvents).values({ ...event, productionOrderLineId: lineId });
      const siblings = await tx.select().from(productionOrderLines).where(eq5(productionOrderLines.productionOrderId, line.productionOrderId));
      const orderPatch = deriveOrderPatch2(siblings);
      await tx.update(productionOrders).set({ ...orderPatch, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(productionOrders.id, line.productionOrderId));
      await syncWorkOrderStatusTx(tx, line.productionOrderId, orderPatch.status);
      return line;
    });
  }
  /**
   * Issues material to a production line: records the issuance, bumps the line's
   * denormalized `issuedRolls`, and debits inventory — all atomically. This is the only
   * write path that reduces `inventory_rolls.balanceRolls`.
   */
  async issueRollsTransaction(lineId, materialCode, rolls, note, actorUserId) {
    return db.transaction(async (tx) => {
      const [issuance] = await tx.insert(productionRollIssuances).values({
        productionOrderLineId: lineId,
        materialCode,
        rolls: String(rolls),
        note,
        actorUserId: actorUserId ?? null
      }).returning();
      await tx.update(productionOrderLines).set({
        issuedRolls: sql`${productionOrderLines.issuedRolls} + ${rolls}`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(productionOrderLines.id, lineId));
      await tx.update(inventoryRolls).set({
        issuedRolls: sql`${inventoryRolls.issuedRolls} + ${rolls}`,
        balanceRolls: sql`${inventoryRolls.balanceRolls} - ${rolls}`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(inventoryRolls.materialCode, materialCode));
      return issuance;
    });
  }
  async findLineIssuances(lineId, opts) {
    return db.select().from(productionRollIssuances).where(eq5(productionRollIssuances.productionOrderLineId, Number(lineId))).orderBy(desc2(productionRollIssuances.createdAt)).limit(opts?.limit ?? DEFAULT_HISTORY_LIMIT).offset(opts?.offset ?? 0);
  }
  async findLineEvents(lineId, opts) {
    return db.select().from(productionStageEvents).where(eq5(productionStageEvents.productionOrderLineId, Number(lineId))).orderBy(desc2(productionStageEvents.createdAt)).limit(opts?.limit ?? DEFAULT_HISTORY_LIMIT).offset(opts?.offset ?? 0);
  }
  async findOrderEvents(productionOrderId, opts) {
    return db.select({
      id: productionStageEvents.id,
      productionOrderLineId: productionStageEvents.productionOrderLineId,
      labelType: productionOrderLines.labelType,
      eventType: productionStageEvents.eventType,
      previousValue: productionStageEvents.previousValue,
      newValue: productionStageEvents.newValue,
      delta: productionStageEvents.delta,
      actorUserId: productionStageEvents.actorUserId,
      note: productionStageEvents.note,
      createdAt: productionStageEvents.createdAt
    }).from(productionStageEvents).innerJoin(productionOrderLines, eq5(productionStageEvents.productionOrderLineId, productionOrderLines.id)).where(eq5(productionOrderLines.productionOrderId, Number(productionOrderId))).orderBy(desc2(productionStageEvents.createdAt)).limit(opts?.limit ?? DEFAULT_HISTORY_LIMIT).offset(opts?.offset ?? 0);
  }
  /**
   * Every machine and operator currently held by an **active** production line, with the
   * line and order holding it. A resource is locked while its line is not yet `completed`
   * and its order is not yet `complete`; finishing the work (or clearing the assignment)
   * releases it automatically, so there is no separate "unlock" step to forget.
   */
  async findResourceAssignments(exclude) {
    const conditions = [
      sql`${productionOrderLines.status} <> 'completed'`,
      sql`${productionOrders.status} <> 'complete'`
    ];
    if (exclude?.lineId) conditions.push(sql`${productionOrderLines.id} <> ${exclude.lineId}`);
    if (exclude?.productionOrderId) {
      conditions.push(sql`${productionOrderLines.productionOrderId} <> ${exclude.productionOrderId}`);
    }
    return db.select({
      lineId: productionOrderLines.id,
      labelType: productionOrderLines.labelType,
      productionOrderId: productionOrderLines.productionOrderId,
      productionNumber: productionOrders.productionNumber,
      printingMachineId: productionOrderLines.printingMachineId,
      printingOperatorId: productionOrderLines.printingOperatorId,
      cuttingMachineId: productionOrderLines.cuttingMachineId,
      cuttingOperatorId: productionOrderLines.cuttingOperatorId,
      packagingOperatorId: productionOrderLines.packagingOperatorId
    }).from(productionOrderLines).innerJoin(productionOrders, eq5(productionOrderLines.productionOrderId, productionOrders.id)).where(and3(...conditions));
  }
  /**
   * Every machine/operator assignment that exists, with the state needed to classify how
   * busy the resource is: whether its line has started, and whether it has finished.
   * Unlike `findResourceAssignments` this does **not** filter to active lines — finished
   * work is what distinguishes a "Completed" operator from an idle one.
   */
  async findResourceUsage() {
    return db.select({
      lineId: productionOrderLines.id,
      lineStatus: productionOrderLines.status,
      orderStatus: productionOrders.status,
      productionNumber: productionOrders.productionNumber,
      labelType: productionOrderLines.labelType,
      printedRolls: productionOrderLines.printedRolls,
      cutRolls: productionOrderLines.cutRolls,
      packagedRolls: productionOrderLines.packagedRolls,
      printingMachineId: productionOrderLines.printingMachineId,
      printingOperatorId: productionOrderLines.printingOperatorId,
      cuttingMachineId: productionOrderLines.cuttingMachineId,
      cuttingOperatorId: productionOrderLines.cuttingOperatorId,
      packagingOperatorId: productionOrderLines.packagingOperatorId
    }).from(productionOrderLines).innerJoin(productionOrders, eq5(productionOrderLines.productionOrderId, productionOrders.id));
  }
  /** Total rolls drawn from inventory by every line of one production order, per material. */
  async findOrderIssuanceTotals(productionOrderId) {
    return db.select({
      materialCode: productionRollIssuances.materialCode,
      rolls: sql`sum(${productionRollIssuances.rolls})`
    }).from(productionRollIssuances).innerJoin(
      productionOrderLines,
      eq5(productionRollIssuances.productionOrderLineId, productionOrderLines.id)
    ).where(eq5(productionOrderLines.productionOrderId, Number(productionOrderId))).groupBy(productionRollIssuances.materialCode);
  }
  /** Work orders still in production (not completed) that don't yet have a production order. */
  async findEligibleWorkOrders() {
    return db.select({
      id: workOrders.id,
      soNumber: workOrders.soNumber,
      poNumber: workOrders.poNumber,
      orderDate: workOrders.orderDate,
      dueDate: workOrders.dueDate,
      totalQty: workOrders.totalQty,
      productType: workOrders.productType,
      brandId: brands.id,
      brandName: brands.name,
      companyId: companies.id,
      companyName: companies.name
    }).from(workOrders).leftJoin(brands, eq5(workOrders.brandId, brands.id)).leftJoin(companies, eq5(brands.companyId, companies.id)).where(
      and3(
        eq5(workOrders.status, "initiate_production"),
        sql`NOT EXISTS (SELECT 1 FROM ${productionOrders} WHERE ${productionOrders.workOrderId} = ${workOrders.id})`
      )
    ).orderBy(desc2(workOrders.createdAt));
  }
  /**
   * Reconciles stock for a finished production line:
   * Records usedRolls, usedWeight, extraRollsReturned, extraWeight, and reconciledAt.
   * Automatically credits extraRollsReturned rolls back to main inventory (inventory_rolls)
   * and writes an append-only inventory_roll_movements history entry.
   */
  async reconcileLineStockTransaction(lineId, data) {
    return db.transaction(async (tx) => {
      const [line] = await tx.select().from(productionOrderLines).where(eq5(productionOrderLines.id, lineId));
      if (!line) throw new NotFoundError("Production order line not found");
      const previousReturned = Number(line.extraRollsReturned ?? 0);
      const newReturned = Number(data.extraRollsReturned);
      const deltaReturned = newReturned - previousReturned;
      const [updatedLine] = await tx.update(productionOrderLines).set({
        usedRolls: String(data.usedRolls),
        usedWeight: String(data.usedWeight),
        extraRollsReturned: String(data.extraRollsReturned),
        extraWeight: String(data.extraWeight),
        reconciledAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(productionOrderLines.id, lineId)).returning();
      if (deltaReturned !== 0 && line.materialCode) {
        const [stock] = await tx.select().from(inventoryRolls).where(eq5(inventoryRolls.materialCode, line.materialCode));
        if (stock) {
          const newIssued = Math.max(0, Number(stock.issuedRolls) - deltaReturned);
          const newBalance = Math.max(0, Number(stock.balanceRolls) + deltaReturned);
          await tx.update(inventoryRolls).set({
            issuedRolls: String(newIssued),
            balanceRolls: String(newBalance),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq5(inventoryRolls.id, stock.id));
          await tx.insert(inventoryRollMovements).values({
            inventoryRollId: stock.id,
            materialCode: line.materialCode,
            movementType: "production_release",
            rolls: String(deltaReturned),
            balanceAfter: String(newBalance),
            referenceType: "production_order_line",
            referenceId: lineId,
            note: `Stock reconciliation return for ${line.labelType} (${data.extraRollsReturned} rolls returned, ${data.extraWeight} kg extra)`,
            actorUserId: data.actorUserId ?? null
          });
        }
      }
      return updatedLine;
    });
  }
};
var productionOrderRepository = new ProductionOrderRepository();

// src/api/services/resource-availability.service.ts
var RANK = { "In Production": 3, Working: 3, Reserved: 2, Assigned: 2, Completed: 1 };
async function classify() {
  const rows = await productionOrderRepository.findResourceUsage();
  const machines2 = /* @__PURE__ */ new Map();
  const operators2 = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const finished = row.lineStatus === "completed" || row.orderStatus === "complete";
    const started = Number(row.printedRolls) > 0 || Number(row.cutRolls) > 0 || Number(row.packagedRolls) > 0;
    const heldBy = `${row.productionNumber} \xB7 ${row.labelType}`;
    const machineState = finished ? "Completed" : started ? "In Production" : "Reserved";
    const operatorState = finished ? "Completed" : started ? "Working" : "Assigned";
    const put = (map, id, state) => {
      if (id == null) return;
      const existing = map.get(id);
      if (existing && RANK[existing.state] >= RANK[state]) return;
      map.set(id, { state, heldBy });
    };
    put(machines2, row.printingMachineId, machineState);
    put(machines2, row.cuttingMachineId, machineState);
    put(operators2, row.printingOperatorId, operatorState);
    put(operators2, row.cuttingOperatorId, operatorState);
    put(operators2, row.packagingOperatorId, operatorState);
  }
  return { machines: machines2, operators: operators2 };
}
var ResourceAvailabilityService = class {
  /**
   * Decorates machine and operator records with their live availability in one pass, so
   * a list endpoint costs one extra query rather than one per row.
   */
  async decorate(machines2, operators2) {
    const { machines: machineState, operators: operatorState } = await classify();
    return {
      machines: machines2.map((machine) => {
        if (machine.status === "Maintenance") {
          return { ...machine, availability: "Maintenance", isOccupied: true, heldBy: null };
        }
        const held = machineState.get(machine.id);
        if (!held || held.state === "Completed") {
          return { ...machine, availability: "Available", isOccupied: false, heldBy: null };
        }
        return { ...machine, availability: held.state, isOccupied: true, heldBy: held.heldBy };
      }),
      operators: operators2.map((operator) => {
        const held = operatorState.get(operator.id);
        if (!held) {
          return { ...operator, availability: "Available", isOccupied: false, heldBy: null };
        }
        if (held.state === "Completed") {
          return { ...operator, availability: "Completed", isOccupied: false, heldBy: null };
        }
        return { ...operator, availability: held.state, isOccupied: true, heldBy: held.heldBy };
      })
    };
  }
};
var resourceAvailabilityService = new ResourceAvailabilityService();

// src/api/services/machine.service.ts
var MachineService = class {
  /** Each machine carries its live availability, derived from the lines holding it. */
  async getMachines(filters) {
    const machines2 = await machineRepository.findAll(filters);
    const decorated = await resourceAvailabilityService.decorate(machines2, []);
    return decorated.machines;
  }
  async getMachine(id) {
    const machine = await machineRepository.findById(id);
    if (!machine) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    return machine;
  }
  async createMachine(data) {
    const existing = await machineRepository.findAll({ includeInactive: true });
    if (existing.some((m) => m.machineCode === data.machineCode)) {
      throw new ConflictError(Messages.alreadyExists(Entity.MACHINE));
    }
    return machineRepository.create(data);
  }
  async updateMachine(id, data) {
    const machine = await machineRepository.findById(id);
    if (!machine) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    const updated = await machineRepository.update(id, data);
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    return updated;
  }
  async deleteMachine(id) {
    const machine = await machineRepository.findById(id);
    if (!machine) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    await machineRepository.softDelete(id);
  }
};
var machineService = new MachineService();

// src/api/controllers/machine.controller.ts
var MachineController = class {
  getMachines = asyncHandler(async (req, res) => {
    const { type, productType, includeInactive } = req.validatedQuery ?? req.query;
    const data = await machineService.getMachines({ type, productType, includeInactive });
    res.json({ data });
  });
  getMachine = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await machineService.getMachine(id);
    res.json({ data });
  });
  createMachine = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await machineService.createMachine(input);
    res.status(201).json({ data });
  });
  updateMachine = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.validatedParams ?? req.params;
      const input = req.validatedBody ?? req.body;
      const data = await machineService.updateMachine(id, input);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });
  deleteMachine = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await machineService.deleteMachine(id);
    res.status(204).send();
  });
};
var machineController = new MachineController();

// src/api/validations/machines.validation.ts
import { z as z9 } from "zod";
var createMachineSchema = z9.object({
  body: z9.object({
    name: z9.string().min(1, "Name is required"),
    machineCode: z9.string().min(1, "Machine code is required"),
    machineName: z9.string().min(1, "Machine name is required"),
    machineType: z9.enum(["Printing", "Woven", "Cutting", "Packaging", "Other"]).default("Other"),
    productType: z9.enum(["printed", "woven", "both"]).default("both"),
    machineOperatorId: z9.coerce.number().int().positive().optional(),
    capacityPerHour: z9.coerce.number().int().min(0).optional(),
    status: z9.enum(["Active", "Inactive"]).default("Active")
  })
});
var updateMachineSchema = z9.object({
  body: z9.object({
    name: z9.string().min(1, "Name is required").optional(),
    machineCode: z9.string().min(1, "Machine code is required").optional(),
    machineName: z9.string().min(1, "Machine name is required").optional(),
    machineType: z9.enum(["Printing", "Woven", "Cutting", "Packaging", "Other"]).optional(),
    productType: z9.enum(["printed", "woven", "both"]).optional(),
    machineOperatorId: z9.coerce.number().int().positive().optional(),
    capacityPerHour: z9.coerce.number().int().min(0).optional(),
    status: z9.enum(["Active", "Inactive"]).optional(),
    isActive: z9.coerce.boolean().optional()
  })
});

// src/api/routes/machines.routes.ts
var router6 = Router7();
router6.get("/", validateQuery(listMachinesQuerySchema), machineController.getMachines);
router6.get("/:id", validateParams(idParamsSchema), machineController.getMachine);
router6.post("/", validateRequest(createMachineSchema), machineController.createMachine);
router6.put("/:id", validateParams(idParamsSchema), validateRequest(updateMachineSchema), machineController.updateMachine);
router6.delete("/:id", validateParams(idParamsSchema), machineController.deleteMachine);
var machines_routes_default = router6;

// src/api/routes/operators.routes.ts
import { Router as Router8 } from "express";

// src/api/repositories/operator.repository.ts
import { eq as eq6, asc as asc4, and as and4, sql as sql2, inArray as inArray3 } from "drizzle-orm";
var OperatorRepository = class {
  async findAll(filters) {
    const conditions = [];
    if (filters?.designation) conditions.push(eq6(operators.designation, filters.designation));
    if (filters?.operatorType) conditions.push(eq6(operators.operatorType, filters.operatorType));
    if (filters?.productType) {
      conditions.push(inArray3(operators.operatorType, [filters.productType, "both"]));
    }
    if (filters?.search) {
      const q = `%${filters.search}%`;
      conditions.push(sql2`(${operators.name} ILIKE ${q} OR ${operators.employeeCode} ILIKE ${q})`);
    }
    if (!filters?.includeInactive) conditions.push(eq6(operators.isActive, true));
    return db.select().from(operators).where(conditions.length > 0 ? and4(...conditions) : void 0).orderBy(asc4(operators.name));
  }
  async findById(id) {
    const [operator] = await db.select().from(operators).where(eq6(operators.id, Number(id)));
    return operator;
  }
  async create(data) {
    const [operator] = await db.insert(operators).values(data).returning();
    return operator;
  }
  async update(id, data) {
    const [operator] = await db.update(operators).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(operators.id, Number(id))).returning();
    return operator;
  }
  async softDelete(id) {
    const [operator] = await db.update(operators).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(operators.id, Number(id))).returning();
    return operator;
  }
};
var operatorRepository = new OperatorRepository();

// src/api/services/operator.service.ts
function normaliseAvatar(url) {
  if (url === void 0) return void 0;
  const trimmed = (url ?? "").trim();
  return trimmed === "" ? null : trimmed;
}
var OperatorService = class {
  /**
   * Each operator carries their live availability, derived from the lines holding them.
   * `productType` narrows the list to operators capable of that line (the specific type
   * plus `both`) — this is the filter production pickers use.
   */
  async getOperators(filters) {
    const operators2 = await operatorRepository.findAll(filters);
    const decorated = await resourceAvailabilityService.decorate([], operators2);
    return decorated.operators;
  }
  async getOperator(id) {
    const operator = await operatorRepository.findById(id);
    if (!operator) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    return operator;
  }
  async createOperator(data) {
    const existing = await operatorRepository.findAll({ includeInactive: true });
    if (existing.some((o) => o.name === data.name)) {
      throw new ConflictError(Messages.alreadyExists(Entity.OPERATOR));
    }
    return operatorRepository.create({
      ...data,
      operatorType: data.operatorType ?? "both",
      avatarUrl: normaliseAvatar(data.avatarUrl) ?? null
    });
  }
  async updateOperator(id, data) {
    const operator = await operatorRepository.findById(id);
    if (!operator) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    const { avatarUrl, ...rest } = data;
    const updated = await operatorRepository.update(id, {
      ...rest,
      ...avatarUrl !== void 0 ? { avatarUrl: normaliseAvatar(avatarUrl) ?? null } : {}
    });
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    return updated;
  }
  async deleteOperator(id) {
    const operator = await operatorRepository.findById(id);
    if (!operator) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    await operatorRepository.softDelete(id);
  }
};
var operatorService = new OperatorService();

// src/api/controllers/operator.controller.ts
var OperatorController = class {
  getOperators = asyncHandler(async (req, res) => {
    const query = req.validatedQuery ?? req.query;
    const data = await operatorService.getOperators(query);
    res.json({ data });
  });
  getOperator = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await operatorService.getOperator(id);
    res.json({ data });
  });
  createOperator = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await operatorService.createOperator(input);
    res.status(201).json({ data });
  });
  updateOperator = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.validatedParams ?? req.params;
      const input = req.validatedBody ?? req.body;
      const data = await operatorService.updateOperator(id, input);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });
  deleteOperator = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await operatorService.deleteOperator(id);
    res.status(204).send();
  });
};
var operatorController = new OperatorController();

// src/api/validations/operators.validation.ts
import { z as z10 } from "zod";
var operatorTypeEnum2 = z10.enum(["printed", "woven", "both"]);
var avatarUrlSchema = z10.string().trim().max(1e6).optional().or(z10.literal(""));
var createOperatorSchema = z10.object({
  body: z10.object({
    name: z10.string().min(1, "Name is required"),
    employeeCode: z10.string().optional(),
    designation: z10.enum(["Printing", "Weaving", "Cutting", "Packaging"]).default("Printing"),
    operatorType: operatorTypeEnum2.default("both"),
    avatarUrl: avatarUrlSchema,
    shift: z10.string().optional(),
    status: z10.enum(["Active", "Inactive"]).default("Active")
  })
});
var updateOperatorSchema = z10.object({
  body: z10.object({
    name: z10.string().min(1, "Name is required").optional(),
    employeeCode: z10.string().optional(),
    designation: z10.enum(["Printing", "Weaving", "Cutting", "Packaging"]).optional(),
    operatorType: operatorTypeEnum2.optional(),
    avatarUrl: avatarUrlSchema,
    shift: z10.string().optional(),
    status: z10.enum(["Active", "Inactive"]).optional(),
    isActive: z10.coerce.boolean().optional()
  })
});

// src/api/routes/operators.routes.ts
var router7 = Router8();
router7.get("/", validateQuery(listOperatorsQuerySchema), operatorController.getOperators);
router7.get("/:id", validateParams(idParamsSchema), operatorController.getOperator);
router7.post("/", validateRequest(createOperatorSchema), operatorController.createOperator);
router7.put("/:id", validateParams(idParamsSchema), validateRequest(updateOperatorSchema), operatorController.updateOperator);
router7.delete("/:id", validateParams(idParamsSchema), operatorController.deleteOperator);
var operators_routes_default = router7;

// src/api/routes/users.routes.ts
import { Router as Router9 } from "express";

// src/api/repositories/user.repository.ts
import { eq as eq7, asc as asc5, and as and5 } from "drizzle-orm";
var UserRepository = class {
  async findAll(filters) {
    const conditions = [];
    if (filters?.role) conditions.push(eq7(users.role, filters.role));
    if (!filters?.includeInactive) conditions.push(eq7(users.isActive, true));
    return db.select().from(users).where(conditions.length > 0 ? and5(...conditions) : void 0).orderBy(asc5(users.name));
  }
  async findById(id) {
    const [user] = await db.select().from(users).where(eq7(users.id, Number(id)));
    return user;
  }
  async findByEmail(email) {
    const [user] = await db.select().from(users).where(eq7(users.email, email));
    return user;
  }
  async create(data) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }
  async update(id, data) {
    const [user] = await db.update(users).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(users.id, Number(id))).returning();
    return user;
  }
  async softDelete(id) {
    const [user] = await db.update(users).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(users.id, Number(id))).returning();
    return user;
  }
};
var userRepository = new UserRepository();

// src/api/services/user.service.ts
var UserService = class {
  async getUsers(filters) {
    return userRepository.findAll(filters);
  }
  async getUser(id) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(Messages.notFound(Entity.USER));
    return user;
  }
  async createUser(data) {
    if (data.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing) throw new ConflictError(Messages.alreadyExists(Entity.USER));
    }
    return userRepository.create(data);
  }
  async updateUser(id, data) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(Messages.notFound(Entity.USER));
    if (data.email && data.email !== user.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing) throw new ConflictError(Messages.alreadyExists(Entity.USER));
    }
    const updated = await userRepository.update(id, data);
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.USER));
    return updated;
  }
  async deleteUser(id) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(Messages.notFound(Entity.USER));
    await userRepository.softDelete(id);
  }
  /** Resolves an actor id supplied by the client, rejecting unknown or deactivated users. */
  async assertActor(actorUserId) {
    if (actorUserId === void 0) return null;
    const user = await userRepository.findById(actorUserId);
    if (!user || !user.isActive) throw new NotFoundError(Messages.notFound(Entity.USER));
    return user.id;
  }
};
var userService = new UserService();

// src/api/controllers/user.controller.ts
var UserController = class {
  getUsers = asyncHandler(async (req, res) => {
    const { role, includeInactive } = req.validatedQuery ?? req.query;
    const data = await userService.getUsers({ role, includeInactive });
    res.json({ data });
  });
  getUser = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await userService.getUser(id);
    res.json({ data });
  });
  createUser = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await userService.createUser(input);
    res.status(201).json({ data });
  });
  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await userService.updateUser(id, input);
    res.json({ data });
  });
  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await userService.deleteUser(id);
    res.status(204).send();
  });
};
var userController = new UserController();

// src/api/validations/users.validation.ts
import { z as z11 } from "zod";
var userRoleSchema = z11.enum(["office_staff", "production_manager", "production_operator"]);
var createUserSchema = z11.object({
  body: z11.object({
    name: z11.string().trim().min(1, "Name is required"),
    employeeCode: z11.string().optional(),
    email: z11.string().email("Must be a valid email").optional(),
    role: userRoleSchema
  })
});
var updateUserSchema = z11.object({
  body: z11.object({
    name: z11.string().trim().min(1).optional(),
    employeeCode: z11.string().optional(),
    email: z11.string().email("Must be a valid email").optional(),
    role: userRoleSchema.optional(),
    isActive: z11.coerce.boolean().optional()
  })
});

// src/api/routes/users.routes.ts
var router8 = Router9();
router8.get("/", validateQuery(listUsersQuerySchema), userController.getUsers);
router8.get("/:id", validateParams(idParamsSchema), userController.getUser);
router8.post("/", validateRequest(createUserSchema), userController.createUser);
router8.put("/:id", validateParams(idParamsSchema), validateRequest(updateUserSchema), userController.updateUser);
router8.delete("/:id", validateParams(idParamsSchema), userController.deleteUser);
var users_routes_default = router8;

// src/api/routes/work-orders.routes.ts
import { Router as Router10 } from "express";

// src/api/repositories/work-order.repository.ts
import { eq as eq8, desc as desc3, and as and6, sql as sql3 } from "drizzle-orm";
var workOrderWithBrandSelect = {
  id: workOrders.id,
  soNumber: workOrders.soNumber,
  poNumber: workOrders.poNumber,
  orderDate: workOrders.orderDate,
  dueDate: workOrders.dueDate,
  totalQty: workOrders.totalQty,
  brandId: workOrders.brandId,
  comment: workOrders.comment,
  priority: workOrders.priority,
  orderType: workOrders.orderType,
  imageUrl: workOrders.imageUrl,
  status: workOrders.status,
  productType: workOrders.productType,
  dcNumber: workOrders.dcNumber,
  lcNumber: workOrders.lcNumber,
  fbrInvoiceNumber: workOrders.fbrInvoiceNumber,
  dispatchedDate: workOrders.dispatchedDate,
  dispatchedQty: workOrders.dispatchedQty,
  createdAt: workOrders.createdAt,
  updatedAt: workOrders.updatedAt,
  brandName: brands.name,
  companyId: companies.id,
  companyName: companies.name,
  designCode: wovenWorkOrderDetails.designCode,
  pick: wovenWorkOrderDetails.pick,
  repeat: wovenWorkOrderDetails.repeat,
  density: wovenWorkOrderDetails.density,
  extra: wovenWorkOrderDetails.extra,
  sizeLabels: wovenWorkOrderDetails.sizeLabels
};
var WorkOrderRepository = class {
  async findAll(filters) {
    const conditions = [];
    if (filters?.soNumber) conditions.push(sql3`${workOrders.soNumber} ILIKE ${"%" + filters.soNumber + "%"}`);
    if (filters?.poNumber) conditions.push(sql3`${workOrders.poNumber} ILIKE ${"%" + filters.poNumber + "%"}`);
    if (filters?.dcNumber) conditions.push(sql3`${workOrders.dcNumber} ILIKE ${"%" + filters.dcNumber + "%"}`);
    if (filters?.lcNumber) conditions.push(sql3`${workOrders.lcNumber} ILIKE ${"%" + filters.lcNumber + "%"}`);
    if (filters?.designCode) {
      conditions.push(sql3`${wovenWorkOrderDetails.designCode} ILIKE ${"%" + filters.designCode + "%"}`);
    }
    if (filters?.status) conditions.push(eq8(workOrders.status, filters.status));
    if (filters?.productType) conditions.push(eq8(workOrders.productType, filters.productType));
    if (filters?.startDate && filters?.endDate) {
      conditions.push(sql3`${workOrders.orderDate} BETWEEN ${filters.startDate} AND ${filters.endDate}`);
    }
    return db.select(workOrderWithBrandSelect).from(workOrders).leftJoin(brands, eq8(workOrders.brandId, brands.id)).leftJoin(companies, eq8(brands.companyId, companies.id)).leftJoin(wovenWorkOrderDetails, eq8(wovenWorkOrderDetails.workOrderId, workOrders.id)).where(conditions.length > 0 ? and6(...conditions) : void 0).orderBy(desc3(workOrders.createdAt));
  }
  async findById(id) {
    const [workOrder] = await db.select(workOrderWithBrandSelect).from(workOrders).leftJoin(brands, eq8(workOrders.brandId, brands.id)).leftJoin(companies, eq8(brands.companyId, companies.id)).leftJoin(wovenWorkOrderDetails, eq8(wovenWorkOrderDetails.workOrderId, workOrders.id)).where(eq8(workOrders.id, Number(id)));
    return workOrder;
  }
  /** The loom spec for a woven order, or undefined for a printed one. */
  async findWovenDetail(workOrderId) {
    const [row] = await db.select().from(wovenWorkOrderDetails).where(eq8(wovenWorkOrderDetails.workOrderId, Number(workOrderId)));
    return row;
  }
  async findByDesignCode(designCode) {
    const [row] = await db.select().from(wovenWorkOrderDetails).where(eq8(wovenWorkOrderDetails.designCode, designCode));
    return row;
  }
  async findRawById(id) {
    const [workOrder] = await db.select().from(workOrders).where(eq8(workOrders.id, Number(id)));
    return workOrder;
  }
  async create(data) {
    const [workOrder] = await db.insert(workOrders).values(data).returning();
    return workOrder;
  }
  /**
   * Creates a woven sales order and its loom specification atomically — a woven order
   * without its design spec would be unusable, so the two must land together.
   */
  async createWithWovenDetail(data, detail) {
    return db.transaction(async (tx) => {
      const [workOrder] = await tx.insert(workOrders).values({ ...data, productType: "woven" }).returning();
      await tx.insert(wovenWorkOrderDetails).values({ ...detail, workOrderId: workOrder.id });
      return workOrder;
    });
  }
  async upsertWovenDetail(workOrderId, detail) {
    const [row] = await db.update(wovenWorkOrderDetails).set({ ...detail, updatedAt: /* @__PURE__ */ new Date() }).where(eq8(wovenWorkOrderDetails.workOrderId, workOrderId)).returning();
    return row;
  }
  async update(id, data) {
    const [workOrder] = await db.update(workOrders).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq8(workOrders.id, Number(id))).returning();
    return workOrder;
  }
  async delete(id) {
    await db.delete(workOrders).where(eq8(workOrders.id, Number(id)));
  }
};
var workOrderRepository = new WorkOrderRepository();

// src/api/services/mail.service.ts
import nodemailer from "nodemailer";
var MailService = class {
  transporter = null;
  getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      });
    }
    return this.transporter;
  }
  /**
   * Sends an email to ceo@3qfacility.com when a production order is marked as complete.
   */
  async sendProductionCompletedEmail(orderData) {
    try {
      const recipient = env.CEO_EMAIL;
      const subject = `Order Complete Notification - ${orderData.productionNumber}${orderData.soNumber ? ` (SO: ${orderData.soNumber})` : ""}`;
      const customMessage = `Dear recipient, your order is complete. Please share PO copy if not so that we will dispatch your order. If already shared, stay calm, we will dispatch your order shortly.`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Order Completed</h2>
          <p style="font-size: 15px; color: #334155; line-height: 1.6; background-color: #f8fafc; padding: 16px; border-radius: 6px; border-left: 4px solid #0284c7;">
            ${customMessage}
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 12px;">Order Summary:</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 40%;">Production Number:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${orderData.productionNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Sales Order (SO):</td>
              <td style="padding: 8px 0; color: #0f172a;">${orderData.soNumber || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">PO Number:</td>
              <td style="padding: 8px 0; color: #0f172a;">${orderData.poNumber || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Company / Brand:</td>
              <td style="padding: 8px 0; color: #0f172a;">${orderData.companyName || "N/A"}${orderData.brandName ? ` / ${orderData.brandName}` : ""}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Total Quantity:</td>
              <td style="padding: 8px 0; color: #0f172a;">${orderData.totalQty != null ? Number(orderData.totalQty).toLocaleString() : "N/A"}</td>
            </tr>
          </table>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
            Sent automatically by 3Q Facility ERP System
          </div>
        </div>
      `;
      const info = await this.getTransporter().sendMail({
        from: env.SMTP_FROM,
        to: recipient,
        subject,
        text: `${customMessage}

Order Details:
- Production Number: ${orderData.productionNumber}
- SO Number: ${orderData.soNumber || "N/A"}
- PO Number: ${orderData.poNumber || "N/A"}
- Company: ${orderData.companyName || "N/A"}
- Brand: ${orderData.brandName || "N/A"}
- Quantity: ${orderData.totalQty != null ? Number(orderData.totalQty).toLocaleString() : "N/A"}`,
        html: htmlContent
      });
      console.log(`[MailService] Production completion email sent to ${recipient}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error("[MailService] Failed to send production completion email:", error);
      return false;
    }
  }
};
var mailService = new MailService();

// src/api/services/work-order.service.ts
var WorkOrderService = class {
  async getWorkOrders(filters) {
    return workOrderRepository.findAll(filters);
  }
  async getWorkOrder(id) {
    const workOrder = await workOrderRepository.findById(id);
    if (!workOrder) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));
    const productionOrder = await productionOrderRepository.findByWorkOrderId(id);
    return { ...workOrder, productionOrder: productionOrder ?? null };
  }
  /**
   * Creates a sales order for either workflow. Company / Brand / PO / SO / Quantity are
   * identical across both; a woven order additionally carries its loom specification,
   * which is written in the same transaction as the order itself.
   */
  async createWorkOrder(data) {
    const existing = await workOrderRepository.findAll({ soNumber: data.soNumber });
    if (existing.length > 0) {
      throw new ConflictError(Messages.alreadyExists(Entity.WORK_ORDER));
    }
    const header = {
      soNumber: data.soNumber,
      poNumber: data.poNumber,
      orderDate: data.orderDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      dueDate: data.dueDate,
      totalQty: data.totalQty,
      brandId: data.brandId,
      comment: data.comment,
      priority: data.priority ?? "normal",
      orderType: data.orderType ?? "normal order",
      imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null
    };
    if (data.productType === "woven") {
      if (!data.wovenDetail) {
        throw new ApiError("Woven work orders require the design specification", 400);
      }
      const clash = await workOrderRepository.findByDesignCode(data.wovenDetail.designCode);
      if (clash) {
        throw new ConflictError(`Design code '${data.wovenDetail.designCode}' is already in use`);
      }
      return workOrderRepository.createWithWovenDetail(header, {
        designCode: data.wovenDetail.designCode,
        pick: data.wovenDetail.pick,
        density: data.wovenDetail.density,
        // Decimal columns take strings through Drizzle.
        repeat: String(data.wovenDetail.repeat),
        extra: String(data.wovenDetail.extra ?? 0),
        sizeLabels: data.wovenDetail.sizeLabels ?? []
      });
    }
    return workOrderRepository.create({ ...header, productType: "printed" });
  }
  /**
   * Completes dispatch and moves the order to `dispatched`.
   *
   * DC Number, LC Number and FBR Invoice Number are all mandatory: they are the paperwork
   * proving the goods left the facility, and filling them in is precisely what the
   * `dispatched` status records. A `complete` order stays editable for exactly these
   * fields, which is how production handover works — production finishes the goods, the
   * office finishes the paperwork.
   *
   * Re-dispatching an already-dispatched order is allowed (correcting a typo'd DC number
   * shouldn't require unwinding the order), but production must have finished first.
   */
  async dispatchWorkOrder(id, data) {
    const existing = await workOrderRepository.findRawById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));
    if (existing.status !== "complete" && existing.status !== "dispatched") {
      throw new ApiError(
        "This order cannot be dispatched yet \u2014 production must finish it first (packaging complete)",
        400
      );
    }
    if (data.dispatchedQty > existing.totalQty) {
      throw new ApiError(
        `Dispatch quantity (${data.dispatchedQty}) cannot exceed the ordered quantity (${existing.totalQty})`,
        400
      );
    }
    const updated = await workOrderRepository.update(id, {
      dcNumber: data.dcNumber,
      lcNumber: data.lcNumber,
      fbrInvoiceNumber: data.fbrInvoiceNumber,
      dispatchedDate: data.dispatchedDate,
      dispatchedQty: data.dispatchedQty,
      ...data.imageUrl !== void 0 ? { imageUrl: data.imageUrl } : {},
      // Paperwork complete — this is the only place the status becomes `dispatched`.
      status: "dispatched"
    });
    const productionOrder = await productionOrderRepository.findByWorkOrderId(id);
    mailService.sendProductionCompletedEmail({
      productionNumber: productionOrder?.productionNumber || `SO-${existing.soNumber}`,
      soNumber: existing.soNumber,
      poNumber: existing.poNumber,
      totalQty: existing.totalQty
    }).catch((err) => {
      console.error("[WorkOrderService] Error sending dispatch email:", err);
    });
    return updated;
  }
  /**
   * Commercial fields only. **Status is never accepted from the client** — it is derived
   * from the production order (see production-order.repository.ts), so a `status` key in
   * the payload is ignored rather than honoured.
   *
   * A completed work order is locked apart from its dispatch paperwork: DC number and
   * dispatched date are recorded *after* production finishes it, so they have to stay
   * writable once it is complete.
   */
  async updateWorkOrder(id, data) {
    const existing = await workOrderRepository.findRawById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));
    const {
      dcNumber,
      lcNumber,
      fbrInvoiceNumber,
      dispatchedDate,
      dispatchedQty,
      wovenDetail,
      ...commercial
    } = data;
    if (wovenDetail && Object.keys(wovenDetail).length > 0) {
      if (existing.productType !== "woven") {
        throw new ApiError("Only a woven work order carries a design specification", 400);
      }
      if (wovenDetail.designCode) {
        const clash = await workOrderRepository.findByDesignCode(wovenDetail.designCode);
        if (clash && clash.workOrderId !== Number(id)) {
          throw new ConflictError(`Design code '${wovenDetail.designCode}' is already in use`);
        }
      }
      await workOrderRepository.upsertWovenDetail(Number(id), {
        ...wovenDetail.designCode !== void 0 ? { designCode: wovenDetail.designCode } : {},
        ...wovenDetail.pick !== void 0 ? { pick: wovenDetail.pick } : {},
        ...wovenDetail.density !== void 0 ? { density: wovenDetail.density } : {},
        ...wovenDetail.repeat !== void 0 ? { repeat: String(wovenDetail.repeat) } : {},
        ...wovenDetail.extra !== void 0 ? { extra: String(wovenDetail.extra) } : {},
        ...wovenDetail.sizeLabels !== void 0 ? { sizeLabels: wovenDetail.sizeLabels } : {}
      });
    }
    return workOrderRepository.update(id, {
      ...commercial,
      ...dcNumber !== void 0 ? { dcNumber } : {},
      ...lcNumber !== void 0 ? { lcNumber } : {},
      ...fbrInvoiceNumber !== void 0 ? { fbrInvoiceNumber } : {},
      ...dispatchedDate !== void 0 ? { dispatchedDate } : {},
      ...dispatchedQty !== void 0 ? { dispatchedQty } : {}
    });
  }
  async deleteWorkOrder(id) {
    const existing = await workOrderRepository.findRawById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));
    const productionOrder = await productionOrderRepository.findByWorkOrderId(id);
    if (productionOrder) {
      await productionOrderRepository.releaseOrderInventoryTransaction(Number(productionOrder.id));
    }
    await workOrderRepository.delete(id);
  }
};
var workOrderService = new WorkOrderService();

// src/api/controllers/work-order.controller.ts
var WorkOrderController = class {
  getWorkOrders = asyncHandler(async (req, res) => {
    const query = req.validatedQuery ?? req.query;
    const data = await workOrderService.getWorkOrders(query);
    res.json({ data });
  });
  getWorkOrder = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await workOrderService.getWorkOrder(id);
    res.json({ data });
  });
  createWorkOrder = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await workOrderService.createWorkOrder(input);
    res.status(201).json({ data });
  });
  updateWorkOrder = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.validatedParams ?? req.params;
      const input = req.validatedBody ?? req.body;
      const data = await workOrderService.updateWorkOrder(id, input);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });
  /** Completes dispatch. DC Number and LC Number are both mandatory (see the service). */
  dispatchWorkOrder = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await workOrderService.dispatchWorkOrder(id, input);
    res.json({ data });
  });
  deleteWorkOrder = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await workOrderService.deleteWorkOrder(id);
    res.status(204).send();
  });
};
var workOrderController = new WorkOrderController();

// src/api/repositories/production-run.repository.ts
import { and as and7, desc as desc4, eq as eq9, gte, isNull, sql as sql4 } from "drizzle-orm";
var ProductionRunRepository = class {
  /** Append-only: only ever inserts, never updates a prior run. */
  async create(data) {
    const [run] = await db.insert(productionRuns).values(data).returning();
    return run;
  }
  /** Full history for a sale order, newest first, with machine/operator/user names joined. */
  async findBySaleOrderId(saleOrderId) {
    return db.select({
      id: productionRuns.id,
      saleOrderId: productionRuns.saleOrderId,
      productId: productionRuns.productId,
      machineId: productionRuns.machineId,
      machineName: machines.machineName,
      operatorId: productionRuns.operatorId,
      operatorName: operators.name,
      quantityProduced: productionRuns.quantityProduced,
      runReason: productionRuns.runReason,
      notes: productionRuns.notes,
      producedAt: productionRuns.producedAt,
      createdBy: productionRuns.createdBy,
      createdByName: users.name,
      createdAt: productionRuns.createdAt
    }).from(productionRuns).leftJoin(machines, eq9(productionRuns.machineId, machines.id)).leftJoin(operators, eq9(productionRuns.operatorId, operators.id)).leftJoin(users, eq9(productionRuns.createdBy, users.id)).where(eq9(productionRuns.saleOrderId, saleOrderId)).orderBy(desc4(productionRuns.producedAt));
  }
  /** Derived Total Produced = SUM(quantity_produced) across every run. */
  async getTotalProduced(saleOrderId) {
    const [row] = await db.select({ total: sql4`coalesce(sum(${productionRuns.quantityProduced}), 0)` }).from(productionRuns).where(eq9(productionRuns.saleOrderId, saleOrderId));
    return Number(row?.total ?? 0);
  }
  async getMachineBreakdown(saleOrderId) {
    return db.select({
      machineId: productionRuns.machineId,
      machineName: machines.machineName,
      totalQuantity: sql4`coalesce(sum(${productionRuns.quantityProduced}), 0)`,
      runCount: sql4`cast(count(*) as int)`
    }).from(productionRuns).leftJoin(machines, eq9(productionRuns.machineId, machines.id)).where(eq9(productionRuns.saleOrderId, saleOrderId)).groupBy(productionRuns.machineId, machines.machineName);
  }
  async getOperatorBreakdown(saleOrderId) {
    return db.select({
      operatorId: productionRuns.operatorId,
      operatorName: operators.name,
      totalQuantity: sql4`coalesce(sum(${productionRuns.quantityProduced}), 0)`,
      runCount: sql4`cast(count(*) as int)`
    }).from(productionRuns).leftJoin(operators, eq9(productionRuns.operatorId, operators.id)).where(eq9(productionRuns.saleOrderId, saleOrderId)).groupBy(productionRuns.operatorId, operators.name);
  }
  async findByIdempotencyKey(key) {
    const [run] = await db.select().from(productionRuns).where(eq9(productionRuns.idempotencyKey, key)).limit(1);
    return run;
  }
  /**
   * A run with the same sale order / machine / operator / quantity created in the last
   * `windowMs` — the fingerprint of an accidental double-submit.
   */
  async findRecentDuplicate(params) {
    const since = new Date(Date.now() - (params.windowMs ?? 5e3));
    const [run] = await db.select().from(productionRuns).where(
      and7(
        eq9(productionRuns.saleOrderId, params.saleOrderId),
        params.machineId == null ? isNull(productionRuns.machineId) : eq9(productionRuns.machineId, params.machineId),
        params.operatorId == null ? isNull(productionRuns.operatorId) : eq9(productionRuns.operatorId, params.operatorId),
        eq9(productionRuns.quantityProduced, params.quantityProduced),
        gte(productionRuns.createdAt, since)
      )
    ).limit(1);
    return run;
  }
  /** Ordered quantity comes from the sale order (work_orders). */
  async getWorkOrder(saleOrderId) {
    const [wo] = await db.select().from(workOrders).where(eq9(workOrders.id, saleOrderId)).limit(1);
    return wo;
  }
};
var productionRunRepository = new ProductionRunRepository();

// src/api/services/production-run.service.ts
var ProductionRunService = class {
  /**
   * Append a production pass. Never updates a prior run — every call is one INSERT, so the
   * full production history is preserved. Duplicate-submit protection: an identical
   * `idempotencyKey` returns the existing run, and an identical sale-order/machine/operator/
   * quantity fingerprint within 5 seconds is rejected as an accidental double-submit.
   */
  async logProductionRun(saleOrderId, data) {
    const workOrder = await productionRunRepository.getWorkOrder(saleOrderId);
    if (!workOrder) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));
    if (data.idempotencyKey) {
      const existing = await productionRunRepository.findByIdempotencyKey(data.idempotencyKey);
      if (existing) return existing;
    }
    const quantityProduced = String(data.quantityProduced);
    const recentDuplicate = await productionRunRepository.findRecentDuplicate({
      saleOrderId,
      machineId: data.machineId ?? null,
      operatorId: data.operatorId ?? null,
      quantityProduced
    });
    if (recentDuplicate) {
      throw new BadRequestError(
        "An identical production run was just logged. If this is intentional, resubmit in a few seconds."
      );
    }
    return productionRunRepository.create({
      saleOrderId,
      productId: data.productId,
      machineId: data.machineId,
      operatorId: data.operatorId,
      quantityProduced,
      runReason: data.runReason,
      notes: data.notes,
      idempotencyKey: data.idempotencyKey,
      createdBy: data.createdBy
    });
  }
  /**
   * Production Summary for a sale order: ordered vs produced vs remaining, plus the full
   * append-only history and per-machine / per-operator breakdowns. All derived on query.
   */
  async getProductionSummary(saleOrderId) {
    const workOrder = await productionRunRepository.getWorkOrder(saleOrderId);
    if (!workOrder) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));
    const [totalProduced, history, machineHistory, operatorHistory] = await Promise.all([
      productionRunRepository.getTotalProduced(saleOrderId),
      productionRunRepository.findBySaleOrderId(saleOrderId),
      productionRunRepository.getMachineBreakdown(saleOrderId),
      productionRunRepository.getOperatorBreakdown(saleOrderId)
    ]);
    const orderedQuantity = Number(workOrder.totalQty);
    const remainingQuantity = orderedQuantity - totalProduced;
    return {
      saleOrderId,
      soNumber: workOrder.soNumber,
      orderedQuantity,
      totalProduced,
      remainingQuantity,
      history,
      machineHistory,
      operatorHistory
    };
  }
};
var productionRunService = new ProductionRunService();

// src/api/controllers/production-run.controller.ts
var ProductionRunController = class {
  logRun = asyncHandler(async (req, res) => {
    const { saleOrderId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionRunService.logProductionRun(Number(saleOrderId), input);
    res.status(201).json({ data });
  });
  getSummary = asyncHandler(async (req, res) => {
    const { saleOrderId } = req.validatedParams ?? req.params;
    const data = await productionRunService.getProductionSummary(Number(saleOrderId));
    res.json({ data });
  });
};
var productionRunController = new ProductionRunController();

// src/api/validations/work-orders.validation.ts
import { z as z12 } from "zod";
var artworkImageSchema = z12.string().trim().max(4e6, "Image is too large \u2014 keep it under about 3 MB").refine(
  (v) => v === "" || /^data:image\/[\w.+-]+;base64,/.test(v) || /^https?:\/\/.+/i.test(v),
  "Artwork must be an uploaded image or a valid image URL"
).optional();
var wovenDetailSchema = z12.object({
  designCode: z12.string().trim().min(1, "Design code is required"),
  pick: z12.coerce.number().int().positive("Pick must be greater than 0"),
  repeat: z12.coerce.number().positive("Repeat must be greater than 0"),
  density: z12.coerce.number().int().positive("Density must be greater than 0"),
  extra: z12.coerce.number().min(0, "Extra cannot be negative").optional(),
  /** Size labels woven on this order, e.g. ["10", "12", "XL", "34/34"]. */
  sizeLabels: z12.array(z12.string().trim().min(1)).optional()
});
var WORK_ORDER_PRIORITIES = ["normal", "urgent", "emergency"];
var WORK_ORDER_TYPES = ["normal order", "shortfall", "additional order", "recut order"];
var prioritySchema = z12.enum(WORK_ORDER_PRIORITIES).default("normal");
var orderTypeSchema = z12.enum(WORK_ORDER_TYPES).default("normal order");
var createWorkOrderSchema = z12.object({
  body: z12.object({
    soNumber: z12.string().min(1, "SO Number is required"),
    poNumber: z12.string().optional(),
    orderDate: z12.string().optional(),
    dueDate: z12.string().optional(),
    totalQty: z12.coerce.number().int().positive("Total quantity must be greater than 0"),
    brandId: z12.coerce.number().int().positive("Brand ID must be a positive integer").optional(),
    comment: z12.string().optional(),
    priority: prioritySchema,
    orderType: orderTypeSchema,
    /** Artwork image — uploaded file (base64 data URI) or external URL. */
    imageUrl: artworkImageSchema,
    productType: z12.enum(["printed", "woven"]).default("printed"),
    /** Required when `productType` is `woven`, rejected otherwise (see refine below). */
    wovenDetail: wovenDetailSchema.optional()
  }).refine((v) => v.productType !== "woven" || v.wovenDetail !== void 0, {
    message: "Woven work orders require the design specification (design code, pick, repeat, density)",
    path: ["wovenDetail"]
  })
});
var updateWorkOrderSchema = z12.object({
  body: z12.object({
    poNumber: z12.string().optional(),
    dueDate: z12.string().optional(),
    totalQty: z12.coerce.number().int().positive().optional(),
    brandId: z12.coerce.number().int().positive().optional(),
    comment: z12.string().optional(),
    priority: prioritySchema.optional(),
    orderType: orderTypeSchema.optional(),
    imageUrl: artworkImageSchema,
    // `status` and `productType` are deliberately absent: status is derived from the
    // production order, and a sales order cannot change which workflow it runs through.
    dcNumber: z12.string().optional(),
    lcNumber: z12.string().optional(),
    fbrInvoiceNumber: z12.string().optional(),
    dispatchedDate: z12.string().optional(),
    dispatchedQty: z12.coerce.number().int().positive().optional(),
    /** Loom spec edits for a woven order (only while it is still editable). */
    wovenDetail: wovenDetailSchema.partial().optional()
  })
});
var dispatchWorkOrderSchema = z12.object({
  body: z12.object({
    dcNumber: z12.string().trim().min(1, "DC Number is required to dispatch"),
    lcNumber: z12.string().trim().min(1, "LC Number is required to dispatch"),
    fbrInvoiceNumber: z12.string().trim().min(1, "FBR Invoice Number is required to dispatch"),
    dispatchedDate: z12.string().min(1, "Dispatch date is required"),
    dispatchedQty: z12.coerce.number().int().positive("Dispatch quantity must be greater than 0"),
    imageUrl: artworkImageSchema
  })
});

// src/api/validations/production-run.validation.ts
import { z as z13 } from "zod";
var RUN_REASONS = [
  "initial",
  "shortfall",
  "additional_order",
  "recut",
  "rework",
  "retry",
  "other"
];
var createProductionRunSchema = z13.object({
  body: z13.object({
    productId: z13.string().trim().max(150).optional(),
    machineId: z13.coerce.number().int().positive().optional(),
    operatorId: z13.coerce.number().int().positive().optional(),
    quantityProduced: z13.coerce.number().positive("Quantity produced must be greater than 0"),
    runReason: z13.enum(RUN_REASONS).default("initial"),
    notes: z13.string().max(1e3).optional(),
    idempotencyKey: z13.string().max(100).optional(),
    createdBy: z13.coerce.number().int().positive().optional()
  })
});
var saleOrderParamsSchema = z13.object({
  saleOrderId: z13.coerce.number().int().positive("A valid numeric sale order id is required")
});

// src/api/routes/work-orders.routes.ts
var router9 = Router10();
router9.get("/", validateQuery(listWorkOrdersQuerySchema), workOrderController.getWorkOrders);
router9.post("/", validateRequest(createWorkOrderSchema), workOrderController.createWorkOrder);
router9.get("/:id", validateParams(idParamsSchema), workOrderController.getWorkOrder);
router9.put("/:id", validateParams(idParamsSchema), validateRequest(updateWorkOrderSchema), workOrderController.updateWorkOrder);
router9.post(
  "/:id/dispatch",
  validateParams(idParamsSchema),
  validateRequest(dispatchWorkOrderSchema),
  workOrderController.dispatchWorkOrder
);
router9.delete("/:id", validateParams(idParamsSchema), workOrderController.deleteWorkOrder);
router9.get(
  "/:saleOrderId/production-summary",
  validateParams(saleOrderParamsSchema),
  productionRunController.getSummary
);
router9.post(
  "/:saleOrderId/production-runs",
  validateParams(saleOrderParamsSchema),
  validateRequest(createProductionRunSchema),
  productionRunController.logRun
);
var work_orders_routes_default = router9;

// src/api/routes/production-orders.routes.ts
import { Router as Router11 } from "express";

// src/api/repositories/inventory.repository.ts
import { eq as eq10, desc as desc5, asc as asc6, and as and8, sql as sql5 } from "drizzle-orm";
var InventoryRepository = class {
  /**
   * Credits/debits a material's received + balance, creating the ledger row if absent.
   *
   * Locks the ledger row `FOR UPDATE` before writing so concurrent reconciliations
   * serialise, and asserts the resulting balance is not negative — a purchase can't be
   * edited down or deleted below what production has already consumed. (This mirrors the
   * guard `drawStockTx` has always had on the issuance side; the purchase side was missing
   * it, which let stock silently go negative.)
   */
  async applyStockDeltaTx(tx, materialCode, deltaRolls) {
    if (deltaRolls === 0) return;
    const [existing] = await tx.select().from(inventoryRolls).where(eq10(inventoryRolls.materialCode, materialCode)).for("update");
    if (existing) {
      const [updated] = await tx.update(inventoryRolls).set({
        receivedRolls: sql5`${inventoryRolls.receivedRolls} + ${deltaRolls}`,
        balanceRolls: sql5`${inventoryRolls.balanceRolls} + ${deltaRolls}`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq10(inventoryRolls.materialCode, materialCode)).returning();
      if (!updated || Number(updated.balanceRolls) < 0) {
        throw new BadRequestError(
          `Cannot reduce ${materialCode} stock by ${-deltaRolls} rolls: it would drive the balance negative \u2014 rolls have already been issued to production`
        );
      }
    } else {
      if (deltaRolls < 0) {
        throw new BadRequestError(`No inventory ledger exists for ${materialCode} to reduce`);
      }
      await tx.insert(inventoryRolls).values({
        materialCode,
        openingStock: "0",
        receivedRolls: String(deltaRolls),
        issuedRolls: "0",
        balanceRolls: String(deltaRolls)
      });
    }
  }
  /** Inserts a purchase and credits its rolls into inventory, atomically. */
  async createPurchaseWithStock(data, adjustment) {
    return db.transaction(async (tx) => {
      const [report] = await tx.insert(purchaseRecords).values(data).returning();
      await this.applyStockDeltaTx(tx, adjustment.materialCode, adjustment.rolls);
      return report;
    });
  }
  /** Updates a purchase and reconciles inventory by the given stock deltas, atomically. */
  async updatePurchaseWithStock(id, data, adjustments) {
    return db.transaction(async (tx) => {
      const [report] = await tx.update(purchaseRecords).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(purchaseRecords.id, Number(id))).returning();
      for (const adj of adjustments) {
        await this.applyStockDeltaTx(tx, adj.materialCode, adj.rolls);
      }
      return report;
    });
  }
  /** Deletes a purchase and reverses its rolls out of inventory, atomically. */
  async deletePurchaseWithStock(id, adjustment) {
    return db.transaction(async (tx) => {
      await this.applyStockDeltaTx(tx, adjustment.materialCode, adjustment.rolls);
      await tx.delete(purchaseRecords).where(eq10(purchaseRecords.id, Number(id)));
    });
  }
  async findPurchaseById(id) {
    const [report] = await db.select().from(purchaseRecords).where(eq10(purchaseRecords.id, Number(id)));
    return report;
  }
  async findAllPurchases(filters) {
    const conditions = [];
    if (filters?.vendor) conditions.push(eq10(purchaseRecords.vendor, filters.vendor));
    if (filters?.materialCode) conditions.push(eq10(purchaseRecords.materialCode, filters.materialCode));
    if (filters?.startDate && filters?.endDate) {
      conditions.push(sql5`${purchaseRecords.reportDate} BETWEEN ${filters.startDate} AND ${filters.endDate}`);
    }
    return db.select().from(purchaseRecords).where(conditions.length > 0 ? and8(...conditions) : void 0).orderBy(desc5(purchaseRecords.reportDate));
  }
  async findInventoryRolls(filters) {
    const conditions = [];
    if (filters?.materialCode) conditions.push(eq10(inventoryRolls.materialCode, filters.materialCode));
    return db.select().from(inventoryRolls).where(conditions.length > 0 ? and8(...conditions) : void 0).orderBy(asc6(inventoryRolls.materialCode));
  }
  async findInventoryRollByMaterialCode(materialCode) {
    const [roll] = await db.select().from(inventoryRolls).where(eq10(inventoryRolls.materialCode, materialCode));
    return roll;
  }
  async updateInventoryRoll(materialCode, data) {
    const [roll] = await db.update(inventoryRolls).set(data).where(eq10(inventoryRolls.materialCode, materialCode)).returning();
    return roll;
  }
  async createInventoryRoll(data) {
    const [roll] = await db.insert(inventoryRolls).values(data).returning();
    return roll;
  }
};
var inventoryRepository = new InventoryRepository();

// src/api/services/production-order.helpers.ts
var RESOURCE_SLOTS = [
  { key: "printingMachineId", kind: "machine", label: "Printing machine" },
  { key: "cuttingMachineId", kind: "machine", label: "Cutting machine" },
  { key: "printingOperatorId", kind: "operator", label: "Printing operator" },
  { key: "cuttingOperatorId", kind: "operator", label: "Cutting operator" },
  { key: "packagingOperatorId", kind: "operator", label: "Packaging operator" }
];
function toNumbers(line) {
  return {
    quantity: Number(line.quantity),
    labelSize: Number(line.labelSize),
    rollLength: Number(line.rollLength),
    requiredRolls: Number(line.requiredRolls),
    extraRolls: Number(line.extraRolls),
    totalRolls: Number(line.totalRolls),
    issuedRolls: Number(line.issuedRolls),
    printedRolls: Number(line.printedRolls),
    sentToCuttingRolls: Number(line.sentToCuttingRolls),
    cutRolls: Number(line.cutRolls),
    sentToPackagingRolls: Number(line.sentToPackagingRolls),
    packagedRolls: Number(line.packagedRolls),
    packagedQty: Number(line.packagedQty)
  };
}
function missingStartRequirements(line) {
  const missing = [];
  if (!line.materialCode) missing.push("material");
  if (line.printingMachineId == null) missing.push("printing machine");
  if (line.printingOperatorId == null) missing.push("printing operator");
  return missing;
}
function missingCuttingRequirements(line) {
  const missing = [];
  if (line.cuttingMachineId == null) missing.push("cutting machine");
  if (line.cuttingOperatorId == null) missing.push("cutting operator");
  return missing;
}
function cascadeChain(chain) {
  const sentToCuttingRolls = Math.min(chain.sentToCuttingRolls, chain.printedRolls);
  const cutRolls = Math.min(chain.cutRolls, sentToCuttingRolls);
  const sentToPackagingRolls = Math.min(chain.sentToPackagingRolls, cutRolls);
  const packagedRolls = Math.min(chain.packagedRolls, sentToPackagingRolls);
  return {
    printedRolls: chain.printedRolls,
    sentToCuttingRolls,
    cutRolls,
    sentToPackagingRolls,
    packagedRolls
  };
}
function stageCompletionPatch(merged) {
  const n = toNumbers(merged);
  const done = (value) => n.totalRolls > 0 && value >= n.totalRolls;
  const stamp = (isDone, existing) => isDone ? existing ?? /* @__PURE__ */ new Date() : null;
  return {
    printingCompletedAt: stamp(done(n.printedRolls), merged.printingCompletedAt),
    cuttingCompletedAt: stamp(done(n.cutRolls), merged.cuttingCompletedAt),
    packagingCompletedAt: stamp(done(n.packagedRolls), merged.packagingCompletedAt)
  };
}
function hasAnyProgress(line) {
  const n = toNumbers(line);
  return n.printedRolls > 0 || n.sentToCuttingRolls > 0 || n.cutRolls > 0 || n.sentToPackagingRolls > 0 || n.packagedRolls > 0;
}
function deriveLineStatus(line) {
  const n = toNumbers(line);
  if (n.totalRolls > 0 && n.packagedRolls >= n.totalRolls) return "completed";
  return hasAnyProgress(line) ? "active" : "pending";
}
function deriveOrderPatch(lines, current) {
  if (current.status === "complete") {
    return {
      status: "complete",
      plannedAt: current.plannedAt ?? /* @__PURE__ */ new Date(),
      completedAt: current.completedAt ?? /* @__PURE__ */ new Date()
    };
  }
  if (lines.length === 0) return { status: "planned", plannedAt: null, completedAt: null };
  const plannedAt = current.plannedAt ?? /* @__PURE__ */ new Date();
  const anyStarted = lines.some(hasAnyProgress);
  return {
    status: anyStarted ? "production" : "planned",
    plannedAt,
    completedAt: null
  };
}

// src/api/services/production-order-overview.builder.ts
function nameOf(map, id) {
  return id != null ? map.get(id)?.name ?? null : null;
}
function avatarOf(map, id) {
  return id != null ? map.get(id)?.avatarUrl ?? null : null;
}
function buildProductionOverviewBody(rawLines, allMachines, allOperators, allMaterials, totalQty) {
  const machineById = new Map(allMachines.map((m) => [m.id, m]));
  const operatorById = new Map(allOperators.map((o) => [o.id, o]));
  const materialByCode = new Map(allMaterials.map((m) => [m.code, m]));
  const lines = rawLines.map((line) => {
    const n = toNumbers(line);
    const material = line.materialCode ? materialByCode.get(line.materialCode) : void 0;
    const missing = missingStartRequirements(line);
    return {
      id: line.id,
      labelType: line.labelType,
      status: line.status,
      notes: line.notes,
      /** Workflow steps 3-5 — production is blocked until this is empty. */
      readiness: { canStart: missing.length === 0, missing },
      planning: {
        quantity: n.quantity,
        labelSize: n.labelSize,
        rollLength: n.rollLength,
        requiredRolls: n.requiredRolls,
        extraRolls: n.extraRolls,
        totalRolls: n.totalRolls,
        totalWeight: line.totalWeight != null ? Number(line.totalWeight) : null
      },
      // Material detail is echoed back (not just the code) so the floor can verify the
      // right material was picked without cross-referencing the material master.
      material: {
        materialCode: line.materialCode,
        description: material?.description ?? null,
        materialType: material?.type ?? null,
        weightPerRoll: material ? Number(material.weightPerRoll) : null,
        /** Rolls drawn from inventory for this line — the manual "Assigned Rolls" figure. */
        assignedRolls: n.issuedRolls,
        issuedRolls: n.issuedRolls,
        /** Planned rolls not yet drawn from inventory. */
        pendingIssue: Math.max(n.totalRolls - n.issuedRolls, 0),
        /** Weight actually committed = assigned rolls x this material's weight per roll. */
        assignedWeight: material ? Number(material.weightPerRoll) * n.issuedRolls : null
      },
      // Each stage carries who did it, their avatar, and when it completed — together these
      // are the traceability record surfaced on a finished order.
      printing: {
        machineId: line.printingMachineId,
        machineName: nameOf(machineById, line.printingMachineId),
        operatorId: line.printingOperatorId,
        operatorName: nameOf(operatorById, line.printingOperatorId),
        operatorAvatarUrl: avatarOf(operatorById, line.printingOperatorId),
        printedRolls: n.printedRolls,
        progressPct: completionPct(n.printedRolls, n.totalRolls),
        completedAt: line.printingCompletedAt
      },
      cutting: {
        machineId: line.cuttingMachineId,
        machineName: nameOf(machineById, line.cuttingMachineId),
        operatorId: line.cuttingOperatorId,
        operatorName: nameOf(operatorById, line.cuttingOperatorId),
        operatorAvatarUrl: avatarOf(operatorById, line.cuttingOperatorId),
        sentToCuttingRolls: n.sentToCuttingRolls,
        cutRolls: n.cutRolls,
        progressPct: completionPct(n.cutRolls, n.totalRolls),
        completedAt: line.cuttingCompletedAt
      },
      packaging: {
        operatorId: line.packagingOperatorId,
        operatorName: nameOf(operatorById, line.packagingOperatorId),
        operatorAvatarUrl: avatarOf(operatorById, line.packagingOperatorId),
        sentToPackagingRolls: n.sentToPackagingRolls,
        packagedRolls: n.packagedRolls,
        packagedQty: n.packagedQty,
        progressPct: completionPct(n.packagedRolls, n.totalRolls),
        completedAt: line.packagingCompletedAt
      },
      liveProgress: {
        totalRolls: n.totalRolls,
        printedRolls: n.printedRolls,
        unprintedRolls: Math.max(n.totalRolls - n.printedRolls, 0),
        waitingForCutting: Math.max(n.printedRolls - n.sentToCuttingRolls, 0),
        sentToCuttingRolls: n.sentToCuttingRolls,
        cutRolls: n.cutRolls,
        inCuttingProcess: Math.max(n.sentToCuttingRolls - n.cutRolls, 0),
        waitingForPackaging: Math.max(n.cutRolls - n.sentToPackagingRolls, 0),
        sentToPackagingRolls: n.sentToPackagingRolls,
        packagedRolls: n.packagedRolls,
        inPackagingProcess: Math.max(n.sentToPackagingRolls - n.packagedRolls, 0),
        completionPct: completionPct(n.packagedRolls, n.totalRolls)
      }
    };
  });
  const sum = (pick) => rawLines.reduce((acc, l) => acc + pick(toNumbers(l)), 0);
  const totalRolls = sum((n) => n.totalRolls);
  const packagedRolls = sum((n) => n.packagedRolls);
  const plannedQty = sum((n) => n.quantity);
  const totals = {
    labelTypeCount: rawLines.length,
    plannedQty,
    unplannedQty: totalQty - plannedQty,
    packagedQty: sum((n) => n.packagedQty),
    requiredRolls: sum((n) => n.requiredRolls),
    extraRolls: sum((n) => n.extraRolls),
    totalRolls,
    totalWeight: rawLines.reduce((acc, l) => acc + (l.totalWeight != null ? Number(l.totalWeight) : 0), 0),
    assignedRolls: sum((n) => n.issuedRolls),
    assignedWeight: rawLines.reduce((acc, l) => {
      const material = l.materialCode ? materialByCode.get(l.materialCode) : void 0;
      return acc + (material ? Number(material.weightPerRoll) * Number(l.issuedRolls) : 0);
    }, 0),
    issuedRolls: sum((n) => n.issuedRolls),
    pendingIssue: sum((n) => Math.max(n.totalRolls - n.issuedRolls, 0)),
    printedRolls: sum((n) => n.printedRolls),
    unprintedRolls: sum((n) => Math.max(n.totalRolls - n.printedRolls, 0)),
    sentToCuttingRolls: sum((n) => n.sentToCuttingRolls),
    cutRolls: sum((n) => n.cutRolls),
    inCuttingProcess: sum((n) => Math.max(n.sentToCuttingRolls - n.cutRolls, 0)),
    sentToPackagingRolls: sum((n) => n.sentToPackagingRolls),
    packagedRolls,
    inPackagingProcess: sum((n) => Math.max(n.sentToPackagingRolls - n.packagedRolls, 0)),
    waitingForCutting: sum((n) => Math.max(n.printedRolls - n.sentToCuttingRolls, 0)),
    waitingForPackaging: sum((n) => Math.max(n.cutRolls - n.sentToPackagingRolls, 0)),
    completionPct: completionPct(packagedRolls, totalRolls)
  };
  return { lines, totals };
}

// src/api/services/production-order.service.ts
var ProductionOrderService = class {
  /* ============================ Reads ============================ */
  async getProductionOrders(filters) {
    return productionOrderRepository.findAll(filters);
  }
  async getProductionOrder(id) {
    const order = await productionOrderRepository.findById(id);
    if (!order) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));
    const lines = await productionOrderRepository.findLines(id);
    return { ...order, lines };
  }
  /** Submitted sales orders that do not yet have a production order — the Office Staff picklist. */
  async getEligibleSalesOrders() {
    return productionOrderRepository.findEligibleWorkOrders();
  }
  async getLineOrThrow(lineId) {
    const line = await productionOrderRepository.findLineById(lineId);
    if (!line) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER_LINE));
    return line;
  }
  async getOrderOrThrow(id) {
    const order = await productionOrderRepository.findRawById(id);
    if (!order) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));
    return order;
  }
  /* ============ Machine / operator locking ============ */
  /**
   * Machines and operators held by other active production lines, mapped to the label
   * type holding them so the error can say *where* the resource already is.
   */
  async getResourceLocks(exclude) {
    const rows = await productionOrderRepository.findResourceAssignments(exclude);
    const machines2 = /* @__PURE__ */ new Map();
    const operators2 = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const where = `${row.productionNumber} \xB7 ${row.labelType}`;
      for (const slot of RESOURCE_SLOTS) {
        const id = row[slot.key];
        if (id == null) continue;
        (slot.kind === "machine" ? machines2 : operators2).set(id, where);
      }
    }
    return { machines: machines2, operators: operators2 };
  }
  /**
   * Rejects an assignment that would put a machine or operator on two active jobs at
   * once. `assignments` is the merged (existing + patch) slot set for one line.
   */
  assertResourcesFree(assignments, locks) {
    for (const slot of RESOURCE_SLOTS) {
      const id = assignments[slot.key];
      if (id == null) continue;
      const heldBy = (slot.kind === "machine" ? locks.machines : locks.operators).get(id);
      if (heldBy) {
        throw new ApiError(`${slot.label} is already assigned to ${heldBy}`, 400);
      }
    }
  }
  /**
   * Machines and operators available to a line or an order — the free ones, plus
   * whatever the caller already holds (so its own current selection stays selectable).
   */
  async getAvailableResources(exclude, productType) {
    const [locks, allMachines, allOperators] = await Promise.all([
      this.getResourceLocks(exclude),
      machineRepository.findAll(),
      operatorRepository.findAll(productType ? { productType } : void 0)
    ]);
    return {
      machines: allMachines.filter((m) => !locks.machines.has(m.id)).map((m) => ({ id: m.id, name: m.machineName, machineType: m.machineType })),
      operators: allOperators.filter((o) => !locks.operators.has(o.id)).map((o) => ({ id: o.id, name: o.name, designation: o.designation })),
      lockedMachineIds: [...locks.machines.keys()],
      lockedOperatorIds: [...locks.operators.keys()]
    };
  }
  /* ==================== Phase 1: Office Staff ==================== */
  /**
   * Raises a production order against a submitted sales order. No planning happens
   * here — the order starts empty, carrying only the sales order link and its quantity.
   */
  async createProductionOrder(input) {
    const workOrder = await workOrderRepository.findRawById(input.workOrderId);
    if (!workOrder) throw new NotFoundError(Messages.notFound(Entity.WORK_ORDER));
    if (workOrder.status === "complete") {
      throw new ApiError("Cannot raise a production order against a completed work order", 400);
    }
    const existing = await productionOrderRepository.findByWorkOrderId(input.workOrderId);
    if (existing) {
      throw new ConflictError(`Sales order ${workOrder.soNumber} already has production order ${existing.productionNumber}`);
    }
    const createdByUserId = await userService.assertActor(input.createdByUserId);
    for (let attempt = 0; attempt < 5; attempt++) {
      const productionNumber = await this.nextProductionNumber();
      try {
        return await productionOrderRepository.createWithWorkOrderStatusTx({
          productionNumber,
          workOrderId: input.workOrderId,
          totalQty: workOrder.totalQty,
          notes: input.notes,
          createdByUserId
        });
      } catch (error) {
        if (error?.code !== "23505") throw error;
        if (String(error?.detail ?? "").includes("work_order_id")) {
          throw new ConflictError(
            `Sales order ${workOrder.soNumber} already has a production order`
          );
        }
        if (attempt === 4) throw error;
      }
    }
    throw new ApiError("Could not allocate a production number", 500);
  }
  async nextProductionNumber() {
    const last = await productionOrderRepository.findLastProductionNumber();
    const lastSeq = last ? Number(last.replace(/\D/g, "")) : 0;
    const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    return `PRD-${String(next).padStart(5, "0")}`;
  }
  async updateProductionOrder(id, data) {
    const order = await this.getOrderOrThrow(id);
    const patch = {};
    if (data.notes !== void 0) patch.notes = data.notes;
    if (data.status !== void 0) {
      patch.status = data.status;
      if (data.status === "complete") {
        patch.completedAt = order.completedAt ?? /* @__PURE__ */ new Date();
      } else {
        patch.completedAt = null;
      }
    }
    const updated = await productionOrderRepository.update(id, patch);
    if (!updated) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));
    if (data.status === "complete") {
      await this.notifyIfOrderCompleted(Number(id), "complete");
    }
    return updated;
  }
  /**
   * Deleting an order returns everything it was holding: the rolls it drew go back to
   * stock, its machines and operators are released with its lines, and the sales order
   * drops back to `initiate_production`. All of it in one transaction.
   */
  async deleteProductionOrder(id) {
    await this.getOrderOrThrow(id);
    await productionOrderRepository.releaseOrderInventoryTransaction(Number(id));
  }
  /* ============ Phase 2: Per-label-type planning ============ */
  /**
   * Planning happens **one label type at a time**. Each call creates a single planning
   * record and immediately reserves everything it needs — material (drawn from stock),
   * printing machine and printing operator — so the next label type cannot claim them.
   *
   * The reservation lasts until the line finishes production or is cancelled; there is
   * no separate release step.
   */
  async planLine(productionOrderId, input) {
    const order = await this.getOrderOrThrow(productionOrderId);
    if (order.status === "complete") {
      throw new ApiError("Cannot add a label type to a completed production order", 400);
    }
    const actorUserId = await userService.assertActor(input.actorUserId);
    const siblings = await productionOrderRepository.findLines(productionOrderId);
    const row = await this.buildPlanRow(order, input, siblings, null);
    return productionOrderRepository.createLinePlanTransaction(
      Number(productionOrderId),
      row,
      (lines) => deriveOrderPatch(lines, order),
      actorUserId
    );
  }
  /**
   * Re-plans one label type. Rejected once the line has recorded progress: the plan is
   * what that progress is measured against.
   */
  async updateLinePlan(lineId, input) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);
    const siblings = (await productionOrderRepository.findLines(line.productionOrderId)).filter(
      (l) => l.id !== line.id
    );
    const row = await this.buildPlanRow(order, input, siblings, line);
    return productionOrderRepository.updateLinePlanTransaction(
      Number(lineId),
      line.productionOrderId,
      row,
      (lines) => deriveOrderPatch(lines, order),
      actorUserId
    );
  }
  /**
   * Cancels one label type, releasing its rolls back to stock and freeing its machine
   * and operator for another job.
   */
  async deleteLine(lineId) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    if (hasAnyProgress(line)) {
      throw new ApiError(
        `Cannot cancel '${line.labelType}': production progress has already been recorded against it`,
        400
      );
    }
    await productionOrderRepository.deleteLineTransaction(
      Number(lineId),
      line.productionOrderId,
      (lines) => deriveOrderPatch(lines, order)
    );
  }
  async reconcileLine(lineId, data) {
    await this.getLineOrThrow(lineId);
    return productionOrderRepository.reconcileLineStockTransaction(Number(lineId), data);
  }
  /**
   * Validates one label type against its order and siblings, and derives the three
   * server-calculated planning figures. `current` is the line being re-planned (so its
   * own quantity, resources and stock draw are excluded from the contention checks).
   */
  async buildPlanRow(order, input, siblings, current) {
    const labelType = input.labelType.trim();
    if (!labelType) throw new ApiError("Label type is required", 400);
    if (!(input.quantity > 0)) {
      throw new ApiError(`Quantity for '${labelType}' must be greater than zero`, 400);
    }
    if (!(input.labelSize > 0)) {
      throw new ApiError(`Label size for '${labelType}' must be greater than zero`, 400);
    }
    if (input.extraRolls !== void 0 && input.extraRolls < 0) {
      throw new ApiError(`Extra rolls for '${labelType}' cannot be negative`, 400);
    }
    if (siblings.some((l) => l.labelType.trim().toLowerCase() === labelType.toLowerCase())) {
      throw new ApiError(`'${labelType}' is already planned on this production order`, 400);
    }
    const plannedElsewhere = siblings.reduce((sum, l) => sum + Number(l.quantity), 0);
    if (plannedElsewhere + input.quantity > order.totalQty) {
      const remaining = order.totalQty - plannedElsewhere;
      throw new ApiError(
        `Quantity ${input.quantity} over-allocates the order: ${remaining} of ${order.totalQty} still unplanned`,
        400
      );
    }
    if (!input.materialCode) throw new ApiError(`Select a material for '${labelType}'`, 400);
    if (input.printingMachineId == null) {
      throw new ApiError(`Select a printing machine for '${labelType}'`, 400);
    }
    if (input.printingOperatorId == null) {
      throw new ApiError(`Select a printing operator for '${labelType}'`, 400);
    }
    const material = await materialRepository.findByCode(input.materialCode);
    if (!material) throw new NotFoundError(`Material with code '${input.materialCode}' not found`);
    const assignedRollsInput = input.assignedRolls ?? 0;
    if (assignedRollsInput < 0) {
      throw new ApiError(`Assigned rolls for '${labelType}' cannot be negative`, 400);
    }
    const rollLength = input.rollLength && input.rollLength > 0 ? input.rollLength : DEFAULT_ROLL_LENGTH_M;
    const requiredRolls = calculateRequiredRolls(input.quantity, input.labelSize, rollLength);
    const extraRolls = input.extraRolls ?? 0;
    const calculatedTotalRolls = calculateTotalRolls(requiredRolls, extraRolls);
    const assignedRolls = assignedRollsInput > 0 ? assignedRollsInput : calculatedTotalRolls;
    const totalRolls = assignedRolls;
    const totalWeight = calculateTotalWeight(Number(material.weightPerRoll), totalRolls);
    const stock = await inventoryRepository.findInventoryRollByMaterialCode(input.materialCode);
    const releasing = current && current.materialCode === input.materialCode ? Number(current.issuedRolls) : 0;
    const available = stock ? Number(stock.balanceRolls) + releasing : 0;
    if (assignedRolls > available) {
      throw new ApiError(
        `Cannot assign ${assignedRolls} rolls of ${input.materialCode}: only ${available} available in inventory stock`,
        400
      );
    }
    const locks = await this.getResourceLocks(current ? { lineId: current.id } : void 0);
    this.assertResourcesFree(
      { printingMachineId: input.printingMachineId, printingOperatorId: input.printingOperatorId },
      locks
    );
    return {
      labelType,
      quantity: String(input.quantity),
      labelSize: String(input.labelSize),
      rollLength: String(rollLength),
      requiredRolls: String(requiredRolls),
      extraRolls: String(extraRolls),
      totalRolls: String(totalRolls),
      totalWeight: String(totalWeight),
      materialCode: input.materialCode,
      printingMachineId: input.printingMachineId,
      printingOperatorId: input.printingOperatorId,
      notes: input.notes,
      assignedRolls
    };
  }
  /* ============ Phases 4, 6 & 8: Resource assignment ============ */
  /** Assigns the machine and operator for one stage. Packaging has an operator but no machine. */
  async assignLineResources(lineId, input) {
    const line = await this.getLineOrThrow(lineId);
    const actorUserId = await userService.assertActor(input.actorUserId);
    if (input.stage === "packaging" && input.machineId != null) {
      throw new ApiError("Packaging is performed without a machine", 400);
    }
    if (input.machineId != null) {
      const machine = await machineRepository.findById(input.machineId);
      if (!machine) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    }
    if (input.operatorId != null) {
      const operator = await operatorRepository.findById(input.operatorId);
      if (!operator) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    }
    const locks = await this.getResourceLocks({ lineId: Number(lineId) });
    const machineKey = input.stage === "cutting" ? "cuttingMachineId" : "printingMachineId";
    const operatorKey = input.stage === "printing" ? "printingOperatorId" : input.stage === "cutting" ? "cuttingOperatorId" : "packagingOperatorId";
    this.assertResourcesFree({ [machineKey]: input.machineId, [operatorKey]: input.operatorId }, locks);
    const patch = {};
    if (input.stage === "printing") {
      if (input.machineId !== void 0) patch.printingMachineId = input.machineId;
      if (input.operatorId !== void 0) patch.printingOperatorId = input.operatorId;
    } else if (input.stage === "cutting") {
      if (input.machineId !== void 0) patch.cuttingMachineId = input.machineId;
      if (input.operatorId !== void 0) patch.cuttingOperatorId = input.operatorId;
    } else {
      if (input.operatorId !== void 0) patch.packagingOperatorId = input.operatorId;
    }
    if (Object.keys(patch).length === 0) return line;
    const order = await this.getOrderOrThrow(line.productionOrderId);
    return productionOrderRepository.applyLineChangeTransaction(
      Number(lineId),
      // Assignment-only edit: the patch is built from `input`, not from the line's counters,
      // so there is nothing to recompute against the locked row.
      () => ({
        linePatch: patch,
        event: { eventType: "assignment", actorUserId, note: `Assigned ${input.stage} resources` }
      }),
      (lines) => deriveOrderPatch(lines, order)
    );
  }
  /* ============ Phases 4, 6 & 8: Cumulative progress ============ */
  /**
   * Sets a stage's cumulative completed-roll count to an absolute value.
   *
   * Each stage is bounded above by what has been handed to it and below by what it has
   * already handed on, which is what lets the three stages run at the same time without
   * one being able to invalidate another:
   *
   *   sentToCutting <= printed <= totalRolls
   *   sentToPackaging <= cut <= sentToCutting
   *   packaged <= sentToPackaging
   */
  async updateStageProgress(lineId, stage, input) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);
    if (input.completed < 0) {
      throw new ApiError("Completed rolls cannot be negative", 400);
    }
    const missing = missingStartRequirements(line);
    if (missing.length > 0) {
      throw new ApiError(
        `Production cannot start on '${line.labelType}' until a ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} assigned`,
        400
      );
    }
    const updatedLine = await productionOrderRepository.applyLineChangeTransaction(
      Number(lineId),
      // Computed against the locked row so a concurrent edit to this line can't be lost.
      (freshLine) => {
        const n = toNumbers(freshLine);
        const requested = { ...n };
        let previousValue;
        if (stage === "printing") {
          previousValue = n.printedRolls;
          if (input.completed > n.totalRolls) {
            throw new ApiError(`Printed rolls (${input.completed}) cannot exceed total rolls (${n.totalRolls})`, 400);
          }
          requested.printedRolls = input.completed;
        } else if (stage === "cutting") {
          previousValue = n.cutRolls;
          const missingCut = missingCuttingRequirements(freshLine);
          if (missingCut.length > 0) {
            throw new ApiError(
              `Cutting progress cannot be recorded on '${freshLine.labelType}' until a ${missingCut.join(" and ")} ${missingCut.length > 1 ? "are" : "is"} assigned`,
              400
            );
          }
          if (input.completed > n.sentToCuttingRolls) {
            throw new ApiError(
              `Cut rolls (${input.completed}) cannot exceed the ${n.sentToCuttingRolls} sent to cutting`,
              400
            );
          }
          requested.cutRolls = input.completed;
        } else {
          previousValue = n.packagedRolls;
          if (input.completed > n.sentToPackagingRolls) {
            throw new ApiError(
              `Packaged rolls (${input.completed}) cannot exceed the ${n.sentToPackagingRolls} sent to packaging`,
              400
            );
          }
          requested.packagedRolls = input.completed;
        }
        const cascaded = cascadeChain(requested);
        const patch = {};
        if (cascaded.printedRolls !== n.printedRolls) patch.printedRolls = String(cascaded.printedRolls);
        if (cascaded.sentToCuttingRolls !== n.sentToCuttingRolls) patch.sentToCuttingRolls = String(cascaded.sentToCuttingRolls);
        if (cascaded.cutRolls !== n.cutRolls) patch.cutRolls = String(cascaded.cutRolls);
        if (cascaded.sentToPackagingRolls !== n.sentToPackagingRolls) patch.sentToPackagingRolls = String(cascaded.sentToPackagingRolls);
        if (cascaded.packagedRolls !== n.packagedRolls) patch.packagedRolls = String(cascaded.packagedRolls);
        if (stage === "packaging" && input.packagedQty !== void 0) {
          if (input.packagedQty < 0) {
            throw new ApiError("Packaged quantity cannot be negative", 400);
          }
          if (input.packagedQty > n.quantity) {
            throw new ApiError(
              `Packaged quantity (${input.packagedQty}) cannot exceed the planned quantity (${n.quantity})`,
              400
            );
          }
          patch.packagedQty = String(input.packagedQty);
        }
        const mergedLine = { ...freshLine, ...patch };
        patch.status = deriveLineStatus(mergedLine);
        Object.assign(patch, stageCompletionPatch(mergedLine));
        return {
          linePatch: patch,
          event: {
            eventType: `${stage}_progress`,
            previousValue: String(previousValue),
            newValue: String(input.completed),
            delta: String(input.completed - previousValue),
            actorUserId,
            note: input.note
          }
        };
      },
      (lines) => deriveOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return updatedLine;
  }
  /* ============ Phases 5 & 7: Manual stage transfers ============ */
  /**
   * Hands a batch of finished rolls to the next stage. Transfers are deltas, not
   * absolutes — the manager moves "4 more rolls", and the running total is what the
   * downstream stage is then allowed to work through.
   */
  async transferRolls(lineId, input) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);
    if (!(input.rolls > 0)) {
      throw new ApiError("Transfer quantity must be greater than zero", 400);
    }
    const updatedLine = await productionOrderRepository.applyLineChangeTransaction(
      Number(lineId),
      // The delta is applied to the locked row's current total, so two concurrent transfers
      // add up instead of one overwriting the other.
      (freshLine) => {
        const n = toNumbers(freshLine);
        const patch = {};
        let previousValue;
        let newValue;
        if (input.target === "cutting") {
          previousValue = n.sentToCuttingRolls;
          newValue = previousValue + input.rolls;
          const missingCut = missingCuttingRequirements(freshLine);
          if (missingCut.length > 0) {
            throw new ApiError(
              `Cannot send rolls to cutting on '${freshLine.labelType}' until a ${missingCut.join(" and ")} ${missingCut.length > 1 ? "are" : "is"} assigned`,
              400
            );
          }
          if (newValue > n.printedRolls) {
            const available = n.printedRolls - previousValue;
            throw new ApiError(
              `Cannot send ${input.rolls} rolls to cutting: only ${available} of the ${n.printedRolls} printed rolls are still waiting to be transferred`,
              400
            );
          }
          patch.sentToCuttingRolls = String(newValue);
        } else {
          previousValue = n.sentToPackagingRolls;
          newValue = previousValue + input.rolls;
          if (newValue > n.cutRolls) {
            const available = n.cutRolls - previousValue;
            throw new ApiError(
              `Cannot send ${input.rolls} rolls to packaging: only ${available} of the ${n.cutRolls} cut rolls are still waiting to be transferred`,
              400
            );
          }
          patch.sentToPackagingRolls = String(newValue);
        }
        const mergedLine = { ...freshLine, ...patch };
        patch.status = deriveLineStatus(mergedLine);
        Object.assign(patch, stageCompletionPatch(mergedLine));
        return {
          linePatch: patch,
          event: {
            eventType: input.target === "cutting" ? "transfer_to_cutting" : "transfer_to_packaging",
            previousValue: String(previousValue),
            newValue: String(newValue),
            delta: String(input.rolls),
            actorUserId,
            note: input.note
          }
        };
      },
      (lines) => deriveOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return updatedLine;
  }
  /* ============ Inline row editing (Production Progress table) ============ */
  /**
   * Applies a full row edit from the inline Production Progress table: any subset of
   * the five roll counters, the packaged label quantity, and the five machine/operator
   * assignments, all in one atomic save. Every provided counter is an absolute value,
   * merged with whatever wasn't sent, then validated as one consistent chain:
   *
   *   printed <= totalRolls
   *   sentToCutting <= printed
   *   cut <= sentToCutting
   *   sentToPackaging <= cut
   *   packaged <= sentToPackaging
   *
   * Unlike `updateStageProgress` (which only touches one stage and so also needs a
   * lower bound against whatever is already downstream), this touches the whole chain
   * in one transaction, so only the upper-bound checks above are needed — there's no
   * "other stage" left stale to fall out of sync with.
   */
  async updateLineFull(lineId, input) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);
    const touchesProgress = input.printedRolls !== void 0 || input.sentToCuttingRolls !== void 0 || input.cutRolls !== void 0 || input.sentToPackagingRolls !== void 0 || input.packagedRolls !== void 0 || input.packagedQty !== void 0;
    if (touchesProgress) {
      const merged = {
        ...line,
        materialCode: input.materialCode ?? line.materialCode,
        printingMachineId: input.printingMachineId !== void 0 ? input.printingMachineId : line.printingMachineId,
        printingOperatorId: input.printingOperatorId !== void 0 ? input.printingOperatorId : line.printingOperatorId
      };
      const missing = missingStartRequirements(merged);
      if (missing.length > 0) {
        throw new ApiError(
          `Production cannot start on '${line.labelType}' until a ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} assigned`,
          400
        );
      }
      const effectiveCuttingMachine = input.cuttingMachineId !== void 0 ? input.cuttingMachineId : line.cuttingMachineId;
      const effectiveCuttingOperator = input.cuttingOperatorId !== void 0 ? input.cuttingOperatorId : line.cuttingOperatorId;
      const isCuttingActive = input.sentToCuttingRolls !== void 0 && input.sentToCuttingRolls > 0 || input.cutRolls !== void 0 && input.cutRolls > 0 || Number(line.sentToCuttingRolls) > 0 || Number(line.cutRolls) > 0;
      if (isCuttingActive) {
        const missingCut = missingCuttingRequirements({
          cuttingMachineId: effectiveCuttingMachine,
          cuttingOperatorId: effectiveCuttingOperator
        });
        if (missingCut.length > 0) {
          throw new ApiError(
            `Cutting cannot proceed on '${line.labelType}' until a ${missingCut.join(" and ")} ${missingCut.length > 1 ? "are" : "is"} assigned`,
            400
          );
        }
      }
    }
    const machineIds = [input.printingMachineId, input.cuttingMachineId].filter(
      (id) => id != null
    );
    const operatorIds = [
      input.printingOperatorId,
      input.cuttingOperatorId,
      input.packagingOperatorId
    ].filter((id) => id != null);
    const [machines2, operators2] = await Promise.all([
      Promise.all(machineIds.map((id) => machineRepository.findById(id))),
      Promise.all(operatorIds.map((id) => operatorRepository.findById(id)))
    ]);
    if (machines2.some((m) => !m)) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    if (operators2.some((o) => !o)) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    this.assertResourcesFree(
      {
        printingMachineId: input.printingMachineId,
        printingOperatorId: input.printingOperatorId,
        cuttingMachineId: input.cuttingMachineId,
        cuttingOperatorId: input.cuttingOperatorId,
        packagingOperatorId: input.packagingOperatorId
      },
      await this.getResourceLocks({ lineId: Number(lineId) })
    );
    const buildRowPatch = (src) => {
      const n = toNumbers(src);
      const requested = {
        printedRolls: input.printedRolls ?? n.printedRolls,
        sentToCuttingRolls: input.sentToCuttingRolls ?? n.sentToCuttingRolls,
        cutRolls: input.cutRolls ?? n.cutRolls,
        sentToPackagingRolls: input.sentToPackagingRolls ?? n.sentToPackagingRolls,
        packagedRolls: input.packagedRolls ?? n.packagedRolls
      };
      if (requested.printedRolls > n.totalRolls) {
        throw new ApiError(`Printed (${requested.printedRolls}) cannot exceed total rolls (${n.totalRolls})`, 400);
      }
      if (input.sentToCuttingRolls !== void 0 && input.sentToCuttingRolls > requested.printedRolls) {
        throw new ApiError(`Cutting (${input.sentToCuttingRolls}) cannot exceed printed (${requested.printedRolls})`, 400);
      }
      if (input.cutRolls !== void 0 && input.cutRolls > requested.sentToCuttingRolls) {
        throw new ApiError(`Cutted (${input.cutRolls}) cannot exceed cutting (${requested.sentToCuttingRolls})`, 400);
      }
      if (input.sentToPackagingRolls !== void 0 && input.sentToPackagingRolls > requested.cutRolls) {
        throw new ApiError(
          `Packaging (${input.sentToPackagingRolls}) cannot exceed cutted (${requested.cutRolls})`,
          400
        );
      }
      if (input.packagedRolls !== void 0 && input.packagedRolls > requested.sentToPackagingRolls) {
        throw new ApiError(
          `Packaged (${input.packagedRolls}) cannot exceed packaging (${requested.sentToPackagingRolls})`,
          400
        );
      }
      const merged = { ...cascadeChain(requested), packagedQty: input.packagedQty ?? n.packagedQty };
      if (merged.packagedQty > n.quantity) {
        throw new ApiError(
          `Packaged quantity (${merged.packagedQty}) cannot exceed the planned quantity (${n.quantity})`,
          400
        );
      }
      const patch = {};
      if (merged.printedRolls !== n.printedRolls) patch.printedRolls = String(merged.printedRolls);
      if (merged.sentToCuttingRolls !== n.sentToCuttingRolls) patch.sentToCuttingRolls = String(merged.sentToCuttingRolls);
      if (merged.cutRolls !== n.cutRolls) patch.cutRolls = String(merged.cutRolls);
      if (merged.sentToPackagingRolls !== n.sentToPackagingRolls) patch.sentToPackagingRolls = String(merged.sentToPackagingRolls);
      if (merged.packagedRolls !== n.packagedRolls) patch.packagedRolls = String(merged.packagedRolls);
      if (input.packagedQty !== void 0) patch.packagedQty = String(merged.packagedQty);
      if (input.materialCode !== void 0) patch.materialCode = input.materialCode;
      if (input.printingMachineId !== void 0) patch.printingMachineId = input.printingMachineId;
      if (input.printingOperatorId !== void 0) patch.printingOperatorId = input.printingOperatorId;
      if (input.cuttingMachineId !== void 0) patch.cuttingMachineId = input.cuttingMachineId;
      if (input.cuttingOperatorId !== void 0) patch.cuttingOperatorId = input.cuttingOperatorId;
      if (input.packagingOperatorId !== void 0) patch.packagingOperatorId = input.packagingOperatorId;
      if (input.status !== void 0) patch.status = input.status;
      return patch;
    };
    if (Object.keys(buildRowPatch(line)).length === 0) return line;
    const updatedLine = await productionOrderRepository.applyLineChangeTransaction(
      Number(lineId),
      (freshLine) => {
        const patch = buildRowPatch(freshLine);
        const mergedLine = { ...freshLine, ...patch };
        patch.status = input.status ?? deriveLineStatus(mergedLine);
        Object.assign(patch, stageCompletionPatch(mergedLine));
        return {
          linePatch: patch,
          event: {
            eventType: "row_update",
            actorUserId,
            note: input.note ?? "Row edited via Production Progress table"
          }
        };
      },
      (lines) => deriveOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return updatedLine;
  }
  /* ============ Material issuance from inventory ============ */
  /**
   * Issues raw material rolls from inventory to a production line.
   *
   * Two guards, mirroring the physical constraints: you cannot issue more than is
   * actually in stock, and you cannot issue more than the line was planned to consume
   * (`totalRolls`, i.e. required + extra).
   */
  async issueRolls(lineId, input) {
    const line = await this.getLineOrThrow(lineId);
    await this.getOrderOrThrow(line.productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);
    if (!(input.rolls > 0)) {
      throw new ApiError("Issued rolls must be greater than zero", 400);
    }
    const materialCode = input.materialCode ?? line.materialCode ?? void 0;
    if (!materialCode) {
      throw new ApiError(
        "This label type has no material assigned. Set a material on the production plan before issuing rolls.",
        400
      );
    }
    const material = await materialRepository.findByCode(materialCode);
    if (!material) throw new NotFoundError(`Material with code '${materialCode}' not found`);
    const stock = await inventoryRepository.findInventoryRollByMaterialCode(materialCode);
    if (!stock) throw new NotFoundError(`No inventory record for material '${materialCode}'`);
    const balance = Number(stock.balanceRolls);
    if (input.rolls > balance) {
      throw new ApiError(
        `Cannot issue ${input.rolls} rolls of ${materialCode}: only ${balance} in stock`,
        400
      );
    }
    const n = toNumbers(line);
    if (n.totalRolls > 0 && n.issuedRolls + input.rolls > n.totalRolls) {
      const remaining = Math.max(n.totalRolls - n.issuedRolls, 0);
      throw new ApiError(
        `Cannot issue ${input.rolls} rolls: this label type needs ${n.totalRolls} in total and ${n.issuedRolls} have already been issued (${remaining} remaining)`,
        400
      );
    }
    await productionOrderRepository.issueRollsTransaction(
      Number(lineId),
      materialCode,
      input.rolls,
      input.note,
      actorUserId
    );
    if (!line.materialCode) {
      await productionOrderRepository.updateLine(lineId, { materialCode });
    }
    return this.getLineOrThrow(lineId);
  }
  async getLineIssuances(lineId, opts) {
    await this.getLineOrThrow(lineId);
    return productionOrderRepository.findLineIssuances(lineId, opts);
  }
  /* ============ Audit trail ============ */
  async getLineEvents(lineId, opts) {
    await this.getLineOrThrow(lineId);
    return productionOrderRepository.findLineEvents(lineId, opts);
  }
  async getOrderEvents(id, opts) {
    await this.getOrderOrThrow(id);
    return productionOrderRepository.findOrderEvents(id, opts);
  }
  /* ============ Production Manager dashboard ============ */
  /**
   * Everything the manager dashboard renders, in one round trip: order header,
   * per-label-type planning/assignment/live-progress detail, and order rollups.
   */
  async getProductionOrderOverview(id) {
    const order = await productionOrderRepository.findById(id);
    if (!order) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));
    const rawLines = await productionOrderRepository.findLines(id);
    const [allMachines, allOperators, allMaterials] = await Promise.all([
      machineRepository.findAll({ includeInactive: true }),
      operatorRepository.findAll({ includeInactive: true }),
      materialRepository.findAll()
    ]);
    const { lines, totals } = buildProductionOverviewBody(
      rawLines,
      allMachines,
      allOperators,
      allMaterials,
      order.totalQty
    );
    return {
      productionOrder: {
        id: order.id,
        productionNumber: order.productionNumber,
        workOrderId: order.workOrderId,
        soNumber: order.soNumber,
        poNumber: order.poNumber,
        // The customer is the company that owns the brand — the schema has no separate
        // customer entity, so both fields resolve to the same company name.
        companyId: order.companyId,
        companyName: order.companyName,
        customer: order.companyName,
        productType: order.productType,
        brandId: order.brandId,
        brandName: order.brandName,
        totalQty: order.totalQty,
        status: order.status,
        orderDate: order.orderDate,
        dueDate: order.dueDate,
        notes: order.notes,
        plannedAt: order.plannedAt,
        completedAt: order.completedAt,
        createdAt: order.createdAt
      },
      lines,
      totals
    };
  }
  async notifyIfOrderCompleted(productionOrderId, previousStatus) {
    if (previousStatus === "complete") return;
    try {
      const updatedOrder = await productionOrderRepository.findById(productionOrderId);
      if (updatedOrder && updatedOrder.status === "complete") {
        mailService.sendProductionCompletedEmail({
          productionNumber: updatedOrder.productionNumber,
          soNumber: updatedOrder.soNumber,
          poNumber: updatedOrder.poNumber,
          companyName: updatedOrder.companyName,
          brandName: updatedOrder.brandName,
          totalQty: updatedOrder.totalQty,
          completedAt: updatedOrder.completedAt
        }).catch((err) => {
          console.error("[ProductionOrderService] Error sending completion email:", err);
        });
      }
    } catch (err) {
      console.error("[ProductionOrderService] Failed to check completion status for email notification:", err);
    }
  }
};
var productionOrderService = new ProductionOrderService();

// src/api/controllers/production-order.controller.ts
var ProductionOrderController = class {
  getProductionOrders = asyncHandler(async (req, res) => {
    const { status, soNumber, poNumber } = req.validatedQuery ?? req.query;
    const data = await productionOrderService.getProductionOrders({ status, soNumber, poNumber });
    res.json({ data });
  });
  getEligibleSalesOrders = asyncHandler(async (_req, res) => {
    const data = await productionOrderService.getEligibleSalesOrders();
    res.json({ data });
  });
  getProductionOrder = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await productionOrderService.getProductionOrder(id);
    res.json({ data });
  });
  getProductionOrderOverview = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await productionOrderService.getProductionOrderOverview(id);
    res.json({ data });
  });
  /**
   * Machines and operators not already held by another active job. `excludeLineId` /
   * `excludeOrderId` keep the caller's own current selection in the list, so editing a
   * line doesn't blank out the resource it already has.
   */
  getAvailableResources = asyncHandler(async (req, res) => {
    const { lineId, orderId, productType } = req.validatedQuery ?? req.query;
    const data = await productionOrderService.getAvailableResources(
      {
        lineId: lineId ? Number(lineId) : void 0,
        productionOrderId: orderId ? Number(orderId) : void 0
      },
      productType
    );
    res.json({ data });
  });
  createProductionOrder = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.createProductionOrder(input);
    res.status(201).json({ data });
  });
  updateProductionOrder = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.updateProductionOrder(id, input);
    res.json({ data });
  });
  deleteProductionOrder = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await productionOrderService.deleteProductionOrder(id);
    res.status(204).send();
  });
  /* --- Per-label-type planning. One record at a time; submitting reserves resources. --- */
  planLine = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.planLine(id, input);
    res.status(201).json({ data });
  });
  updateLinePlan = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.updateLinePlan(lineId, input);
    res.json({ data });
  });
  deleteLine = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    await productionOrderService.deleteLine(lineId);
    res.status(204).send();
  });
  assignLineResources = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.assignLineResources(lineId, input);
    res.json({ data });
  });
  updatePrintingProgress = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.updateStageProgress(lineId, "printing", input);
    res.json({ data });
  });
  updateCuttingProgress = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.updateStageProgress(lineId, "cutting", input);
    res.json({ data });
  });
  updatePackagingProgress = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.updateStageProgress(lineId, "packaging", input);
    res.json({ data });
  });
  updateLineFull = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.updateLineFull(lineId, input);
    res.json({ data });
  });
  transferRolls = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.transferRolls(lineId, input);
    res.status(201).json({ data });
  });
  issueRolls = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.issueRolls(lineId, input);
    res.status(201).json({ data });
  });
  getLineIssuances = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const page = req.validatedQuery ?? {};
    const data = await productionOrderService.getLineIssuances(lineId, page);
    res.json({ data });
  });
  getLineEvents = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const page = req.validatedQuery ?? {};
    const data = await productionOrderService.getLineEvents(lineId, page);
    res.json({ data });
  });
  getOrderEvents = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const page = req.validatedQuery ?? {};
    const data = await productionOrderService.getOrderEvents(id, page);
    res.json({ data });
  });
  reconcileLine = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await productionOrderService.reconcileLine(lineId, input);
    res.json({ data });
  });
};
var productionOrderController = new ProductionOrderController();

// src/api/validations/production-orders.validation.ts
import { z as z14 } from "zod";
var planLineSchema = z14.object({
  labelType: z14.string().trim().min(1, "Label type is required"),
  quantity: z14.coerce.number().positive("Quantity must be greater than zero"),
  labelSize: z14.coerce.number().positive("Label size must be greater than zero"),
  rollLength: z14.coerce.number().positive("Roll length must be greater than zero").optional(),
  extraRolls: z14.coerce.number().min(0, "Extra rolls cannot be negative").optional(),
  /* Reserved on submit, so all three are required — see production-order.service.ts. */
  materialCode: z14.string().trim().min(1, "Material is required"),
  /** Manual figure — the rolls drawn from inventory for this label type on save. */
  assignedRolls: z14.coerce.number().min(0, "Assigned rolls cannot be negative").optional(),
  printingMachineId: z14.coerce.number().int().positive("Printing machine is required"),
  printingOperatorId: z14.coerce.number().int().positive("Printing operator is required"),
  notes: z14.string().optional()
});
var createProductionOrderSchema = z14.object({
  body: z14.object({
    workOrderId: z14.coerce.number().int().positive("A sales order is required"),
    notes: z14.string().optional(),
    createdByUserId: z14.coerce.number().int().positive().optional()
  })
});
var updateProductionOrderSchema = z14.object({
  body: z14.object({
    notes: z14.string().optional(),
    status: z14.enum(["planned", "production", "complete"]).optional()
  })
});
var planLineRequestSchema = z14.object({
  body: planLineSchema.extend({
    actorUserId: z14.coerce.number().int().positive().optional()
  })
});
var assignLineResourcesSchema = z14.object({
  body: z14.object({
    stage: z14.enum(["printing", "cutting", "packaging"]),
    machineId: z14.coerce.number().int().positive().nullable().optional(),
    operatorId: z14.coerce.number().int().positive().nullable().optional(),
    actorUserId: z14.coerce.number().int().positive().optional()
  })
});
var updateStageProgressSchema = z14.object({
  body: z14.object({
    completed: z14.coerce.number().min(0, "Completed rolls cannot be negative"),
    packagedQty: z14.coerce.number().min(0, "Packaged quantity cannot be negative").optional(),
    note: z14.string().optional(),
    actorUserId: z14.coerce.number().int().positive().optional()
  })
});
var transferRollsSchema = z14.object({
  body: z14.object({
    target: z14.enum(["cutting", "packaging"]),
    rolls: z14.coerce.number().positive("Transfer quantity must be greater than zero"),
    note: z14.string().optional(),
    actorUserId: z14.coerce.number().int().positive().optional()
  })
});
var issueRollsSchema = z14.object({
  body: z14.object({
    materialCode: z14.string().trim().min(1).optional(),
    rolls: z14.coerce.number().positive("Issued rolls must be greater than zero"),
    note: z14.string().optional(),
    actorUserId: z14.coerce.number().int().positive().optional()
  })
});
var updateLineFullSchema = z14.object({
  body: z14.object({
    printedRolls: z14.coerce.number().min(0, "Cannot be negative").optional(),
    sentToCuttingRolls: z14.coerce.number().min(0, "Cannot be negative").optional(),
    cutRolls: z14.coerce.number().min(0, "Cannot be negative").optional(),
    sentToPackagingRolls: z14.coerce.number().min(0, "Cannot be negative").optional(),
    packagedRolls: z14.coerce.number().min(0, "Cannot be negative").optional(),
    packagedQty: z14.coerce.number().min(0, "Cannot be negative").optional(),
    materialCode: z14.string().trim().min(1).optional(),
    printingMachineId: z14.coerce.number().int().positive().nullable().optional(),
    printingOperatorId: z14.coerce.number().int().positive().nullable().optional(),
    cuttingMachineId: z14.coerce.number().int().positive().nullable().optional(),
    cuttingOperatorId: z14.coerce.number().int().positive().nullable().optional(),
    packagingOperatorId: z14.coerce.number().int().positive().nullable().optional(),
    usedRolls: z14.coerce.number().min(0, "Cannot be negative").optional(),
    usedWeight: z14.coerce.number().min(0, "Cannot be negative").optional(),
    extraRollsReturned: z14.coerce.number().min(0, "Cannot be negative").optional(),
    extraWeight: z14.coerce.number().min(0, "Cannot be negative").optional(),
    note: z14.string().optional(),
    actorUserId: z14.coerce.number().int().positive().optional()
  })
});
var reconcileLineSchema = z14.object({
  body: z14.object({
    usedRolls: z14.coerce.number().min(0, "Used rolls cannot be negative"),
    usedWeight: z14.coerce.number().min(0, "Used weight cannot be negative"),
    extraRollsReturned: z14.coerce.number().min(0, "Extra rolls returned cannot be negative"),
    extraWeight: z14.coerce.number().min(0, "Extra weight cannot be negative"),
    actorUserId: z14.coerce.number().int().positive().optional()
  })
});

// src/api/routes/production-orders.routes.ts
var router10 = Router11();
router10.get("/", validateQuery(listProductionOrdersQuerySchema), productionOrderController.getProductionOrders);
router10.get("/eligible-sales-orders", productionOrderController.getEligibleSalesOrders);
router10.get("/available-resources", productionOrderController.getAvailableResources);
router10.post("/", validateRequest(createProductionOrderSchema), productionOrderController.createProductionOrder);
router10.get("/:id", validateParams(idParamsSchema), productionOrderController.getProductionOrder);
router10.get("/:id/overview", validateParams(idParamsSchema), productionOrderController.getProductionOrderOverview);
router10.get("/:id/events", validateParams(idParamsSchema), validateQuery(paginationQuerySchema), productionOrderController.getOrderEvents);
router10.patch("/:id", validateParams(idParamsSchema), validateRequest(updateProductionOrderSchema), productionOrderController.updateProductionOrder);
router10.delete("/:id", validateParams(idParamsSchema), productionOrderController.deleteProductionOrder);
router10.post("/:id/lines", validateParams(idParamsSchema), validateRequest(planLineRequestSchema), productionOrderController.planLine);
router10.put("/lines/:lineId/plan", validateParams(lineIdParamsSchema), validateRequest(planLineRequestSchema), productionOrderController.updateLinePlan);
router10.delete("/lines/:lineId", validateParams(lineIdParamsSchema), productionOrderController.deleteLine);
router10.patch(
  "/lines/:lineId",
  validateParams(lineIdParamsSchema),
  validateRequest(updateLineFullSchema),
  productionOrderController.updateLineFull
);
router10.put(
  "/lines/:lineId/reconcile",
  validateParams(lineIdParamsSchema),
  validateRequest(reconcileLineSchema),
  productionOrderController.reconcileLine
);
router10.patch(
  "/lines/:lineId/assign",
  validateParams(lineIdParamsSchema),
  validateRequest(assignLineResourcesSchema),
  productionOrderController.assignLineResources
);
router10.patch(
  "/lines/:lineId/printing",
  validateParams(lineIdParamsSchema),
  validateRequest(updateStageProgressSchema),
  productionOrderController.updatePrintingProgress
);
router10.patch(
  "/lines/:lineId/cutting",
  validateParams(lineIdParamsSchema),
  validateRequest(updateStageProgressSchema),
  productionOrderController.updateCuttingProgress
);
router10.patch(
  "/lines/:lineId/packaging",
  validateParams(lineIdParamsSchema),
  validateRequest(updateStageProgressSchema),
  productionOrderController.updatePackagingProgress
);
router10.post("/lines/:lineId/transfers", validateParams(lineIdParamsSchema), validateRequest(transferRollsSchema), productionOrderController.transferRolls);
router10.post("/lines/:lineId/issuances", validateParams(lineIdParamsSchema), validateRequest(issueRollsSchema), productionOrderController.issueRolls);
router10.get("/lines/:lineId/issuances", validateParams(lineIdParamsSchema), validateQuery(paginationQuerySchema), productionOrderController.getLineIssuances);
router10.get("/lines/:lineId/events", validateParams(lineIdParamsSchema), validateQuery(paginationQuerySchema), productionOrderController.getLineEvents);
var production_orders_routes_default = router10;

// src/api/routes/woven-production.routes.ts
import { Router as Router12 } from "express";

// src/api/repositories/woven-production.repository.ts
import { eq as eq12, and as and10, sql as sql7 } from "drizzle-orm";

// src/api/repositories/thread-inventory.repository.ts
import { eq as eq11, desc as desc6, and as and9, sql as sql6, isNull as isNull2, inArray as inArray4 } from "drizzle-orm";
var ThreadInventoryRepository = class {
  /* ============================ Reads ============================ */
  async findStocks(filters) {
    const conditions = [];
    if (filters?.stockType) conditions.push(eq11(threadStocks.stockType, filters.stockType));
    if (filters?.denier) conditions.push(eq11(threadStocks.denier, filters.denier));
    if (filters?.colorName) {
      conditions.push(sql6`${threadStocks.colorName} ILIKE ${"%" + filters.colorName + "%"}`);
    }
    return db.select().from(threadStocks).where(conditions.length ? and9(...conditions) : void 0).orderBy(threadStocks.stockType, threadStocks.denier, threadStocks.colorName);
  }
  async findStockById(id) {
    const [row] = await db.select().from(threadStocks).where(eq11(threadStocks.id, id));
    return row;
  }
  async countStocks(filters) {
    const conditions = [];
    if (filters?.stockType) conditions.push(eq11(threadStocks.stockType, filters.stockType));
    if (filters?.denier) conditions.push(eq11(threadStocks.denier, filters.denier));
    if (filters?.colorName) {
      conditions.push(sql6`${threadStocks.colorName} ILIKE ${"%" + filters.colorName + "%"}`);
    }
    const [row] = await db.select({ count: sql6`count(*)` }).from(threadStocks).where(conditions.length ? and9(...conditions) : void 0);
    return Number(row?.count ?? 0);
  }
  /** Creates a thread ledger with its opening balance recorded as the first movement. */
  async createStockWithHistory(identity, openingKg, actorUserId) {
    return db.transaction(async (tx) => {
      const stock = await this.getOrCreateStockTx(tx, identity);
      if (openingKg > 0) {
        await this.moveStockTx(tx, stock.id, openingKg, "adjustment", {
          note: "Opening balance",
          actorUserId
        });
      }
      const [fresh] = await tx.select().from(threadStocks).where(eq11(threadStocks.id, stock.id));
      return fresh;
    });
  }
  /**
   * Edits a thread ledger. Renaming the colour is a plain attribute change; changing the
   * balance is a movement, so the difference is written as an `adjustment` and the history
   * still reconciles to the balance.
   */
  async updateStockWithHistory(id, patch, note, actorUserId) {
    return db.transaction(async (tx) => {
      const [locked] = await tx.select().from(threadStocks).where(eq11(threadStocks.id, id)).for("update");
      if (!locked) throw new NotFoundError("Thread stock not found");
      const attrs = {};
      if (patch.colorName !== void 0) attrs.colorName = patch.colorName;
      if (patch.colorCode !== void 0) attrs.colorCode = patch.colorCode;
      if (Object.keys(attrs).length > 0) {
        await tx.update(threadStocks).set({ ...attrs, updatedAt: /* @__PURE__ */ new Date() }).where(eq11(threadStocks.id, id));
      }
      if (patch.balanceKg !== void 0) {
        if (patch.balanceKg < 0) throw new BadRequestError("Balance cannot be negative");
        const delta = patch.balanceKg - Number(locked.balanceKg);
        if (Math.abs(delta) > 5e-4) {
          await this.moveStockTx(tx, id, delta, "adjustment", {
            note: note ?? "Manual stock adjustment",
            actorUserId
          });
        }
      }
      const [fresh] = await tx.select().from(threadStocks).where(eq11(threadStocks.id, id));
      return fresh;
    });
  }
  /**
   * How much of this stock was actually consumed by production or dyeing.
   *
   * Deliberately NOT `threadStocks.consumedKg`: that column totals every outflow, including
   * a downward manual adjustment (a recount). A recount is not a reason to refuse deletion —
   * only a real production draw or dye run is, because those leave records pointing here.
   */
  async findConsumedByProcessKg(id) {
    const [row] = await db.select({ total: sql6`coalesce(sum(${threadStockMovements.weightKg}), 0)` }).from(threadStockMovements).where(
      and9(
        eq11(threadStockMovements.threadStockId, id),
        inArray4(threadStockMovements.movementType, ["production_issue", "dye_consume"])
      )
    );
    return Math.abs(Number(row?.total ?? 0));
  }
  async deleteStock(id) {
    await db.delete(threadStocks).where(eq11(threadStocks.id, id));
  }
  async findMovements(threadStockId, limit = 200) {
    return db.select().from(threadStockMovements).where(threadStockId ? eq11(threadStockMovements.threadStockId, threadStockId) : void 0).orderBy(desc6(threadStockMovements.createdAt)).limit(limit);
  }
  async findPurchases(filters) {
    const conditions = [];
    if (filters?.vendor) conditions.push(sql6`${threadPurchases.vendor} ILIKE ${"%" + filters.vendor + "%"}`);
    if (filters?.denier) conditions.push(eq11(threadPurchases.denier, filters.denier));
    return db.select().from(threadPurchases).where(conditions.length ? and9(...conditions) : void 0).orderBy(desc6(threadPurchases.receivedDate));
  }
  async findPurchaseById(id) {
    const [row] = await db.select().from(threadPurchases).where(eq11(threadPurchases.id, id));
    return row;
  }
  async findDyeBatches(limit = 200) {
    return db.select().from(threadDyeBatches).orderBy(desc6(threadDyeBatches.createdAt)).limit(limit);
  }
  async findLastBatchNumber() {
    const [row] = await db.select({ batchNumber: threadDyeBatches.batchNumber }).from(threadDyeBatches).orderBy(desc6(threadDyeBatches.id)).limit(1);
    return row?.batchNumber;
  }
  /* ==================== Core stock primitives ==================== */
  /**
   * Finds a ledger row by its identity, or creates it at zero. Locked `FOR UPDATE` on the
   * way out so the caller can safely compute against the balance it just read.
   */
  async getOrCreateStockTx(tx, identity) {
    const match = and9(
      eq11(threadStocks.stockType, identity.stockType),
      eq11(threadStocks.denier, identity.denier),
      eq11(threadStocks.colorName, identity.colorName),
      identity.colorCode === null ? isNull2(threadStocks.colorCode) : eq11(threadStocks.colorCode, identity.colorCode)
    );
    const [existing] = await tx.select().from(threadStocks).where(match).for("update");
    if (existing) return existing;
    const [created] = await tx.insert(threadStocks).values({ ...identity, balanceKg: "0", receivedKg: "0", consumedKg: "0" }).returning();
    return created;
  }
  /**
   * Applies a signed weight change to one stock row and records the movement that explains
   * it. Negative weights debit. Throws if the result would be negative — physical stock
   * cannot go below zero, and silently allowing it would corrupt every downstream figure.
   */
  async moveStockTx(tx, stockId, weightKg, movementType, ref) {
    const [locked] = await tx.select().from(threadStocks).where(eq11(threadStocks.id, stockId)).for("update");
    if (!locked) throw new NotFoundError("Thread stock row not found");
    const nextBalance = Number(locked.balanceKg) + weightKg;
    if (nextBalance < -5e-4) {
      throw new BadRequestError(
        `Not enough ${locked.colorName} ${locked.denier}D thread: ${Number(locked.balanceKg).toFixed(3)} kg available, ${Math.abs(weightKg).toFixed(3)} kg required`
      );
    }
    await tx.update(threadStocks).set({
      balanceKg: String(nextBalance),
      receivedKg: weightKg > 0 ? String(Number(locked.receivedKg) + weightKg) : locked.receivedKg,
      consumedKg: weightKg < 0 ? String(Number(locked.consumedKg) - weightKg) : locked.consumedKg,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq11(threadStocks.id, stockId));
    await tx.insert(threadStockMovements).values({
      threadStockId: stockId,
      movementType,
      weightKg: String(weightKg),
      balanceAfterKg: String(nextBalance),
      referenceType: ref?.referenceType,
      referenceId: ref?.referenceId,
      note: ref?.note,
      actorUserId: ref?.actorUserId ?? null
    });
    return nextBalance;
  }
  /* ==================== Purchases (receiving) ==================== */
  /** Records a thread purchase and credits primary (undyed) stock, atomically. */
  async createPurchaseWithStock(purchase, credit, actorUserId) {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(threadPurchases).values(purchase).returning();
      const stock = await this.getOrCreateStockTx(tx, {
        stockType: "primary",
        denier: credit.denier,
        colorName: credit.colorName,
        colorCode: null
      });
      await this.moveStockTx(tx, stock.id, credit.weightKg, "purchase_receipt", {
        referenceType: "thread_purchase",
        referenceId: row.id,
        note: `Received from ${purchase.vendor} (invoice ${purchase.invoiceNumber})`,
        actorUserId
      });
      return row;
    });
  }
  /** Reverses a purchase's credit and deletes it, atomically. */
  async deletePurchaseWithStock(id, debit, actorUserId) {
    return db.transaction(async (tx) => {
      const stock = await this.getOrCreateStockTx(tx, {
        stockType: "primary",
        denier: debit.denier,
        colorName: debit.colorName,
        colorCode: null
      });
      await this.moveStockTx(tx, stock.id, -debit.weightKg, "adjustment", {
        referenceType: "thread_purchase",
        referenceId: id,
        note: "Purchase record deleted",
        actorUserId
      });
      await tx.delete(threadPurchases).where(eq11(threadPurchases.id, id));
    });
  }
  /* ========================== Dyeing ========================== */
  /**
   * Converts undyed primary stock into dyed secondary stock in one transaction:
   * debit white/black, credit the colour. Input and output weights are recorded separately
   * because dyeing has genuine process loss.
   */
  async createDyeBatchTransaction(batch, from, to, weights, actorUserId) {
    return db.transaction(async (tx) => {
      const fromStock = await this.getOrCreateStockTx(tx, {
        stockType: "primary",
        denier: from.denier,
        colorName: from.colorName,
        colorCode: null
      });
      const toStock = await this.getOrCreateStockTx(tx, {
        stockType: "secondary",
        denier: to.denier,
        colorName: to.colorName,
        colorCode: to.colorCode
      });
      const [row] = await tx.insert(threadDyeBatches).values({ ...batch, fromStockId: fromStock.id, toStockId: toStock.id }).returning();
      await this.moveStockTx(tx, fromStock.id, -weights.inputKg, "dye_consume", {
        referenceType: "thread_dye_batch",
        referenceId: row.id,
        note: `Dyed into ${to.colorName} (${to.colorCode})`,
        actorUserId
      });
      await this.moveStockTx(tx, toStock.id, weights.outputKg, "dye_produce", {
        referenceType: "thread_dye_batch",
        referenceId: row.id,
        note: `Dyed from ${from.colorName} ${from.denier}D`,
        actorUserId
      });
      return row;
    });
  }
  /* =============== Production consumption (planning) =============== */
  /**
   * Consumes one planned thread colour, **secondary (dyed) stock first, then primary
   * (undyed)** — the rule from the planning spec. A colour can therefore be satisfied by
   * two slices, and both are returned so the caller can record exactly what was drawn.
   *
   * Primary fallback prefers White (what dyeing normally starts from) before Black.
   * Everything runs inside the caller's transaction, so a shortfall on the third colour
   * rolls back the first two.
   */
  async consumeForPlanTx(tx, want, ref) {
    const slices = [];
    let remaining = want.weightKg;
    if (!(remaining > 0)) return slices;
    const [secondary] = await tx.select().from(threadStocks).where(
      and9(
        eq11(threadStocks.stockType, "secondary"),
        eq11(threadStocks.denier, want.denier),
        eq11(threadStocks.colorName, want.colorName),
        eq11(threadStocks.colorCode, want.colorCode)
      )
    ).for("update");
    if (secondary) {
      const take = Math.min(Number(secondary.balanceKg), remaining);
      if (take > 0) {
        await this.moveStockTx(tx, secondary.id, -take, "production_issue", {
          ...ref,
          note: `Planned for ${want.colorName} (${want.colorCode})`
        });
        slices.push({
          threadStockId: secondary.id,
          stockType: "secondary",
          colorName: secondary.colorName,
          colorCode: secondary.colorCode,
          weightKg: take
        });
        remaining -= take;
      }
    }
    if (remaining <= 5e-4) return slices;
    const primaries = await tx.select().from(threadStocks).where(
      and9(
        eq11(threadStocks.stockType, "primary"),
        eq11(threadStocks.denier, want.denier),
        inArray4(threadStocks.colorName, ["White", "Black"])
      )
    ).for("update");
    const ordered = primaries.sort(
      (a, b) => a.colorName === b.colorName ? 0 : a.colorName === "White" ? -1 : 1
    );
    for (const primary of ordered) {
      if (remaining <= 5e-4) break;
      const take = Math.min(Number(primary.balanceKg), remaining);
      if (take <= 0) continue;
      await this.moveStockTx(tx, primary.id, -take, "production_issue", {
        ...ref,
        note: `Undyed fallback for ${want.colorName} (${want.colorCode})`
      });
      slices.push({
        threadStockId: primary.id,
        stockType: "primary",
        colorName: primary.colorName,
        colorCode: null,
        weightKg: take
      });
      remaining -= take;
    }
    if (remaining > 5e-4) {
      throw new BadRequestError(
        `Not enough thread for ${want.colorName} (${want.colorCode}) ${want.denier}D: short by ${remaining.toFixed(3)} kg across dyed and undyed stock`
      );
    }
    return slices;
  }
  /** Credits a line's whole draw back — used when a plan is changed or cancelled. */
  async releaseForPlanTx(tx, referenceType, referenceId, actorUserId) {
    const issued = await tx.select({
      threadStockId: threadStockMovements.threadStockId,
      total: sql6`sum(${threadStockMovements.weightKg})`
    }).from(threadStockMovements).where(
      and9(
        eq11(threadStockMovements.referenceType, referenceType),
        eq11(threadStockMovements.referenceId, referenceId),
        eq11(threadStockMovements.movementType, "production_issue")
      )
    ).groupBy(threadStockMovements.threadStockId);
    for (const row of issued) {
      const giveBack = Math.abs(Number(row.total));
      if (giveBack <= 0) continue;
      await this.moveStockTx(tx, row.threadStockId, giveBack, "production_release", {
        referenceType,
        referenceId,
        note: "Plan changed or cancelled \u2014 thread returned to stock",
        actorUserId
      });
    }
  }
};
var threadInventoryRepository = new ThreadInventoryRepository();

// src/api/repositories/woven-production.repository.ts
var PLAN_REF = "woven_production_line";
var WovenProductionRepository = class {
  async findLines(productionOrderId) {
    return db.select().from(wovenProductionLines).where(eq12(wovenProductionLines.productionOrderId, Number(productionOrderId))).orderBy(wovenProductionLines.id);
  }
  async findLineById(lineId) {
    const [row] = await db.select().from(wovenProductionLines).where(eq12(wovenProductionLines.id, Number(lineId)));
    return row;
  }
  async findThreadPlan(lineId) {
    return db.select().from(wovenThreadPlanItems).where(eq12(wovenThreadPlanItems.wovenProductionLineId, Number(lineId))).orderBy(wovenThreadPlanItems.sortOrder);
  }
  /** The woven order header, joined through to its sales order and loom spec. */
  async findOrderContext(productionOrderId) {
    const [row] = await db.select({
      productionOrderId: productionOrders.id,
      productionNumber: productionOrders.productionNumber,
      status: productionOrders.status,
      totalQty: productionOrders.totalQty,
      workOrderId: workOrders.id,
      soNumber: workOrders.soNumber,
      productType: workOrders.productType
    }).from(productionOrders).innerJoin(workOrders, eq12(productionOrders.workOrderId, workOrders.id)).where(eq12(productionOrders.id, Number(productionOrderId)));
    return row;
  }
  /** Machine/operator names for the overview, resolved in one round trip. */
  async findResourceNames() {
    const [ms, os] = await Promise.all([
      db.select({ id: machines.id, name: machines.machineName }).from(machines),
      db.select({ id: operators.id, name: operators.name }).from(operators)
    ]);
    return { machines: ms, operators: os };
  }
  /**
   * Creates or re-plans a woven line together with its thread colours, settling inventory
   * in the same transaction: whatever the line previously held is credited back before the
   * new plan is drawn, so re-planning never double-counts.
   */
  async savePlanTransaction(productionOrderId, lineId, line, threads, derive, actorUserId) {
    return db.transaction(async (tx) => {
      let target;
      if (lineId) {
        const [locked] = await tx.select().from(wovenProductionLines).where(eq12(wovenProductionLines.id, lineId)).for("update");
        if (!locked) throw new NotFoundError("Woven production line not found");
        await threadInventoryRepository.releaseForPlanTx(tx, PLAN_REF, lineId, actorUserId);
        await tx.delete(wovenThreadPlanItems).where(eq12(wovenThreadPlanItems.wovenProductionLineId, lineId));
        const [updated] = await tx.update(wovenProductionLines).set({ ...line, updatedAt: /* @__PURE__ */ new Date() }).where(eq12(wovenProductionLines.id, lineId)).returning();
        target = updated;
      } else {
        const [created] = await tx.insert(wovenProductionLines).values({ ...line, productionOrderId }).returning();
        target = created;
      }
      let totalWeight = 0;
      for (const thread of threads) {
        const slices = await threadInventoryRepository.consumeForPlanTx(
          tx,
          {
            denier: thread.denier,
            colorName: thread.colorName,
            colorCode: thread.colorCode,
            weightKg: thread.weightKg
          },
          { referenceType: PLAN_REF, referenceId: target.id, actorUserId }
        );
        totalWeight += thread.weightKg;
        await tx.insert(wovenThreadPlanItems).values({
          wovenProductionLineId: target.id,
          sortOrder: thread.sortOrder,
          colorName: thread.colorName,
          denier: thread.denier,
          colorCode: thread.colorCode,
          weightKg: String(thread.weightKg),
          // Which ledger row satisfied it — explicit user selection or the first slice source.
          threadStockId: thread.threadStockId ?? slices[0]?.threadStockId ?? null
        });
      }
      const [finalLine] = await tx.update(wovenProductionLines).set({
        totalThreadWeightKg: String(totalWeight),
        planningCompletedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq12(wovenProductionLines.id, target.id)).returning();
      await this.resyncOrderTx(tx, productionOrderId, derive);
      return finalLine;
    });
  }
  /** Cancels a woven line, returning its thread to stock. */
  async deleteLineTransaction(lineId, productionOrderId, derive, actorUserId) {
    return db.transaction(async (tx) => {
      await threadInventoryRepository.releaseForPlanTx(tx, PLAN_REF, lineId, actorUserId);
      await tx.delete(wovenProductionLines).where(eq12(wovenProductionLines.id, lineId));
      await this.resyncOrderTx(tx, productionOrderId, derive);
    });
  }
  /**
   * Applies a stage change (weaving / cutting / packaging) against the LOCKED line, so two
   * supervisors editing the same line can't lose each other's update — the same guarantee
   * the printed workflow gained in `applyLineChangeTransaction`.
   */
  async applyStageChangeTransaction(lineId, compute, derive) {
    return db.transaction(async (tx) => {
      const [locked] = await tx.select().from(wovenProductionLines).where(eq12(wovenProductionLines.id, lineId)).for("update");
      if (!locked) throw new NotFoundError("Woven production line not found");
      const patch = compute(locked);
      const [line] = await tx.update(wovenProductionLines).set({ ...patch, updatedAt: /* @__PURE__ */ new Date() }).where(eq12(wovenProductionLines.id, lineId)).returning();
      await this.resyncOrderTx(tx, line.productionOrderId, derive);
      return line;
    });
  }
  /**
   * Post-completion inventory reconciliation: returns remaining thread weights to stock,
   * updates remainingWeightKg and actualConsumedWeightKg on each thread item.
   */
  async reconcileRemainingThreadsTransaction(lineId, threads, actorUserId) {
    return db.transaction(async (tx) => {
      const [line] = await tx.select().from(wovenProductionLines).where(eq12(wovenProductionLines.id, lineId)).for("update");
      if (!line) throw new NotFoundError("Woven production line not found");
      const existingThreads = await tx.select().from(wovenThreadPlanItems).where(eq12(wovenThreadPlanItems.wovenProductionLineId, lineId));
      for (const inputThread of threads) {
        const target = existingThreads.find((t) => t.id === inputThread.id);
        if (!target) continue;
        const plannedWeight = Number(target.weightKg || 0);
        const remWeight = Math.max(0, Number(inputThread.remainingWeightKg || 0));
        if (remWeight > plannedWeight) {
          throw new Error(
            `Remaining weight (${remWeight} kg) for ${target.colorName} cannot exceed planned weight (${plannedWeight} kg)`
          );
        }
        const prevRemaining = Number(target.remainingWeightKg || 0);
        const weightDeltaToRelease = remWeight - prevRemaining;
        if (weightDeltaToRelease > 0 && target.threadStockId) {
          await threadInventoryRepository.moveStockTx(
            tx,
            target.threadStockId,
            weightDeltaToRelease,
            "production_release",
            {
              referenceType: PLAN_REF,
              referenceId: lineId,
              note: `Post-completion remaining thread return (${target.colorCode})`,
              actorUserId: actorUserId ?? null
            }
          );
        }
        const actualConsumed = Math.max(0, plannedWeight - remWeight);
        await tx.update(wovenThreadPlanItems).set({
          remainingWeightKg: String(remWeight),
          actualConsumedWeightKg: String(actualConsumed),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq12(wovenThreadPlanItems.id, target.id));
      }
      return tx.select().from(wovenThreadPlanItems).where(eq12(wovenThreadPlanItems.wovenProductionLineId, lineId)).orderBy(wovenThreadPlanItems.sortOrder);
    });
  }
  /** Re-derives the parent order's status from its woven lines, inside the caller's tx. */
  async resyncOrderTx(tx, productionOrderId, derive) {
    const siblings = await tx.select().from(wovenProductionLines).where(eq12(wovenProductionLines.productionOrderId, productionOrderId));
    const patch = derive(siblings);
    await tx.update(productionOrders).set({ ...patch, updatedAt: /* @__PURE__ */ new Date() }).where(eq12(productionOrders.id, productionOrderId));
    if (patch.status) {
      const [order] = await tx.select({ workOrderId: productionOrders.workOrderId }).from(productionOrders).where(eq12(productionOrders.id, productionOrderId));
      if (order) {
        await tx.update(workOrders).set({
          status: patch.status === "complete" ? "complete" : "production",
          updatedAt: /* @__PURE__ */ new Date()
        }).where(and10(eq12(workOrders.id, order.workOrderId), sql7`${workOrders.status} <> 'dispatched'`));
      }
    }
  }
};
var wovenProductionRepository = new WovenProductionRepository();

// src/api/services/woven-production.helpers.ts
var MAX_THREAD_COLORS = 8;
function toNumbers2(line) {
  return {
    quantity: Number(line.quantity),
    totalThreadWeightKg: Number(line.totalThreadWeightKg),
    wovenQty: Number(line.wovenQty),
    cutQty: Number(line.cutQty),
    packagedQty: Number(line.packagedQty),
    packagedWeightKg: Number(line.packagedWeightKg)
  };
}
function hasWovenProgress(line) {
  const n = toNumbers2(line);
  return n.wovenQty > 0 || n.cutQty > 0 || n.packagedQty > 0;
}
function deriveWovenLineStatus(line) {
  const n = toNumbers2(line);
  if (n.quantity > 0 && n.packagedQty >= n.quantity) return "completed";
  return hasWovenProgress(line) ? "active" : "pending";
}
function deriveWovenOrderPatch(lines, current) {
  if (lines.length === 0) return { status: "planned", plannedAt: null, completedAt: null };
  const plannedAt = current.plannedAt ?? /* @__PURE__ */ new Date();
  const allComplete = lines.every((l) => {
    const n = toNumbers2(l);
    return n.quantity > 0 && n.packagedQty >= n.quantity;
  });
  if (allComplete) {
    return { status: "complete", plannedAt, completedAt: current.completedAt ?? /* @__PURE__ */ new Date() };
  }
  return {
    status: lines.some(hasWovenProgress) ? "production" : "planned",
    plannedAt,
    completedAt: null
  };
}
function canStartCutting(line) {
  const n = toNumbers2(line);
  return n.quantity > 0 && n.wovenQty >= n.quantity;
}
function canStartPackaging(line) {
  const n = toNumbers2(line);
  return n.cutQty > 0 && n.cutQty >= n.wovenQty;
}

// src/api/services/woven-production.service.ts
var WovenProductionService = class {
  async getLineOrThrow(lineId) {
    const line = await wovenProductionRepository.findLineById(lineId);
    if (!line) throw new NotFoundError("Woven production line not found");
    return line;
  }
  async getOrderOrThrow(id) {
    const order = await productionOrderRepository.findRawById(id);
    if (!order) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));
    return order;
  }
  /** Rejects a production order that isn't running the woven workflow. */
  async assertWoven(productionOrderId) {
    const ctx = await wovenProductionRepository.findOrderContext(productionOrderId);
    if (!ctx) throw new NotFoundError(Messages.notFound(Entity.PRODUCTION_ORDER));
    if (ctx.productType !== "woven") {
      throw new ApiError(
        "This production order runs the printed-labels workflow \u2014 use the printed planning endpoints",
        400
      );
    }
    return ctx;
  }
  async getOverview(productionOrderId) {
    const ctx = await this.assertWoven(productionOrderId);
    const lines = await wovenProductionRepository.findLines(productionOrderId);
    const { machines: machines2, operators: operators2 } = await wovenProductionRepository.findResourceNames();
    const machineName = (id) => machines2.find((m) => m.id === id)?.name ?? null;
    const operatorName = (id) => operators2.find((o) => o.id === id)?.name ?? null;
    const detailed = await Promise.all(
      lines.map(async (line) => {
        const n = toNumbers2(line);
        const threads = await wovenProductionRepository.findThreadPlan(line.id);
        return {
          id: line.id,
          quantity: n.quantity,
          status: line.status,
          planning: {
            totalThreadWeightKg: n.totalThreadWeightKg,
            completedAt: line.planningCompletedAt,
            threadCount: threads.length,
            threads: threads.map((t) => ({
              id: t.id,
              sortOrder: t.sortOrder,
              colorName: t.colorName,
              denier: t.denier,
              colorCode: t.colorCode,
              weightKg: Number(t.weightKg),
              remainingWeightKg: Number(t.remainingWeightKg || 0),
              actualConsumedWeightKg: t.actualConsumedWeightKg != null ? Number(t.actualConsumedWeightKg) : Math.max(0, Number(t.weightKg) - Number(t.remainingWeightKg || 0)),
              threadStockId: t.threadStockId ?? null
            }))
          },
          weaving: {
            machineId: line.weavingMachineId,
            machineName: machineName(line.weavingMachineId),
            operatorId: line.weavingOperatorId,
            operatorName: operatorName(line.weavingOperatorId),
            wovenQty: n.wovenQty,
            status: line.weavingStatus,
            startedAt: line.weavingStartedAt,
            endedAt: line.weavingEndedAt,
            progressPct: n.quantity > 0 ? Math.round(n.wovenQty / n.quantity * 1e4) / 100 : 0,
            isComplete: n.quantity > 0 && n.wovenQty >= n.quantity
          },
          cutting: {
            operatorId: line.cuttingOperatorId,
            operatorName: operatorName(line.cuttingOperatorId),
            cutQty: n.cutQty,
            cuttingDate: line.cuttingDate,
            /** Cutting cannot begin until weaving is 100% complete. */
            canStart: canStartCutting(line),
            isComplete: n.cutQty > 0 && n.cutQty >= n.wovenQty
          },
          packaging: {
            operatorId: line.packagingOperatorId,
            operatorName: operatorName(line.packagingOperatorId),
            packagedQty: n.packagedQty,
            packagedWeightKg: n.packagedWeightKg,
            packagingDate: line.packagingDate,
            /** Packaging cannot begin until cut quantity equals woven quantity. */
            canStart: canStartPackaging(line),
            isComplete: n.quantity > 0 && n.packagedQty >= n.quantity
          }
        };
      })
    );
    const sum = (pick) => lines.reduce((acc, l) => acc + pick(l), 0);
    const totalThreadIssued = sum((l) => Number(l.totalThreadWeightKg));
    const remainingThreadReturned = detailed.reduce(
      (acc, line) => acc + line.planning.threads.reduce((tAcc, t) => tAcc + (t.remainingWeightKg || 0), 0),
      0
    );
    const threadUsedInPackagedQuantity = sum((l) => Number(l.packagedWeightKg));
    const beamTotal = Math.max(0, totalThreadIssued - remainingThreadReturned - threadUsedInPackagedQuantity);
    return {
      productionOrder: ctx,
      lines: detailed,
      totals: {
        lineCount: lines.length,
        quantity: sum((l) => Number(l.quantity)),
        totalThreadWeightKg: totalThreadIssued,
        remainingThreadReturned,
        threadUsedInPackagedQuantity,
        beamTotal,
        wovenQty: sum((l) => Number(l.wovenQty)),
        cutQty: sum((l) => Number(l.cutQty)),
        packagedQty: sum((l) => Number(l.packagedQty)),
        packagedWeightKg: threadUsedInPackagedQuantity
      }
    };
  }
  /**
   * Plans (or re-plans) a woven line: up to eight thread colours, a weaving machine and a
   * weaving operator. Submitting draws the thread from stock — dyed first, undyed as
   * fallback — and the whole thing rolls back if any colour is short.
   */
  async planLine(productionOrderId, lineId, input) {
    await this.assertWoven(productionOrderId);
    const order = await this.getOrderOrThrow(productionOrderId);
    const actorUserId = await userService.assertActor(input.actorUserId);
    if (!(input.quantity > 0)) {
      throw new ApiError("Quantity must be greater than zero", 400);
    }
    if (input.threads.length === 0) {
      throw new ApiError("Planning requires at least one thread colour", 400);
    }
    if (input.threads.length > MAX_THREAD_COLORS) {
      throw new ApiError(`A woven line can use at most ${MAX_THREAD_COLORS} thread colours`, 400);
    }
    input.threads.forEach((t, i) => {
      const where = `Colour ${i + 1}`;
      if (!t.colorName?.trim()) throw new ApiError(`${where}: colour name is required`, 400);
      if (!t.colorCode?.trim()) throw new ApiError(`${where}: colour code is required`, 400);
      if (!t.denier) throw new ApiError(`${where}: denier count is required`, 400);
      if (!(t.weightKg > 0)) throw new ApiError(`${where}: weight must be greater than zero`, 400);
    });
    const seen = /* @__PURE__ */ new Set();
    for (const t of input.threads) {
      const key = `${t.denier}|${t.colorName.trim().toLowerCase()}|${t.colorCode.trim().toLowerCase()}`;
      if (seen.has(key)) {
        throw new ApiError(`Thread colour '${t.colorName}' (${t.colorCode}) is listed twice`, 400);
      }
      seen.add(key);
    }
    const machine = await machineRepository.findById(input.weavingMachineId);
    if (!machine) throw new NotFoundError(Messages.notFound(Entity.MACHINE));
    const operator = await operatorRepository.findById(input.weavingOperatorId);
    if (!operator) throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    if (lineId) {
      await this.getLineOrThrow(lineId);
    }
    return wovenProductionRepository.savePlanTransaction(
      Number(productionOrderId),
      lineId,
      {
        quantity: String(input.quantity),
        weavingMachineId: input.weavingMachineId,
        weavingOperatorId: input.weavingOperatorId
      },
      input.threads.map((t, i) => ({ ...t, sortOrder: t.sortOrder ?? i + 1 })),
      (lines) => deriveWovenOrderPatch(lines, order),
      actorUserId
    );
  }
  async deleteLine(lineId) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    const n = toNumbers2(line);
    if (n.wovenQty > 0 || n.cutQty > 0 || n.packagedQty > 0) {
      throw new ApiError(
        "Cannot cancel this line: production progress has already been recorded against it",
        400
      );
    }
    await wovenProductionRepository.deleteLineTransaction(
      Number(lineId),
      line.productionOrderId,
      (lines) => deriveWovenOrderPatch(lines, order)
    );
  }
  /* ==================== Stage progress ==================== */
  /** Records weaving output. Weaving cannot exceed the planned quantity. */
  async updateWeaving(lineId, input) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    await userService.assertActor(input.actorUserId);
    const res = await wovenProductionRepository.applyStageChangeTransaction(
      Number(lineId),
      (fresh) => {
        const n = toNumbers2(fresh);
        const patch = {};
        if (!fresh.planningCompletedAt) {
          throw new ApiError("Weaving cannot start until planning is complete", 400);
        }
        if (input.wovenQty !== void 0) {
          if (input.wovenQty < 0) throw new ApiError("Woven quantity cannot be negative", 400);
          if (input.wovenQty > n.quantity) {
            throw new ApiError(
              `Woven quantity (${input.wovenQty}) cannot exceed the planned quantity (${n.quantity})`,
              400
            );
          }
          patch.wovenQty = String(input.wovenQty);
          patch.weavingStatus = input.wovenQty >= n.quantity ? "completed" : "active";
        }
        if (input.started && !fresh.weavingStartedAt) patch.weavingStartedAt = /* @__PURE__ */ new Date();
        if (input.ended) patch.weavingEndedAt = /* @__PURE__ */ new Date();
        patch.status = deriveWovenLineStatus({ ...fresh, ...patch });
        return patch;
      },
      (lines) => deriveWovenOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return res;
  }
  /** Records cutting. Blocked until weaving is 100% complete. */
  async updateCutting(lineId, input) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    await userService.assertActor(input.actorUserId);
    if (input.cuttingOperatorId != null && !await operatorRepository.findById(input.cuttingOperatorId)) {
      throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    }
    const res = await wovenProductionRepository.applyStageChangeTransaction(
      Number(lineId),
      (fresh) => {
        const n = toNumbers2(fresh);
        const patch = {};
        if (input.cutQty !== void 0) {
          if (!(n.quantity > 0 && n.wovenQty >= n.quantity)) {
            throw new ApiError(
              `Cutting cannot begin until weaving is complete (${n.wovenQty} of ${n.quantity} woven)`,
              400
            );
          }
          if (input.cutQty < 0) throw new ApiError("Cut quantity cannot be negative", 400);
          if (input.cutQty > n.wovenQty) {
            throw new ApiError(
              `Cut quantity (${input.cutQty}) cannot exceed the woven quantity (${n.wovenQty})`,
              400
            );
          }
          patch.cutQty = String(input.cutQty);
        }
        if (input.cuttingOperatorId !== void 0) patch.cuttingOperatorId = input.cuttingOperatorId;
        if (input.cuttingDate !== void 0) patch.cuttingDate = input.cuttingDate;
        patch.status = deriveWovenLineStatus({ ...fresh, ...patch });
        return patch;
      },
      (lines) => deriveWovenOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return res;
  }
  /** Records packaging. Blocked until cut quantity equals woven quantity. */
  async updatePackaging(lineId, input) {
    const line = await this.getLineOrThrow(lineId);
    const order = await this.getOrderOrThrow(line.productionOrderId);
    await userService.assertActor(input.actorUserId);
    if (input.packagingOperatorId != null && !await operatorRepository.findById(input.packagingOperatorId)) {
      throw new NotFoundError(Messages.notFound(Entity.OPERATOR));
    }
    const res = await wovenProductionRepository.applyStageChangeTransaction(
      Number(lineId),
      (fresh) => {
        const n = toNumbers2(fresh);
        const patch = {};
        if (input.packagedQty !== void 0) {
          if (!(n.cutQty > 0 && n.cutQty >= n.wovenQty)) {
            throw new ApiError(
              `Packaging cannot begin until cutting is complete (${n.cutQty} cut of ${n.wovenQty} woven)`,
              400
            );
          }
          if (input.packagedQty < 0) throw new ApiError("Packaged quantity cannot be negative", 400);
          if (input.packagedQty > n.cutQty) {
            throw new ApiError(
              `Packaged quantity (${input.packagedQty}) cannot exceed the cut quantity (${n.cutQty})`,
              400
            );
          }
          patch.packagedQty = String(input.packagedQty);
        }
        if (input.packagedWeightKg !== void 0) {
          if (input.packagedWeightKg < 0) throw new ApiError("Packaged weight cannot be negative", 400);
          patch.packagedWeightKg = String(input.packagedWeightKg);
        }
        if (input.packagingOperatorId !== void 0) patch.packagingOperatorId = input.packagingOperatorId;
        if (input.packagingDate !== void 0) patch.packagingDate = input.packagingDate;
        patch.status = deriveWovenLineStatus({ ...fresh, ...patch });
        return patch;
      },
      (lines) => deriveWovenOrderPatch(lines, order)
    );
    await this.notifyIfOrderCompleted(line.productionOrderId, order.status);
    return res;
  }
  async reconcileRemainingThreads(lineId, input) {
    const line = await this.getLineOrThrow(lineId);
    const actorUserId = await userService.assertActor(input.actorUserId);
    return wovenProductionRepository.reconcileRemainingThreadsTransaction(
      Number(lineId),
      input.threads,
      actorUserId
    );
  }
  async notifyIfOrderCompleted(productionOrderId, previousStatus) {
    if (previousStatus === "complete") return;
    try {
      const updatedOrder = await productionOrderRepository.findById(productionOrderId);
      if (updatedOrder && updatedOrder.status === "complete") {
        mailService.sendProductionCompletedEmail({
          productionNumber: updatedOrder.productionNumber,
          soNumber: updatedOrder.soNumber,
          poNumber: updatedOrder.poNumber,
          companyName: updatedOrder.companyName,
          brandName: updatedOrder.brandName,
          totalQty: updatedOrder.totalQty,
          completedAt: updatedOrder.completedAt
        }).catch((err) => {
          console.error("[WovenProductionService] Error sending completion email:", err);
        });
      }
    } catch (err) {
      console.error("[WovenProductionService] Failed to check completion status for email notification:", err);
    }
  }
};
var wovenProductionService = new WovenProductionService();

// src/api/controllers/woven-production.controller.ts
var WovenProductionController = class {
  getOverview = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await wovenProductionService.getOverview(id);
    res.json({ data });
  });
  /** Plans a new woven line (thread colours + machine + operator), reserving thread stock. */
  planLine = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await wovenProductionService.planLine(id, null, input);
    res.status(201).json({ data });
  });
  /** Re-plans an existing line — its previous thread draw is returned to stock first. */
  updateLinePlan = asyncHandler(async (req, res) => {
    const { id, lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await wovenProductionService.planLine(id, Number(lineId), input);
    res.json({ data });
  });
  deleteLine = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    await wovenProductionService.deleteLine(lineId);
    res.status(204).send();
  });
  updateWeaving = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await wovenProductionService.updateWeaving(lineId, input);
    res.json({ data });
  });
  updateCutting = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await wovenProductionService.updateCutting(lineId, input);
    res.json({ data });
  });
  updatePackaging = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await wovenProductionService.updatePackaging(lineId, input);
    res.json({ data });
  });
  reconcileRemaining = asyncHandler(async (req, res) => {
    const { lineId } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await wovenProductionService.reconcileRemainingThreads(lineId, input);
    res.json({ data });
  });
};
var wovenProductionController = new WovenProductionController();

// src/api/validations/woven-production.validation.ts
import { z as z15 } from "zod";
var denierEnum = z15.enum(["45", "75", "100", "150"]);
var threadPlanItemSchema = z15.object({
  sortOrder: z15.coerce.number().int().min(1).max(8).optional(),
  colorName: z15.string().trim().min(1, "Colour name is required"),
  denier: denierEnum,
  colorCode: z15.string().trim().min(1, "Colour code is required"),
  weightKg: z15.coerce.number().positive("Weight must be greater than zero"),
  threadStockId: z15.coerce.number().int().positive().optional().nullable()
});
var planWovenLineSchema = z15.object({
  body: z15.object({
    quantity: z15.coerce.number().positive("Quantity must be greater than zero"),
    weavingMachineId: z15.coerce.number().int().positive("A weaving machine is required"),
    weavingOperatorId: z15.coerce.number().int().positive("A weaving operator is required"),
    threads: z15.array(threadPlanItemSchema).min(1, "At least one thread colour is required").max(8, "A woven line can use at most 8 thread colours"),
    actorUserId: z15.coerce.number().int().positive().optional()
  })
});
var updateWeavingSchema = z15.object({
  body: z15.object({
    wovenQty: z15.coerce.number().min(0).optional(),
    started: z15.coerce.boolean().optional(),
    ended: z15.coerce.boolean().optional(),
    actorUserId: z15.coerce.number().int().positive().optional()
  })
});
var updateWovenCuttingSchema = z15.object({
  body: z15.object({
    cutQty: z15.coerce.number().min(0).optional(),
    cuttingOperatorId: z15.coerce.number().int().positive().optional(),
    cuttingDate: z15.string().optional(),
    actorUserId: z15.coerce.number().int().positive().optional()
  })
});
var updateWovenPackagingSchema = z15.object({
  body: z15.object({
    packagedQty: z15.coerce.number().min(0).optional(),
    packagedWeightKg: z15.coerce.number().min(0).optional(),
    packagingOperatorId: z15.coerce.number().int().positive().optional(),
    packagingDate: z15.string().optional(),
    actorUserId: z15.coerce.number().int().positive().optional()
  })
});
var reconcileRemainingThreadsSchema = z15.object({
  body: z15.object({
    threads: z15.array(
      z15.object({
        id: z15.coerce.number().int().positive(),
        remainingWeightKg: z15.coerce.number().min(0, "Remaining weight cannot be negative")
      })
    ),
    actorUserId: z15.coerce.number().int().positive().optional()
  })
});

// src/api/routes/woven-production.routes.ts
import { z as z16 } from "zod";
var router11 = Router12();
var orderLineParamsSchema = z16.object({
  id: z16.coerce.number().int().positive(),
  lineId: z16.coerce.number().int().positive()
});
router11.get("/:id/overview", validateParams(idParamsSchema), wovenProductionController.getOverview);
router11.post(
  "/:id/lines",
  validateParams(idParamsSchema),
  validateRequest(planWovenLineSchema),
  wovenProductionController.planLine
);
router11.put(
  "/:id/lines/:lineId",
  validateParams(orderLineParamsSchema),
  validateRequest(planWovenLineSchema),
  wovenProductionController.updateLinePlan
);
router11.delete("/lines/:lineId", validateParams(lineIdParamsSchema), wovenProductionController.deleteLine);
router11.patch(
  "/lines/:lineId/weaving",
  validateParams(lineIdParamsSchema),
  validateRequest(updateWeavingSchema),
  wovenProductionController.updateWeaving
);
router11.patch(
  "/lines/:lineId/cutting",
  validateParams(lineIdParamsSchema),
  validateRequest(updateWovenCuttingSchema),
  wovenProductionController.updateCutting
);
router11.patch(
  "/lines/:lineId/packaging",
  validateParams(lineIdParamsSchema),
  validateRequest(updateWovenPackagingSchema),
  wovenProductionController.updatePackaging
);
router11.patch(
  "/lines/:lineId/reconcile-remaining",
  validateParams(lineIdParamsSchema),
  validateRequest(reconcileRemainingThreadsSchema),
  wovenProductionController.reconcileRemaining
);
var woven_production_routes_default = router11;

// src/api/routes/inventory.routes.ts
import { Router as Router14 } from "express";

// src/api/services/inventory.service.ts
function calculateDerivedFields(inputs, material) {
  const totalRoll = inputs.cartonQty * inputs.rollsPerCarton;
  const weightPerRoll = inputs.weightPerRoll ?? Number(material.weightPerRoll);
  return {
    totalRoll: String(totalRoll),
    totalRollPer200m: String(calculateTotalRollPer200m(totalRoll, inputs.rollLength)),
    invoiceWeight: String(calculateInvoiceWeight(inputs.netWeight, totalRoll, inputs.rollLength)),
    localWeight: String(weightPerRoll)
  };
}
var InventoryService = class {
  async createPurchase(data) {
    const material = await materialRepository.findByCode(data.materialCode);
    if (!material) throw new NotFoundError(`Material with code '${data.materialCode}' not found`);
    const derived = calculateDerivedFields(data, material);
    const totalRoll = data.cartonQty * data.rollsPerCarton;
    return inventoryRepository.createPurchaseWithStock(
      {
        reportDate: data.reportDate,
        materialCode: data.materialCode,
        invoiceNumber: data.invoiceNumber,
        vendor: data.vendor,
        cartonQty: data.cartonQty,
        rollsPerCarton: data.rollsPerCarton,
        efs: data.efs,
        gdNumber: data.gdNumber,
        materialType: material.type,
        itemName: material.description ?? material.type,
        rollLength: String(data.rollLength),
        netWeight: String(data.netWeight),
        ...derived
      },
      { materialCode: data.materialCode, rolls: totalRoll }
    );
  }
  async getPurchases(filters) {
    return inventoryRepository.findAllPurchases(filters);
  }
  async getPurchase(id) {
    const report = await inventoryRepository.findPurchaseById(id);
    if (!report) throw new NotFoundError(Messages.notFound(Entity.PURCHASE_RECORD));
    return report;
  }
  async updatePurchase(id, data) {
    const existing = await inventoryRepository.findPurchaseById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.PURCHASE_RECORD));
    const { materialCode, rollLength, netWeight, weightPerRoll, ...rest } = data;
    const updateData = { ...rest };
    const newMaterialCode = materialCode ?? existing.materialCode;
    const material = await materialRepository.findByCode(newMaterialCode);
    if (!material) throw new NotFoundError(`Material with code '${newMaterialCode}' not found`);
    if (materialCode) {
      updateData.materialCode = materialCode;
      updateData.materialType = material.type;
      updateData.itemName = material.description ?? material.type;
    }
    if (rollLength !== void 0) updateData.rollLength = String(rollLength);
    if (netWeight !== void 0) updateData.netWeight = String(netWeight);
    const derived = calculateDerivedFields(
      {
        cartonQty: data.cartonQty ?? existing.cartonQty,
        rollsPerCarton: data.rollsPerCarton ?? existing.rollsPerCarton,
        rollLength: rollLength ?? Number(existing.rollLength),
        netWeight: netWeight ?? Number(existing.netWeight),
        weightPerRoll: weightPerRoll ?? (existing.localWeight != null ? Number(existing.localWeight) : void 0)
      },
      material
    );
    Object.assign(updateData, derived);
    const oldRolls = existing.cartonQty * existing.rollsPerCarton;
    const newRolls = (data.cartonQty ?? existing.cartonQty) * (data.rollsPerCarton ?? existing.rollsPerCarton);
    const adjustments = newMaterialCode === existing.materialCode ? [{ materialCode: existing.materialCode, rolls: newRolls - oldRolls }] : [
      { materialCode: existing.materialCode, rolls: -oldRolls },
      { materialCode: newMaterialCode, rolls: newRolls }
    ];
    return inventoryRepository.updatePurchaseWithStock(id, updateData, adjustments);
  }
  async deletePurchase(id) {
    const existing = await inventoryRepository.findPurchaseById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.PURCHASE_RECORD));
    const rolls = existing.cartonQty * existing.rollsPerCarton;
    await inventoryRepository.deletePurchaseWithStock(id, { materialCode: existing.materialCode, rolls: -rolls });
  }
  async getStock(filters) {
    return inventoryRepository.findInventoryRolls(filters);
  }
};
var inventoryService = new InventoryService();

// src/api/controllers/inventory.controller.ts
var InventoryController = class {
  createPurchase = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await inventoryService.createPurchase(input);
    res.status(201).json({ data });
  });
  getPurchase = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const data = await inventoryService.getPurchase(id);
    res.json({ data });
  });
  updatePurchase = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.validatedParams ?? req.params;
      const input = req.validatedBody ?? req.body;
      const data = await inventoryService.updatePurchase(id, input);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });
  deletePurchase = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await inventoryService.deletePurchase(id);
    res.status(204).send();
  });
  getPurchases = asyncHandler(async (req, res) => {
    const { startDate, endDate, vendor, materialCode } = req.validatedQuery ?? req.query;
    const data = await inventoryService.getPurchases({
      startDate,
      endDate,
      vendor,
      materialCode
    });
    res.json({ data });
  });
  getStock = asyncHandler(async (req, res) => {
    const { materialCode, type } = req.validatedQuery ?? req.query;
    const data = await inventoryService.getStock({
      materialCode,
      type
    });
    res.json({ data });
  });
};
var inventoryController = new InventoryController();

// src/api/validations/inventory.validation.ts
import { z as z17 } from "zod";
var createPurchaseSchema = z17.object({
  body: z17.object({
    reportDate: z17.string().min(1, "Report date is required"),
    materialCode: z17.string().min(1, "Material code is required"),
    invoiceNumber: z17.string().min(1, "Invoice number is required"),
    vendor: z17.string().min(1, "Vendor is required"),
    cartonQty: z17.coerce.number().int().positive("Carton quantity must be positive"),
    rollsPerCarton: z17.coerce.number().int().positive("Rolls per carton must be positive"),
    rollLength: z17.coerce.number().positive("Roll length must be positive"),
    netWeight: z17.coerce.number().positive("Net weight must be positive"),
    weightPerRoll: z17.coerce.number().positive("Weight per roll must be positive").optional(),
    efs: z17.string().optional(),
    gdNumber: z17.string().optional()
  })
});
var updatePurchaseSchema = z17.object({
  body: z17.object({
    reportDate: z17.string().min(1, "Report date is required").optional(),
    materialCode: z17.string().min(1, "Material code is required").optional(),
    invoiceNumber: z17.string().min(1, "Invoice number is required").optional(),
    vendor: z17.string().min(1, "Vendor is required").optional(),
    cartonQty: z17.coerce.number().int().positive("Carton quantity must be positive").optional(),
    rollsPerCarton: z17.coerce.number().int().positive("Rolls per carton must be positive").optional(),
    rollLength: z17.coerce.number().positive("Roll length must be positive").optional(),
    netWeight: z17.coerce.number().positive("Net weight must be positive").optional(),
    weightPerRoll: z17.coerce.number().positive("Weight per roll must be positive").optional(),
    efs: z17.string().optional(),
    gdNumber: z17.string().optional()
  })
});

// src/api/routes/inventory-roll.routes.ts
import { Router as Router13 } from "express";

// src/api/repositories/inventory-roll.repository.ts
import { eq as eq13, asc as asc7, desc as desc8, and as and11, sql as sql8 } from "drizzle-orm";
var LOW_STOCK_ROLLS = 5;
var InventoryRollRepository = class {
  /** Joined with the material so the list can search and filter on description/type. */
  baseSelect = {
    id: inventoryRolls.id,
    materialCode: inventoryRolls.materialCode,
    openingStock: inventoryRolls.openingStock,
    receivedRolls: inventoryRolls.receivedRolls,
    issuedRolls: inventoryRolls.issuedRolls,
    balanceRolls: inventoryRolls.balanceRolls,
    rollPerKg: inventoryRolls.rollPerKg,
    createdAt: inventoryRolls.createdAt,
    updatedAt: inventoryRolls.updatedAt,
    materialDescription: materials.description,
    materialType: materials.type,
    weightPerRoll: materials.weightPerRoll
  };
  async findAll(filters) {
    const conditions = [];
    if (filters?.materialCode) conditions.push(eq13(inventoryRolls.materialCode, filters.materialCode));
    if (filters?.search) {
      const q = `%${filters.search}%`;
      conditions.push(
        sql8`(${inventoryRolls.materialCode} ILIKE ${q} OR ${materials.description} ILIKE ${q})`
      );
    }
    if (filters?.type) conditions.push(eq13(materials.type, filters.type));
    if (filters?.stockStatus === "out") conditions.push(sql8`${inventoryRolls.balanceRolls} <= 0`);
    if (filters?.stockStatus === "low") {
      conditions.push(
        sql8`${inventoryRolls.balanceRolls} > 0 AND ${inventoryRolls.balanceRolls} < ${LOW_STOCK_ROLLS}`
      );
    }
    if (filters?.stockStatus === "in") {
      conditions.push(sql8`${inventoryRolls.balanceRolls} >= ${LOW_STOCK_ROLLS}`);
    }
    const column = {
      materialCode: inventoryRolls.materialCode,
      balanceRolls: inventoryRolls.balanceRolls,
      receivedRolls: inventoryRolls.receivedRolls,
      issuedRolls: inventoryRolls.issuedRolls,
      updatedAt: inventoryRolls.updatedAt
    }[filters?.sortBy ?? "materialCode"];
    return db.select(this.baseSelect).from(inventoryRolls).leftJoin(materials, eq13(inventoryRolls.materialCode, materials.code)).where(conditions.length > 0 ? and11(...conditions) : void 0).orderBy(filters?.sortDir === "desc" ? desc8(column) : asc7(column)).limit(filters?.limit ?? 500).offset(filters?.offset ?? 0);
  }
  /** Total matching rows, for pagination. Mirrors `findAll`'s filters. */
  async countAll(filters) {
    const conditions = [];
    if (filters?.materialCode) conditions.push(eq13(inventoryRolls.materialCode, filters.materialCode));
    if (filters?.search) {
      const q = `%${filters.search}%`;
      conditions.push(
        sql8`(${inventoryRolls.materialCode} ILIKE ${q} OR ${materials.description} ILIKE ${q})`
      );
    }
    if (filters?.type) conditions.push(eq13(materials.type, filters.type));
    if (filters?.stockStatus === "out") conditions.push(sql8`${inventoryRolls.balanceRolls} <= 0`);
    if (filters?.stockStatus === "low") {
      conditions.push(
        sql8`${inventoryRolls.balanceRolls} > 0 AND ${inventoryRolls.balanceRolls} < ${LOW_STOCK_ROLLS}`
      );
    }
    if (filters?.stockStatus === "in") {
      conditions.push(sql8`${inventoryRolls.balanceRolls} >= ${LOW_STOCK_ROLLS}`);
    }
    const [row] = await db.select({ count: sql8`count(*)` }).from(inventoryRolls).leftJoin(materials, eq13(inventoryRolls.materialCode, materials.code)).where(conditions.length > 0 ? and11(...conditions) : void 0);
    return Number(row?.count ?? 0);
  }
  async findByMaterialCode(materialCode) {
    const [roll] = await db.select().from(inventoryRolls).where(eq13(inventoryRolls.materialCode, materialCode));
    return roll;
  }
  async findMovements(materialCode, limit = 200) {
    return db.select().from(inventoryRollMovements).where(materialCode ? eq13(inventoryRollMovements.materialCode, materialCode) : void 0).orderBy(desc8(inventoryRollMovements.createdAt)).limit(limit);
  }
  /**
   * Applies a signed roll change to one ledger and records the movement explaining it.
   * Negative values debit. Throws if the result would be negative — physical stock cannot
   * go below zero, and allowing it would corrupt every figure downstream.
   */
  async moveTx(tx, rollId, rolls, movementType, ref) {
    const [locked] = await tx.select().from(inventoryRolls).where(eq13(inventoryRolls.id, rollId)).for("update");
    if (!locked) throw new NotFoundError("Inventory roll not found");
    const next = Number(locked.balanceRolls) + rolls;
    if (next < -1e-4) {
      throw new BadRequestError(
        `Not enough ${locked.materialCode} stock: ${Number(locked.balanceRolls)} rolls available, ${Math.abs(rolls)} required`
      );
    }
    await tx.update(inventoryRolls).set({
      balanceRolls: String(next),
      receivedRolls: rolls > 0 ? String(Number(locked.receivedRolls) + rolls) : locked.receivedRolls,
      issuedRolls: rolls < 0 ? String(Number(locked.issuedRolls) - rolls) : locked.issuedRolls,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq13(inventoryRolls.id, rollId));
    await tx.insert(inventoryRollMovements).values({
      inventoryRollId: rollId,
      materialCode: locked.materialCode,
      movementType,
      rolls: String(rolls),
      balanceAfter: String(next),
      referenceType: ref?.referenceType,
      referenceId: ref?.referenceId,
      note: ref?.note,
      actorUserId: ref?.actorUserId ?? null
    });
    return next;
  }
  /** Creates a ledger and records its opening balance as the first movement. */
  async createWithHistory(data, actorUserId) {
    return db.transaction(async (tx) => {
      const [roll] = await tx.insert(inventoryRolls).values(data).returning();
      await tx.insert(inventoryRollMovements).values({
        inventoryRollId: roll.id,
        materialCode: roll.materialCode,
        movementType: "opening_balance",
        rolls: roll.balanceRolls,
        balanceAfter: roll.balanceRolls,
        note: "Ledger created",
        actorUserId: actorUserId ?? null
      });
      return roll;
    });
  }
  /**
   * Edits a ledger. `rollPerKg` is a plain attribute, but any change to a stock figure is a
   * movement — the difference between the old and new balance is recorded as an adjustment
   * so the history still reconciles to the balance.
   */
  async updateWithHistory(materialCode, patch, note, actorUserId) {
    return db.transaction(async (tx) => {
      const [locked] = await tx.select().from(inventoryRolls).where(eq13(inventoryRolls.materialCode, materialCode)).for("update");
      if (!locked) throw new NotFoundError("Inventory roll not found");
      const nextBalance = patch.balanceRolls !== void 0 ? Number(patch.balanceRolls) : Number(locked.balanceRolls);
      if (nextBalance < 0) {
        throw new BadRequestError("Balance rolls cannot be negative");
      }
      const [updated] = await tx.update(inventoryRolls).set({ ...patch, updatedAt: /* @__PURE__ */ new Date() }).where(eq13(inventoryRolls.materialCode, materialCode)).returning();
      const delta = nextBalance - Number(locked.balanceRolls);
      if (Math.abs(delta) > 1e-4) {
        await tx.insert(inventoryRollMovements).values({
          inventoryRollId: locked.id,
          materialCode,
          movementType: "adjustment",
          rolls: String(delta),
          balanceAfter: String(nextBalance),
          note: note ?? "Manual stock adjustment",
          actorUserId: actorUserId ?? null
        });
      }
      return updated;
    });
  }
  async delete(materialCode) {
    await db.delete(inventoryRolls).where(eq13(inventoryRolls.materialCode, materialCode));
  }
};
var inventoryRollRepository = new InventoryRollRepository();

// src/api/services/inventory-roll.service.ts
function withPerSkuBalance(roll) {
  return { ...roll, perSkuBalance: String(Number(roll.balanceRolls) * Number(roll.rollPerKg)) };
}
function assertNonNegative(label, value) {
  if (value === void 0) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError(`${label} must be zero or greater`, 400);
  }
}
var InventoryRollService = class {
  async getInventoryRolls(filters) {
    const [rows, total] = await Promise.all([
      inventoryRollRepository.findAll(filters),
      inventoryRollRepository.countAll(filters)
    ]);
    return { items: rows.map(withPerSkuBalance), total };
  }
  async getInventoryRollByMaterialCode(materialCode) {
    const roll = await inventoryRollRepository.findByMaterialCode(materialCode);
    if (!roll) throw new NotFoundError(Messages.notFound("Inventory roll"));
    return withPerSkuBalance(roll);
  }
  /** Append-only movement history for one material, or the whole ledger. */
  async getMovements(materialCode, limit) {
    const rows = await inventoryRollRepository.findMovements(materialCode, limit);
    return rows.map((r) => ({ ...r, rolls: Number(r.rolls), balanceAfter: Number(r.balanceAfter) }));
  }
  async createInventoryRoll(data) {
    const material = await materialRepository.findByCode(data.materialCode);
    if (!material) throw new NotFoundError(Messages.notFound("Material"));
    const existing = await inventoryRollRepository.findByMaterialCode(data.materialCode);
    if (existing) {
      throw new ConflictError(`A stock ledger already exists for ${data.materialCode}`);
    }
    assertNonNegative("Opening stock", data.openingStock);
    assertNonNegative("Received rolls", data.receivedRolls);
    assertNonNegative("Issued rolls", data.issuedRolls);
    assertNonNegative("Rolls per kg", data.rollPerKg);
    const openingStock = data.openingStock ?? 0;
    const receivedRolls = data.receivedRolls ?? 0;
    const issuedRolls = data.issuedRolls ?? 0;
    const balanceRolls = openingStock + receivedRolls - issuedRolls;
    if (balanceRolls < 0) {
      throw new ApiError(
        `Issued rolls (${issuedRolls}) cannot exceed opening plus received (${openingStock + receivedRolls})`,
        400
      );
    }
    const actorUserId = await userService.assertActor(data.actorUserId);
    const roll = await inventoryRollRepository.createWithHistory(
      {
        materialCode: data.materialCode,
        openingStock: String(openingStock),
        receivedRolls: String(receivedRolls),
        issuedRolls: String(issuedRolls),
        balanceRolls: String(balanceRolls),
        rollPerKg: String(data.rollPerKg ?? 0)
      },
      actorUserId
    );
    return withPerSkuBalance(roll);
  }
  /**
   * Edits a ledger. Any change to the three stock figures re-derives the balance, and the
   * difference is written to the movement history as an adjustment, so the history always
   * reconciles to the balance.
   */
  async updateInventoryRoll(materialCode, data) {
    const roll = await inventoryRollRepository.findByMaterialCode(materialCode);
    if (!roll) throw new NotFoundError(Messages.notFound("Inventory roll"));
    assertNonNegative("Opening stock", data.openingStock);
    assertNonNegative("Received rolls", data.receivedRolls);
    assertNonNegative("Issued rolls", data.issuedRolls);
    assertNonNegative("Rolls per kg", data.rollPerKg);
    const openingStock = data.openingStock ?? Number(roll.openingStock);
    const receivedRolls = data.receivedRolls ?? Number(roll.receivedRolls);
    const issuedRolls = data.issuedRolls ?? Number(roll.issuedRolls);
    const balanceRolls = openingStock + receivedRolls - issuedRolls;
    if (balanceRolls < 0) {
      throw new ApiError(
        `Issued rolls (${issuedRolls}) cannot exceed opening plus received (${openingStock + receivedRolls})`,
        400
      );
    }
    const actorUserId = await userService.assertActor(data.actorUserId);
    const updated = await inventoryRollRepository.updateWithHistory(
      materialCode,
      {
        openingStock: String(openingStock),
        receivedRolls: String(receivedRolls),
        issuedRolls: String(issuedRolls),
        balanceRolls: String(balanceRolls),
        ...data.rollPerKg !== void 0 ? { rollPerKg: String(data.rollPerKg) } : {}
      },
      data.note,
      actorUserId
    );
    if (!updated) throw new NotFoundError(Messages.notFound("Inventory roll"));
    return withPerSkuBalance(updated);
  }
  /**
   * Removes a ledger. Blocked while production has drawn against the material — deleting it
   * would orphan those issuances and silently change what the floor believes it holds.
   */
  async deleteInventoryRoll(materialCode) {
    const roll = await inventoryRollRepository.findByMaterialCode(materialCode);
    if (!roll) throw new NotFoundError(Messages.notFound("Inventory roll"));
    if (Number(roll.issuedRolls) > 0) {
      throw new ApiError(
        `Cannot delete the ${materialCode} ledger: ${Number(roll.issuedRolls)} rolls have already been issued to production. Adjust the stock instead.`,
        400
      );
    }
    await inventoryRollRepository.delete(materialCode);
  }
};
var inventoryRollService = new InventoryRollService();

// src/api/controllers/inventory-roll.controller.ts
var InventoryRollController = class {
  /**
   * Returns `{ data, meta }`: the rows plus the unfiltered total, so the client can page
   * without a second request. `data` stays a plain array, matching every other list.
   */
  getInventoryRolls = asyncHandler(async (req, res) => {
    const query = req.validatedQuery ?? req.query;
    const { items, total } = await inventoryRollService.getInventoryRolls(query);
    res.json({ data: items, meta: { total, limit: query?.limit, offset: query?.offset } });
  });
  getMovements = asyncHandler(async (req, res) => {
    const { materialCode, limit } = req.validatedQuery ?? req.query;
    const data = await inventoryRollService.getMovements(materialCode, limit);
    res.json({ data });
  });
  getInventoryRollByMaterialCode = asyncHandler(async (req, res) => {
    const { materialCode } = req.validatedParams ?? req.params;
    const data = await inventoryRollService.getInventoryRollByMaterialCode(materialCode);
    res.json({ data });
  });
  createInventoryRoll = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await inventoryRollService.createInventoryRoll(input);
    res.status(201).json({ data });
  });
  updateInventoryRoll = asyncHandler(async (req, res) => {
    const { materialCode } = req.validatedParams ?? req.params;
    const body = req.validatedBody ?? req.body;
    const updated = await inventoryRollService.updateInventoryRoll(materialCode, body);
    res.json({ data: updated });
  });
  deleteInventoryRoll = asyncHandler(async (req, res) => {
    const { materialCode } = req.validatedParams ?? req.params;
    await inventoryRollService.deleteInventoryRoll(materialCode);
    res.status(204).send();
  });
};
var inventoryRollController = new InventoryRollController();

// src/api/validations/inventory-roll.validation.ts
import { z as z18 } from "zod";
var createInventoryRollSchema = z18.object({
  body: z18.object({
    materialCode: z18.string().trim().min(1, "Material code is required"),
    openingStock: z18.coerce.number().min(0, "Opening stock cannot be negative").optional(),
    receivedRolls: z18.coerce.number().min(0, "Received rolls cannot be negative").optional(),
    issuedRolls: z18.coerce.number().min(0, "Issued rolls cannot be negative").optional(),
    rollPerKg: z18.coerce.number().min(0, "Rolls per kg cannot be negative").optional(),
    actorUserId: z18.coerce.number().int().positive().optional()
  })
});
var updateInventoryRollSchema = z18.object({
  body: z18.object({
    openingStock: z18.coerce.number().min(0, "Opening stock cannot be negative").optional(),
    receivedRolls: z18.coerce.number().min(0, "Received rolls cannot be negative").optional(),
    issuedRolls: z18.coerce.number().min(0, "Issued rolls cannot be negative").optional(),
    rollPerKg: z18.coerce.number().min(0, "Rolls per kg cannot be negative").optional(),
    /** Reason for the adjustment — recorded on the movement row. */
    note: z18.string().max(500).optional(),
    actorUserId: z18.coerce.number().int().positive().optional()
  })
});
var inventoryRollParamsSchema = z18.object({
  materialCode: z18.string().min(1, "Material code is required")
});
var listInventoryRollsQuerySchema = z18.object({
  materialCode: z18.string().optional(),
  search: z18.string().optional(),
  type: z18.string().optional(),
  stockStatus: z18.enum(["in", "low", "out"]).optional(),
  sortBy: z18.enum(["materialCode", "balanceRolls", "receivedRolls", "issuedRolls", "updatedAt"]).optional(),
  sortDir: z18.enum(["asc", "desc"]).optional(),
  limit: z18.coerce.number().int().positive().max(500).optional(),
  offset: z18.coerce.number().int().min(0).optional()
});
var listRollMovementsQuerySchema = z18.object({
  materialCode: z18.string().optional(),
  limit: z18.coerce.number().int().positive().max(500).optional()
});

// src/api/routes/inventory-roll.routes.ts
var router12 = Router13();
router12.get("/", validateQuery(listInventoryRollsQuerySchema), inventoryRollController.getInventoryRolls);
router12.get(
  "/movements",
  validateQuery(listRollMovementsQuerySchema),
  inventoryRollController.getMovements
);
router12.post("/", validateRequest(createInventoryRollSchema), inventoryRollController.createInventoryRoll);
router12.get(
  "/:materialCode",
  validateParams(inventoryRollParamsSchema),
  inventoryRollController.getInventoryRollByMaterialCode
);
router12.put(
  "/:materialCode",
  validateParams(inventoryRollParamsSchema),
  validateRequest(updateInventoryRollSchema),
  inventoryRollController.updateInventoryRoll
);
router12.delete(
  "/:materialCode",
  validateParams(inventoryRollParamsSchema),
  inventoryRollController.deleteInventoryRoll
);
var inventory_roll_routes_default = router12;

// src/api/routes/inventory.routes.ts
var router13 = Router14();
router13.use("/rolls", inventory_roll_routes_default);
router13.post("/purchases", validateRequest(createPurchaseSchema), inventoryController.createPurchase);
router13.get("/purchases", validateQuery(listPurchasesQuerySchema), inventoryController.getPurchases);
router13.get("/purchases/:id", validateParams(idParamsSchema), inventoryController.getPurchase);
router13.put("/purchases/:id", validateParams(idParamsSchema), validateRequest(updatePurchaseSchema), inventoryController.updatePurchase);
router13.delete("/purchases/:id", validateParams(idParamsSchema), inventoryController.deletePurchase);
router13.get("/stock", validateQuery(listStockQuerySchema), inventoryController.getStock);
var inventory_routes_default = router13;

// src/api/routes/thread-inventory.routes.ts
import { Router as Router15 } from "express";

// src/api/services/thread-inventory.service.ts
var ThreadInventoryService = class {
  /* ========================= Stock ========================= */
  async getStocks(filters) {
    const rows = await threadInventoryRepository.findStocks(filters);
    return rows.map((r) => ({
      ...r,
      balanceKg: Number(r.balanceKg),
      receivedKg: Number(r.receivedKg),
      consumedKg: Number(r.consumedKg)
    }));
  }
  /** Stock split into the two pools the floor thinks in terms of. */
  async getStockSummary() {
    const rows = await this.getStocks();
    const primary = rows.filter((r) => r.stockType === "primary");
    const secondary = rows.filter((r) => r.stockType === "secondary");
    return {
      primary,
      secondary,
      totals: {
        primaryKg: primary.reduce((a, r) => a + r.balanceKg, 0),
        secondaryKg: secondary.reduce((a, r) => a + r.balanceKg, 0),
        primaryCount: primary.length,
        secondaryCount: secondary.length
      }
    };
  }
  /**
   * Creates a thread ledger by hand (the usual source is receiving or dyeing, but a facility
   * needs to be able to record stock it already holds).
   */
  async createStock(input) {
    const actorUserId = await userService.assertActor(input.actorUserId);
    const colorName = input.colorName.trim();
    if (!colorName) throw new ApiError("Colour name is required", 400);
    const colorCode = input.stockType === "secondary" ? (input.colorCode ?? "").trim() : null;
    if (input.stockType === "secondary" && !colorCode) {
      throw new ApiError("Dyed (secondary) stock requires a colour code", 400);
    }
    if (input.openingKg !== void 0 && input.openingKg < 0) {
      throw new ApiError("Opening balance cannot be negative", 400);
    }
    const clash = (await threadInventoryRepository.findStocks({
      stockType: input.stockType,
      denier: input.denier
    })).find(
      (s) => s.colorName.toLowerCase() === colorName.toLowerCase() && (s.colorCode ?? "").toLowerCase() === (colorCode ?? "").toLowerCase()
    );
    if (clash) {
      throw new ApiError(`A ${input.stockType} ledger already exists for this colour and denier`, 400);
    }
    return threadInventoryRepository.createStockWithHistory(
      { stockType: input.stockType, denier: input.denier, colorName, colorCode },
      input.openingKg ?? 0,
      actorUserId
    );
  }
  /** Edits a thread ledger; a balance change is recorded as an adjustment movement. */
  async updateStock(id, input) {
    const existing = await threadInventoryRepository.findStockById(id);
    if (!existing) throw new NotFoundError("Thread stock not found");
    const actorUserId = await userService.assertActor(input.actorUserId);
    if (input.balanceKg !== void 0 && input.balanceKg < 0) {
      throw new ApiError("Balance cannot be negative", 400);
    }
    if (input.colorName !== void 0 && !input.colorName.trim()) {
      throw new ApiError("Colour name is required", 400);
    }
    return threadInventoryRepository.updateStockWithHistory(
      id,
      {
        ...input.colorName !== void 0 ? { colorName: input.colorName.trim() } : {},
        ...input.colorCode !== void 0 ? { colorCode: input.colorCode ? input.colorCode.trim() : null } : {},
        ...input.balanceKg !== void 0 ? { balanceKg: input.balanceKg } : {}
      },
      input.note,
      actorUserId
    );
  }
  /**
   * Removes a thread ledger. Blocked once any of it has been consumed — deleting it would
   * orphan the dye batches and production draws that reference it.
   */
  async deleteStock(id) {
    const existing = await threadInventoryRepository.findStockById(id);
    if (!existing) throw new NotFoundError("Thread stock not found");
    const consumedByProcess = await threadInventoryRepository.findConsumedByProcessKg(id);
    if (consumedByProcess > 0) {
      throw new ApiError(
        `Cannot delete ${existing.colorName} ${existing.denier}D: ${consumedByProcess} kg has already been issued to production or dyeing. Adjust the balance instead.`,
        400
      );
    }
    await threadInventoryRepository.deleteStock(id);
  }
  async getMovements(threadStockId, limit) {
    const rows = await threadInventoryRepository.findMovements(threadStockId, limit);
    return rows.map((r) => ({
      ...r,
      weightKg: Number(r.weightKg),
      balanceAfterKg: Number(r.balanceAfterKg)
    }));
  }
  /* ======================= Purchases ======================= */
  async getPurchases(filters) {
    const rows = await threadInventoryRepository.findPurchases(filters);
    return rows.map((r) => ({
      ...r,
      weightPerCtnKg: Number(r.weightPerCtnKg),
      totalWeightKg: Number(r.totalWeightKg)
    }));
  }
  /**
   * Records a thread receipt and credits primary (undyed) stock in the same transaction —
   * there is no approval step, exactly like the printed purchase records.
   */
  async createPurchase(input) {
    const actorUserId = await userService.assertActor(input.actorUserId);
    if (!(input.totalCtns > 0)) throw new ApiError("Total cartons must be greater than zero", 400);
    if (!(input.weightPerCtnKg > 0)) {
      throw new ApiError("Weight per carton must be greater than zero", 400);
    }
    const totalWeightKg = input.weightPerCtnKg * input.totalCtns;
    return threadInventoryRepository.createPurchaseWithStock(
      {
        receivedDate: input.receivedDate,
        itemName: "Thread",
        denier: input.denier,
        threadColor: input.threadColor,
        vendor: input.vendor,
        invoiceNumber: input.invoiceNumber,
        totalCtns: input.totalCtns,
        weightPerCtnKg: String(input.weightPerCtnKg),
        totalWeightKg: String(totalWeightKg),
        notes: input.notes
      },
      { denier: input.denier, colorName: input.threadColor, weightKg: totalWeightKg },
      actorUserId
    );
  }
  /** Deleting a receipt reverses its stock credit; blocked if the thread is already used. */
  async deletePurchase(id, actorUserId) {
    const existing = await threadInventoryRepository.findPurchaseById(id);
    if (!existing) throw new NotFoundError("Thread purchase not found");
    const actor = await userService.assertActor(actorUserId);
    await threadInventoryRepository.deletePurchaseWithStock(
      id,
      {
        denier: existing.denier,
        colorName: existing.threadColor,
        weightKg: Number(existing.totalWeightKg)
      },
      actor
    );
  }
  /* ========================= Dyeing ========================= */
  async getDyeBatches() {
    const rows = await threadInventoryRepository.findDyeBatches();
    return rows.map((r) => ({
      ...r,
      inputWeightKg: Number(r.inputWeightKg),
      outputWeightKg: Number(r.outputWeightKg)
    }));
  }
  async nextBatchNumber() {
    const last = await threadInventoryRepository.findLastBatchNumber();
    const lastSeq = last ? Number(last.replace(/\D/g, "")) : 0;
    const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    return `DYE-${String(next).padStart(5, "0")}`;
  }
  /**
   * Dyes undyed thread into a colour: debits primary, credits secondary, atomically.
   *
   * Output may legitimately be less than input (process loss), but more output than input
   * would be creating thread from nothing — that is rejected.
   */
  async createDyeBatch(input) {
    const actorUserId = await userService.assertActor(input.actorUserId);
    if (!(input.inputWeightKg > 0)) throw new ApiError("Input weight must be greater than zero", 400);
    if (!(input.outputWeightKg > 0)) throw new ApiError("Output weight must be greater than zero", 400);
    if (input.outputWeightKg > input.inputWeightKg) {
      throw new ApiError(
        `Dyed output (${input.outputWeightKg} kg) cannot exceed the undyed input (${input.inputWeightKg} kg)`,
        400
      );
    }
    if (!input.toColorName?.trim()) throw new ApiError("Colour name is required", 400);
    if (!input.toColorCode?.trim()) throw new ApiError("Colour code is required", 400);
    const batchNumber = await this.nextBatchNumber();
    return threadInventoryRepository.createDyeBatchTransaction(
      {
        batchNumber,
        denier: input.denier,
        colorName: input.toColorName.trim(),
        colorCode: input.toColorCode.trim(),
        inputWeightKg: String(input.inputWeightKg),
        outputWeightKg: String(input.outputWeightKg),
        notes: input.notes,
        actorUserId
      },
      { denier: input.denier, colorName: input.fromColorName },
      { denier: input.denier, colorName: input.toColorName.trim(), colorCode: input.toColorCode.trim() },
      { inputKg: input.inputWeightKg, outputKg: input.outputWeightKg },
      actorUserId
    );
  }
};
var threadInventoryService = new ThreadInventoryService();

// src/api/controllers/thread-inventory.controller.ts
var ThreadInventoryController = class {
  /* ---- Stock ---- */
  getStocks = asyncHandler(async (req, res) => {
    const query = req.validatedQuery ?? req.query;
    const data = await threadInventoryService.getStocks(query);
    res.json({ data });
  });
  /** Primary (undyed) and secondary (dyed) pools with their totals. */
  getStockSummary = asyncHandler(async (_req, res) => {
    const data = await threadInventoryService.getStockSummary();
    res.json({ data });
  });
  createStock = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await threadInventoryService.createStock(input);
    res.status(201).json({ data });
  });
  updateStock = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    const data = await threadInventoryService.updateStock(Number(id), input);
    res.json({ data });
  });
  deleteStock = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await threadInventoryService.deleteStock(Number(id));
    res.status(204).send();
  });
  getMovements = asyncHandler(async (req, res) => {
    const { threadStockId, limit } = req.validatedQuery ?? req.query;
    const data = await threadInventoryService.getMovements(threadStockId, limit);
    res.json({ data });
  });
  /* ---- Purchases ---- */
  getPurchases = asyncHandler(async (req, res) => {
    const query = req.validatedQuery ?? req.query;
    const data = await threadInventoryService.getPurchases(query);
    res.json({ data });
  });
  createPurchase = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await threadInventoryService.createPurchase(input);
    res.status(201).json({ data });
  });
  deletePurchase = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await threadInventoryService.deletePurchase(Number(id));
    res.status(204).send();
  });
  /* ---- Dyeing ---- */
  getDyeBatches = asyncHandler(async (_req, res) => {
    const data = await threadInventoryService.getDyeBatches();
    res.json({ data });
  });
  createDyeBatch = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    const data = await threadInventoryService.createDyeBatch(input);
    res.status(201).json({ data });
  });
};
var threadInventoryController = new ThreadInventoryController();

// src/api/validations/thread-inventory.validation.ts
import { z as z19 } from "zod";
var denierEnum2 = z19.enum(["45", "75", "100", "150"]);
var baseColorEnum = z19.enum(["White", "Black"]);
var createThreadPurchaseSchema = z19.object({
  body: z19.object({
    receivedDate: z19.string().min(1, "Received date is required"),
    denier: denierEnum2,
    threadColor: baseColorEnum,
    vendor: z19.string().trim().min(1, "Vendor is required"),
    invoiceNumber: z19.string().trim().min(1, "Invoice number is required"),
    totalCtns: z19.coerce.number().int().positive("Total cartons must be greater than 0"),
    weightPerCtnKg: z19.coerce.number().positive("Weight per carton must be greater than 0"),
    notes: z19.string().optional(),
    actorUserId: z19.coerce.number().int().positive().optional()
  })
});
var createDyeBatchSchema = z19.object({
  body: z19.object({
    denier: denierEnum2,
    fromColorName: baseColorEnum,
    toColorName: z19.string().trim().min(1, "Colour name is required"),
    toColorCode: z19.string().trim().min(1, "Colour code is required"),
    inputWeightKg: z19.coerce.number().positive("Input weight must be greater than 0"),
    outputWeightKg: z19.coerce.number().positive("Output weight must be greater than 0"),
    notes: z19.string().optional(),
    actorUserId: z19.coerce.number().int().positive().optional()
  })
});
var createThreadStockSchema = z19.object({
  body: z19.object({
    stockType: z19.enum(["primary", "secondary"]),
    denier: denierEnum2,
    colorName: z19.string().trim().min(1, "Colour name is required"),
    /** Required for dyed (secondary) stock; ignored for undyed. */
    colorCode: z19.string().trim().optional().nullable(),
    openingKg: z19.coerce.number().min(0, "Opening balance cannot be negative").optional(),
    actorUserId: z19.coerce.number().int().positive().optional()
  })
});
var updateThreadStockSchema = z19.object({
  body: z19.object({
    colorName: z19.string().trim().min(1).optional(),
    colorCode: z19.string().trim().optional().nullable(),
    balanceKg: z19.coerce.number().min(0, "Balance cannot be negative").optional(),
    note: z19.string().max(500).optional(),
    actorUserId: z19.coerce.number().int().positive().optional()
  })
});
var listThreadStocksQuerySchema = z19.object({
  stockType: z19.enum(["primary", "secondary"]).optional(),
  denier: denierEnum2.optional(),
  colorName: z19.string().optional()
});
var listThreadPurchasesQuerySchema = z19.object({
  vendor: z19.string().optional(),
  denier: denierEnum2.optional()
});
var listThreadMovementsQuerySchema = z19.object({
  threadStockId: z19.coerce.number().int().positive().optional(),
  limit: z19.coerce.number().int().positive().max(500).optional()
});

// src/api/routes/thread-inventory.routes.ts
var router14 = Router15();
router14.get("/stocks", validateQuery(listThreadStocksQuerySchema), threadInventoryController.getStocks);
router14.get("/stocks/summary", threadInventoryController.getStockSummary);
router14.post("/stocks", validateRequest(createThreadStockSchema), threadInventoryController.createStock);
router14.put(
  "/stocks/:id",
  validateParams(idParamsSchema),
  validateRequest(updateThreadStockSchema),
  threadInventoryController.updateStock
);
router14.delete("/stocks/:id", validateParams(idParamsSchema), threadInventoryController.deleteStock);
router14.get(
  "/movements",
  validateQuery(listThreadMovementsQuerySchema),
  threadInventoryController.getMovements
);
router14.get(
  "/purchases",
  validateQuery(listThreadPurchasesQuerySchema),
  threadInventoryController.getPurchases
);
router14.post(
  "/purchases",
  validateRequest(createThreadPurchaseSchema),
  threadInventoryController.createPurchase
);
router14.delete(
  "/purchases/:id",
  validateParams(idParamsSchema),
  threadInventoryController.deletePurchase
);
router14.get("/dye-batches", threadInventoryController.getDyeBatches);
router14.post("/dye-batches", validateRequest(createDyeBatchSchema), threadInventoryController.createDyeBatch);
var thread_inventory_routes_default = router14;

// src/api/routes/thread-service-provider.routes.ts
import { Router as Router16 } from "express";

// src/api/repositories/thread-service-provider.repository.ts
import { asc as asc8, eq as eq14 } from "drizzle-orm";
var ThreadServiceProviderRepository = class {
  findAll() {
    return db.select().from(threadServiceProviders).orderBy(asc8(threadServiceProviders.name));
  }
  async findById(id) {
    const [row] = await db.select().from(threadServiceProviders).where(eq14(threadServiceProviders.id, id));
    return row;
  }
  async create(data) {
    const [row] = await db.insert(threadServiceProviders).values(data).returning();
    return row;
  }
  async update(id, data) {
    const [row] = await db.update(threadServiceProviders).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq14(threadServiceProviders.id, id)).returning();
    return row;
  }
  async remove(id) {
    const [row] = await db.delete(threadServiceProviders).where(eq14(threadServiceProviders.id, id)).returning();
    return row;
  }
};
var threadServiceProviderRepository = new ThreadServiceProviderRepository();

// src/api/services/thread-service-provider.service.ts
var ThreadServiceProviderService = class {
  getAll() {
    return threadServiceProviderRepository.findAll();
  }
  async getOne(id) {
    const row = await threadServiceProviderRepository.findById(id);
    if (!row) throw new NotFoundError(Messages.notFound(Entity.THREAD_SERVICE_PROVIDER));
    return row;
  }
  create(data) {
    return threadServiceProviderRepository.create(data);
  }
  async update(id, data) {
    await this.getOne(id);
    return threadServiceProviderRepository.update(id, data);
  }
  async remove(id) {
    await this.getOne(id);
    await threadServiceProviderRepository.remove(id);
  }
};
var threadServiceProviderService = new ThreadServiceProviderService();

// src/api/controllers/thread-service-provider.controller.ts
var ThreadServiceProviderController = class {
  getAll = asyncHandler(async (_req, res) => {
    res.json({ data: await threadServiceProviderService.getAll() });
  });
  create = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    res.status(201).json({ data: await threadServiceProviderService.create(input) });
  });
  update = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    res.json({ data: await threadServiceProviderService.update(Number(id), input) });
  });
  remove = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await threadServiceProviderService.remove(Number(id));
    res.status(204).send();
  });
};
var threadServiceProviderController = new ThreadServiceProviderController();

// src/api/validations/thread-service-provider.validation.ts
import { z as z20 } from "zod";
var createThreadServiceProviderSchema = z20.object({
  body: z20.object({
    name: z20.string().trim().min(1, "Name is required"),
    contact: z20.string().trim().max(100).optional(),
    address: z20.string().trim().optional(),
    notes: z20.string().trim().optional()
  })
});
var updateThreadServiceProviderSchema = z20.object({
  body: createThreadServiceProviderSchema.shape.body.partial()
});

// src/api/routes/thread-service-provider.routes.ts
var router15 = Router16();
router15.get("/", threadServiceProviderController.getAll);
router15.post("/", validateRequest(createThreadServiceProviderSchema), threadServiceProviderController.create);
router15.put(
  "/:id",
  validateParams(idParamsSchema),
  validateRequest(updateThreadServiceProviderSchema),
  threadServiceProviderController.update
);
router15.delete("/:id", validateParams(idParamsSchema), threadServiceProviderController.remove);
var thread_service_provider_routes_default = router15;

// src/api/routes/thread-dyeing.routes.ts
import { Router as Router17 } from "express";

// src/api/repositories/thread-dyeing.repository.ts
import { desc as desc9, eq as eq15, inArray as inArray5 } from "drizzle-orm";
var ThreadDyeingRepository = class {
  async findSends() {
    return db.select({
      id: threadDyeingSends.id,
      serviceProviderId: threadDyeingSends.serviceProviderId,
      serviceProviderName: threadServiceProviders.name,
      sendingDate: threadDyeingSends.sendingDate,
      senderTrackingNumber: threadDyeingSends.senderTrackingNumber,
      denier: threadDyeingSends.denier,
      baseThreadColor: threadDyeingSends.baseThreadColor,
      totalWeightSent: threadDyeingSends.totalWeightSent,
      status: threadDyeingSends.status,
      createdAt: threadDyeingSends.createdAt
    }).from(threadDyeingSends).leftJoin(threadServiceProviders, eq15(threadDyeingSends.serviceProviderId, threadServiceProviders.id)).orderBy(desc9(threadDyeingSends.sendingDate), desc9(threadDyeingSends.id));
  }
  async findAllocationsForSends(sendIds) {
    if (sendIds.length === 0) return [];
    return db.select().from(threadDyeingAllocations).where(inArray5(threadDyeingAllocations.threadDyeingSendId, sendIds));
  }
  async findReceivesForSends(sendIds) {
    if (sendIds.length === 0) return [];
    return db.select().from(threadDyeingReceives).where(inArray5(threadDyeingReceives.threadDyeingSendId, sendIds));
  }
  async findSendById(id) {
    const [send] = await db.select().from(threadDyeingSends).where(eq15(threadDyeingSends.id, id));
    return send;
  }
  /**
   * Records a send + its colour allocations and deducts the total from Undyed (primary)
   * stock — all atomic. The stock debit runs through the shared `moveStockTx`, so it locks
   * the ledger row and refuses to go negative just like every other thread outflow.
   */
  async sendForDyeingTransaction(send, allocations, actorUserId) {
    return db.transaction(async (tx) => {
      const [sendRow] = await tx.insert(threadDyeingSends).values(send).returning();
      const allocRows = await tx.insert(threadDyeingAllocations).values(allocations.map((a) => ({ ...a, threadDyeingSendId: sendRow.id }))).returning();
      const primary = await threadInventoryRepository.getOrCreateStockTx(tx, {
        stockType: "primary",
        denier: send.denier,
        colorName: send.baseThreadColor,
        colorCode: null
      });
      await threadInventoryRepository.moveStockTx(
        tx,
        primary.id,
        -Number(send.totalWeightSent),
        "dye_consume",
        {
          referenceType: "thread_dyeing_send",
          referenceId: sendRow.id,
          note: `Sent for dyeing (${allocRows.length} colour${allocRows.length === 1 ? "" : "s"})`,
          actorUserId
        }
      );
      return { ...sendRow, allocations: allocRows };
    });
  }
  /**
   * Receives a send back dyed: one Dyed (secondary) stock credit per allocation colour, then
   * advances the send status — all atomic. Re-receiving a completed send is refused.
   */
  async receiveDyedTransaction(sendId, receive, received, actorUserId) {
    return db.transaction(async (tx) => {
      const [send] = await tx.select().from(threadDyeingSends).where(eq15(threadDyeingSends.id, sendId)).for("update");
      if (!send) throw new NotFoundError("Thread dyeing send not found");
      if (send.status === "received") {
        throw new BadRequestError("This send has already been received in full");
      }
      const allocations = await tx.select().from(threadDyeingAllocations).where(eq15(threadDyeingAllocations.threadDyeingSendId, sendId));
      const allocById = new Map(allocations.map((a) => [a.id, a]));
      const [receiveRow] = await tx.insert(threadDyeingReceives).values({ ...receive, threadDyeingSendId: sendId }).returning();
      for (const r of received) {
        const alloc = allocById.get(r.id);
        if (!alloc) throw new BadRequestError(`Allocation ${r.id} does not belong to this send`);
        const code = r.colorCode?.trim() || alloc.colorCode?.trim() || alloc.pantone?.trim() || alloc.colorName.trim();
        await tx.update(threadDyeingAllocations).set({ colorCode: code, receivedWeight: String(r.receivedWeight) }).where(eq15(threadDyeingAllocations.id, alloc.id));
        const secondary = await threadInventoryRepository.getOrCreateStockTx(tx, {
          stockType: "secondary",
          denier: send.denier,
          colorName: alloc.colorName,
          colorCode: code
        });
        await threadInventoryRepository.moveStockTx(tx, secondary.id, r.receivedWeight, "dye_produce", {
          referenceType: "thread_dyeing_receive",
          referenceId: receiveRow.id,
          note: `Received dyed ${alloc.colorName} (${code}) from provider`,
          actorUserId
        });
      }
      await tx.update(threadDyeingSends).set({ status: "received", updatedAt: /* @__PURE__ */ new Date() }).where(eq15(threadDyeingSends.id, sendId));
      return receiveRow;
    });
  }
};
var threadDyeingRepository = new ThreadDyeingRepository();

// src/api/services/thread-dyeing.service.ts
var ThreadDyeingService = class {
  /** Sends with their colour allocations and receive records folded in. */
  async listSends() {
    const sends = await threadDyeingRepository.findSends();
    const ids = sends.map((s) => s.id);
    const [allocations, receives] = await Promise.all([
      threadDyeingRepository.findAllocationsForSends(ids),
      threadDyeingRepository.findReceivesForSends(ids)
    ]);
    return sends.map((s) => ({
      ...s,
      totalWeightSent: Number(s.totalWeightSent),
      allocations: allocations.filter((a) => a.threadDyeingSendId === s.id).map((a) => ({ ...a, allocatedWeight: Number(a.allocatedWeight) })),
      receives: receives.filter((r) => r.threadDyeingSendId === s.id)
    }));
  }
  /**
   * Send undyed thread for dyeing. Allocation weights must sum to the total sent (this is the
   * hard rule), and the total is deducted from undyed stock in the repository transaction.
   */
  async sendForDyeing(input) {
    const provider = await threadServiceProviderRepository.findById(input.serviceProviderId);
    if (!provider) throw new NotFoundError(Messages.notFound(Entity.THREAD_SERVICE_PROVIDER));
    const sumAllocated = input.allocations.reduce((a, x) => a + x.allocatedWeight, 0);
    if (Math.abs(sumAllocated - input.totalWeightSent) > 5e-4) {
      throw new BadRequestError(
        `Allocated colour weights (${sumAllocated.toFixed(3)} kg) must equal the total weight sent (${input.totalWeightSent.toFixed(3)} kg)`
      );
    }
    return threadDyeingRepository.sendForDyeingTransaction(
      {
        serviceProviderId: input.serviceProviderId,
        sendingDate: input.sendingDate,
        senderTrackingNumber: input.senderTrackingNumber,
        denier: input.denier,
        baseThreadColor: input.baseThreadColor,
        totalWeightSent: String(input.totalWeightSent)
      },
      input.allocations.map((a) => ({
        colorName: a.colorName,
        pantone: a.pantone,
        colorCode: a.colorCode,
        allocatedWeight: String(a.allocatedWeight)
      })),
      input.actorUserId
    );
  }
  /** Receive a send back dyed — credits dyed stock per allocation using the entered
   *  after-weight, and finalises each colour code. */
  async receiveDyed(sendId, input) {
    const send = await threadDyeingRepository.findSendById(sendId);
    if (!send) throw new NotFoundError(Messages.notFound(Entity.THREAD_DYEING_SEND));
    return threadDyeingRepository.receiveDyedTransaction(
      sendId,
      {
        receivingDate: input.receivingDate,
        receiverTrackingNumber: input.receiverTrackingNumber,
        invoiceNumber: input.invoiceNumber
      },
      input.allocations.map((a) => ({
        id: a.id,
        colorCode: a.colorCode,
        receivedWeight: a.receivedWeight
      })),
      input.actorUserId
    );
  }
};
var threadDyeingService = new ThreadDyeingService();

// src/api/controllers/thread-dyeing.controller.ts
var ThreadDyeingController = class {
  listSends = asyncHandler(async (_req, res) => {
    res.json({ data: await threadDyeingService.listSends() });
  });
  send = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    res.status(201).json({ data: await threadDyeingService.sendForDyeing(input) });
  });
  receive = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    res.status(201).json({ data: await threadDyeingService.receiveDyed(Number(id), input) });
  });
};
var threadDyeingController = new ThreadDyeingController();

// src/api/validations/thread-dyeing.validation.ts
import { z as z21 } from "zod";
var denierEnum3 = z21.enum(["45", "75", "100", "150"]);
var baseColorEnum2 = z21.enum(["White", "Black"]);
var createDyeingSendSchema = z21.object({
  body: z21.object({
    serviceProviderId: z21.coerce.number().int().positive("Service provider is required"),
    sendingDate: z21.string().min(1, "Sending date is required"),
    senderTrackingNumber: z21.string().trim().optional(),
    denier: denierEnum3,
    baseThreadColor: baseColorEnum2,
    totalWeightSent: z21.coerce.number().positive("Total weight sent must be greater than 0"),
    allocations: z21.array(
      z21.object({
        colorName: z21.string().trim().min(1, "Colour name is required"),
        pantone: z21.string().trim().optional(),
        colorCode: z21.string().trim().optional(),
        allocatedWeight: z21.coerce.number().positive("Allocated weight must be greater than 0")
      })
    ).min(1, "At least one colour allocation is required"),
    actorUserId: z21.coerce.number().int().positive().optional()
  })
});
var receiveDyeingSchema = z21.object({
  body: z21.object({
    receivingDate: z21.string().min(1, "Receiving date is required"),
    receiverTrackingNumber: z21.string().trim().optional(),
    invoiceNumber: z21.string().trim().optional(),
    allocations: z21.array(
      z21.object({
        id: z21.coerce.number().int().positive(),
        colorCode: z21.string().trim().optional(),
        receivedWeight: z21.coerce.number().positive("Received weight must be greater than 0")
      })
    ).min(1, "At least one colour must be received"),
    actorUserId: z21.coerce.number().int().positive().optional()
  })
});

// src/api/routes/thread-dyeing.routes.ts
var router16 = Router17();
router16.get("/sends", threadDyeingController.listSends);
router16.post("/sends", validateRequest(createDyeingSendSchema), threadDyeingController.send);
router16.post(
  "/sends/:id/receive",
  validateParams(idParamsSchema),
  validateRequest(receiveDyeingSchema),
  threadDyeingController.receive
);
var thread_dyeing_routes_default = router16;

// src/api/routes/ink.routes.ts
import { Router as Router18 } from "express";

// src/api/repositories/ink.repository.ts
import { desc as desc10, eq as eq16, sql as sql9 } from "drizzle-orm";
var InkRepository = class {
  /* ---------------- Purchases ---------------- */
  listPurchases() {
    return db.select().from(inkPurchases).orderBy(desc10(inkPurchases.reportDate), desc10(inkPurchases.id));
  }
  async findPurchaseById(id) {
    const [row] = await db.select().from(inkPurchases).where(eq16(inkPurchases.id, id));
    return row;
  }
  async createPurchase(data) {
    const [row] = await db.insert(inkPurchases).values(data).returning();
    return row;
  }
  async updatePurchase(id, data) {
    const [row] = await db.update(inkPurchases).set(data).where(eq16(inkPurchases.id, id)).returning();
    return row;
  }
  async removePurchase(id) {
    const [row] = await db.delete(inkPurchases).where(eq16(inkPurchases.id, id)).returning();
    return row;
  }
  /* ---------------- Consumptions ---------------- */
  listConsumptions() {
    return db.select({
      id: inkConsumptions.id,
      materialCode: inkConsumptions.materialCode,
      qtyAssigned: inkConsumptions.qtyAssigned,
      operatorId: inkConsumptions.operatorId,
      operatorName: inkConsumptions.operatorName,
      weight: inkConsumptions.weight,
      note: inkConsumptions.note,
      consumedAt: inkConsumptions.consumedAt
    }).from(inkConsumptions).orderBy(desc10(inkConsumptions.consumedAt), desc10(inkConsumptions.id));
  }
  async createConsumption(data) {
    const [row] = await db.insert(inkConsumptions).values(data).returning();
    return row;
  }
  async removeConsumption(id) {
    const [row] = await db.delete(inkConsumptions).where(eq16(inkConsumptions.id, id)).returning();
    return row;
  }
  /* ---------------- Derived stock ---------------- */
  /**
   * Live stock per material code. LEFT JOIN so a code that has only purchases (or, in
   * theory, only consumptions) still surfaces; COALESCE keeps the arithmetic null-safe.
   */
  async stockLevels() {
    const purchased = db.select({
      materialCode: inkPurchases.materialCode,
      purchasedQty: sql9`COALESCE(SUM(${inkPurchases.quantity}), 0)`.as("purchased_qty"),
      purchasedWeight: sql9`COALESCE(SUM(${inkPurchases.totalWeight}), 0)`.as("purchased_weight")
    }).from(inkPurchases).groupBy(inkPurchases.materialCode).as("purchased");
    const consumed = db.select({
      materialCode: inkConsumptions.materialCode,
      consumedQty: sql9`COALESCE(SUM(${inkConsumptions.qtyAssigned}), 0)`.as("consumed_qty"),
      consumedWeight: sql9`COALESCE(SUM(${inkConsumptions.weight}), 0)`.as("consumed_weight")
    }).from(inkConsumptions).groupBy(inkConsumptions.materialCode).as("consumed");
    return db.select({
      materialCode: purchased.materialCode,
      purchasedQty: purchased.purchasedQty,
      purchasedWeight: purchased.purchasedWeight,
      consumedQty: sql9`COALESCE(${consumed.consumedQty}, 0)`,
      consumedWeight: sql9`COALESCE(${consumed.consumedWeight}, 0)`
    }).from(purchased).leftJoin(consumed, eq16(purchased.materialCode, consumed.materialCode)).orderBy(purchased.materialCode);
  }
  /** Current balance weight for one material code (purchased − consumed). */
  async balanceWeight(materialCode) {
    const [row] = await db.select({
      purchased: sql9`COALESCE((SELECT SUM(${inkPurchases.totalWeight}) FROM ${inkPurchases} WHERE ${inkPurchases.materialCode} = ${materialCode}), 0)`,
      consumed: sql9`COALESCE((SELECT SUM(${inkConsumptions.weight}) FROM ${inkConsumptions} WHERE ${inkConsumptions.materialCode} = ${materialCode}), 0)`
    }).from(sql9`(SELECT 1) AS one`);
    return Number(row?.purchased ?? 0) - Number(row?.consumed ?? 0);
  }
  /** Consumption totals grouped by operator, for the operator-breakdown view. */
  async consumptionByOperator() {
    return db.select({
      operatorId: inkConsumptions.operatorId,
      operatorName: sql9`COALESCE(${inkConsumptions.operatorName}, ${operators.name}, 'Unassigned')`,
      entries: sql9`COUNT(*)`,
      totalQty: sql9`COALESCE(SUM(${inkConsumptions.qtyAssigned}), 0)`,
      totalWeight: sql9`COALESCE(SUM(${inkConsumptions.weight}), 0)`
    }).from(inkConsumptions).leftJoin(operators, eq16(inkConsumptions.operatorId, operators.id)).groupBy(inkConsumptions.operatorId, inkConsumptions.operatorName, operators.name).orderBy(sql9`SUM(${inkConsumptions.weight}) DESC`);
  }
};
var inkRepository = new InkRepository();

// src/api/services/ink.service.ts
var dec = (n) => String(n);
var InkService = class {
  /* ---------------- Purchases ---------------- */
  listPurchases() {
    return inkRepository.listPurchases();
  }
  createPurchase(data) {
    const totalWeight = data.quantity * data.weightPerQty;
    return inkRepository.createPurchase({
      reportDate: data.reportDate,
      materialCode: data.materialCode,
      vendor: data.vendor,
      invoiceNumber: data.invoiceNumber ?? null,
      quantity: dec(data.quantity),
      weightPerQty: dec(data.weightPerQty),
      totalWeight: dec(totalWeight)
    });
  }
  async updatePurchase(id, data) {
    const existing = await inkRepository.findPurchaseById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.INK_PURCHASE));
    const quantity = data.quantity ?? Number(existing.quantity);
    const weightPerQty = data.weightPerQty ?? Number(existing.weightPerQty);
    return inkRepository.updatePurchase(id, {
      ...data.reportDate !== void 0 && { reportDate: data.reportDate },
      ...data.materialCode !== void 0 && { materialCode: data.materialCode },
      ...data.vendor !== void 0 && { vendor: data.vendor },
      ...data.invoiceNumber !== void 0 && { invoiceNumber: data.invoiceNumber || null },
      quantity: dec(quantity),
      weightPerQty: dec(weightPerQty),
      totalWeight: dec(quantity * weightPerQty)
    });
  }
  async removePurchase(id) {
    const existing = await inkRepository.findPurchaseById(id);
    if (!existing) throw new NotFoundError(Messages.notFound(Entity.INK_PURCHASE));
    await inkRepository.removePurchase(id);
  }
  /* ---------------- Stock ---------------- */
  async stock() {
    const rows = await inkRepository.stockLevels();
    return rows.map((r) => {
      const purchasedQty = Number(r.purchasedQty);
      const purchasedWeight = Number(r.purchasedWeight);
      const consumedQty = Number(r.consumedQty);
      const consumedWeight = Number(r.consumedWeight);
      return {
        materialCode: r.materialCode,
        purchasedQty,
        purchasedWeight,
        consumedQty,
        consumedWeight,
        balanceQty: purchasedQty - consumedQty,
        balanceWeight: purchasedWeight - consumedWeight
      };
    });
  }
  /* ---------------- Consumptions ---------------- */
  listConsumptions() {
    return inkRepository.listConsumptions();
  }
  consumptionByOperator() {
    return inkRepository.consumptionByOperator();
  }
  async createConsumption(data) {
    const balance = await inkRepository.balanceWeight(data.materialCode);
    if (data.weight > balance) {
      throw new ApiError(
        `Cannot consume ${data.weight} kg of ${data.materialCode}: only ${balance} kg in stock`,
        400
      );
    }
    let operatorName = data.operatorName?.trim() || null;
    if (data.operatorId != null && !operatorName) {
      const op = await operatorRepository.findById(data.operatorId);
      operatorName = op?.name ?? null;
    }
    return inkRepository.createConsumption({
      materialCode: data.materialCode,
      qtyAssigned: dec(data.qtyAssigned),
      operatorId: data.operatorId ?? null,
      operatorName,
      weight: dec(data.weight),
      note: data.note?.trim() || null
    });
  }
  async removeConsumption(id) {
    const removed = await inkRepository.removeConsumption(id);
    if (!removed) throw new NotFoundError(Messages.notFound(Entity.INK_CONSUMPTION));
  }
};
var inkService = new InkService();

// src/api/controllers/ink.controller.ts
var InkController = class {
  /* Purchases */
  listPurchases = asyncHandler(async (_req, res) => {
    res.json({ data: await inkService.listPurchases() });
  });
  createPurchase = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    res.status(201).json({ data: await inkService.createPurchase(input) });
  });
  updatePurchase = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    const input = req.validatedBody ?? req.body;
    res.json({ data: await inkService.updatePurchase(Number(id), input) });
  });
  removePurchase = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await inkService.removePurchase(Number(id));
    res.status(204).send();
  });
  /* Stock (derived) */
  stock = asyncHandler(async (_req, res) => {
    res.json({ data: await inkService.stock() });
  });
  /* Consumptions */
  listConsumptions = asyncHandler(async (_req, res) => {
    res.json({ data: await inkService.listConsumptions() });
  });
  byOperator = asyncHandler(async (_req, res) => {
    res.json({ data: await inkService.consumptionByOperator() });
  });
  createConsumption = asyncHandler(async (req, res) => {
    const input = req.validatedBody ?? req.body;
    res.status(201).json({ data: await inkService.createConsumption(input) });
  });
  removeConsumption = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams ?? req.params;
    await inkService.removeConsumption(Number(id));
    res.status(204).send();
  });
};
var inkController = new InkController();

// src/api/validations/ink.validation.ts
import { z as z22 } from "zod";
var createInkPurchaseSchema = z22.object({
  body: z22.object({
    reportDate: z22.string().min(1, "Report date is required"),
    materialCode: z22.string().trim().min(1, "Material code is required"),
    vendor: z22.string().trim().min(1, "Vendor is required"),
    invoiceNumber: z22.string().trim().optional(),
    quantity: z22.coerce.number().positive("Quantity must be greater than 0"),
    weightPerQty: z22.coerce.number().positive("Weight per quantity must be greater than 0")
  })
});
var updateInkPurchaseSchema = z22.object({
  body: z22.object({
    reportDate: z22.string().min(1).optional(),
    materialCode: z22.string().trim().min(1).optional(),
    vendor: z22.string().trim().min(1).optional(),
    invoiceNumber: z22.string().trim().optional(),
    quantity: z22.coerce.number().positive().optional(),
    weightPerQty: z22.coerce.number().positive().optional()
  })
});
var createInkConsumptionSchema = z22.object({
  body: z22.object({
    materialCode: z22.string().trim().min(1, "Material code is required"),
    qtyAssigned: z22.coerce.number().positive("Quantity assigned must be greater than 0"),
    operatorId: z22.coerce.number().int().positive().optional(),
    operatorName: z22.string().trim().optional(),
    weight: z22.coerce.number().positive("Weight must be greater than 0"),
    note: z22.string().trim().optional()
  })
});

// src/api/routes/ink.routes.ts
var router17 = Router18();
router17.get("/purchases", inkController.listPurchases);
router17.post("/purchases", validateRequest(createInkPurchaseSchema), inkController.createPurchase);
router17.put(
  "/purchases/:id",
  validateParams(idParamsSchema),
  validateRequest(updateInkPurchaseSchema),
  inkController.updatePurchase
);
router17.delete("/purchases/:id", validateParams(idParamsSchema), inkController.removePurchase);
router17.get("/stock", inkController.stock);
router17.get("/consumptions", inkController.listConsumptions);
router17.get("/consumptions/by-operator", inkController.byOperator);
router17.post("/consumptions", validateRequest(createInkConsumptionSchema), inkController.createConsumption);
router17.delete("/consumptions/:id", validateParams(idParamsSchema), inkController.removeConsumption);
var ink_routes_default = router17;

// src/api/routes/analytics.routes.ts
import { Router as Router19 } from "express";

// src/api/repositories/analytics.repository.ts
import { eq as eq17, sql as sql10 } from "drizzle-orm";
var AnalyticsRepository = class {
  async countWorkOrders() {
    const [row] = await db.select({ value: sql10`count(*)` }).from(workOrders);
    return Number(row?.value ?? 0);
  }
  /** Work orders still in production (not yet completed/dispatched). */
  async countSubmittedWorkOrders() {
    const [row] = await db.select({ value: sql10`count(*)` }).from(workOrders).where(eq17(workOrders.status, "initiate_production"));
    return Number(row?.value ?? 0);
  }
  /* Production counts are per label-type line on a production order. A line is complete
     when every planned roll has been packaged. */
  async countProductionProgress() {
    const [row] = await db.select({ value: sql10`count(*)` }).from(productionOrderLines);
    return Number(row?.value ?? 0);
  }
  async countActiveProductionProgress() {
    const [row] = await db.select({ value: sql10`count(*)` }).from(productionOrderLines).where(sql10`cast(${productionOrderLines.packagedRolls} as numeric) < cast(${productionOrderLines.totalRolls} as numeric)`);
    return Number(row?.value ?? 0);
  }
  async countCompletedProductionProgress() {
    const [row] = await db.select({ value: sql10`count(*)` }).from(productionOrderLines).where(
      sql10`cast(${productionOrderLines.packagedRolls} as numeric) >= cast(${productionOrderLines.totalRolls} as numeric) AND cast(${productionOrderLines.totalRolls} as numeric) > 0`
    );
    return Number(row?.value ?? 0);
  }
  async countMaterials() {
    const [row] = await db.select({ value: sql10`count(*)` }).from(materials);
    return Number(row?.value ?? 0);
  }
  async countLowStock() {
    const [row] = await db.select({ value: sql10`count(*)` }).from(inventoryRolls).where(sql10`cast(${inventoryRolls.balanceRolls} as numeric) < 5`);
    return Number(row?.value ?? 0);
  }
  async sumBalanceRolls() {
    const [row] = await db.select({ value: sql10`coalesce(sum(cast(${inventoryRolls.balanceRolls} as numeric)), 0)` }).from(inventoryRolls);
    return Number(row?.value ?? 0);
  }
  async sumIssuedRolls() {
    const [row] = await db.select({ value: sql10`coalesce(sum(cast(${inventoryRolls.issuedRolls} as numeric)), 0)` }).from(inventoryRolls);
    return Number(row?.value ?? 0);
  }
};
var analyticsRepository = new AnalyticsRepository();

// src/api/services/analytics.service.ts
var AnalyticsService = class {
  async getKpis() {
    const totalWorkOrders = await analyticsRepository.countWorkOrders();
    const submittedWorkOrders = await analyticsRepository.countSubmittedWorkOrders();
    const totalProductionProgress = await analyticsRepository.countProductionProgress();
    const activeProductionProgress = await analyticsRepository.countActiveProductionProgress();
    const completedProductionProgress = await analyticsRepository.countCompletedProductionProgress();
    const totalMaterials = await analyticsRepository.countMaterials();
    const lowStockCount = await analyticsRepository.countLowStock();
    const totalBalanceRolls = await analyticsRepository.sumBalanceRolls();
    const totalIssuedRolls = await analyticsRepository.sumIssuedRolls();
    return {
      totalWorkOrders,
      submittedWorkOrders,
      totalProductionProgress,
      activeProductionProgress,
      completedProductionProgress,
      totalMaterials,
      lowStockCount,
      totalBalanceRolls,
      totalIssuedRolls
    };
  }
};
var analyticsService = new AnalyticsService();

// src/api/controllers/analytics.controller.ts
var AnalyticsController = class {
  getKpis = asyncHandler(async (_req, res) => {
    const data = await analyticsService.getKpis();
    res.json({ data });
  });
};
var analyticsController = new AnalyticsController();

// src/api/routes/analytics.routes.ts
var router18 = Router19();
router18.get("/kpis", analyticsController.getKpis);
var analytics_routes_default = router18;

// src/api/routes/index.ts
var router19 = Router20();
router19.use("/", index_routes_default);
router19.use("/health", health_routes_default);
router19.use("/companies", companies_routes_default);
router19.use("/brands", brands_routes_default);
router19.use("/materials/stickers", stickerMaterialsRouter);
router19.use("/materials/local-sheets", localSheetsRouter);
router19.use("/materials/label-sheets", labelSheetsRouter);
router19.use("/materials", materials_routes_default);
router19.use("/machines", machines_routes_default);
router19.use("/operators", operators_routes_default);
router19.use("/users", users_routes_default);
router19.use("/work-orders", work_orders_routes_default);
router19.use("/production-orders", production_orders_routes_default);
router19.use("/woven-production", woven_production_routes_default);
router19.use("/inventory", inventory_routes_default);
router19.use("/thread", thread_inventory_routes_default);
router19.use("/thread-service-providers", thread_service_provider_routes_default);
router19.use("/thread-dyeing", thread_dyeing_routes_default);
router19.use("/ink", ink_routes_default);
router19.use("/analytics", analytics_routes_default);
var routes_default = router19;

// src/app.ts
var app = express();
var corsOrigin = env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",").map((o) => o.trim());
if (isProduction && corsOrigin === "*") {
  logger.warn("CORS_ORIGIN is '*' in production \u2014 set an explicit comma-separated allow-list of origins.");
}
app.use(helmet());
app.use(compression());
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/api", apiRateLimiter, routes_default);
app.use(notFound);
app.use(errorHandler);
var app_default = app;

// src/api-entry.ts
var api_entry_default = app_default;
export {
  api_entry_default as default
};
//# sourceMappingURL=api-entry.js.map