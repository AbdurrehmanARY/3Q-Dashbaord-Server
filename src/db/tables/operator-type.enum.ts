import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Which production line an operator is trained for. Drives operator pickers throughout
 * production: a printed job offers `printed` + `both`, a woven job offers `woven` + `both`.
 *
 * Defaults to `both` so operators that existed before this field keep appearing everywhere
 * they did — narrowing them is a deliberate edit, not a silent migration side effect.
 */
export const operatorTypeEnum = pgEnum("operator_type", ["printed", "woven", "both"]);
