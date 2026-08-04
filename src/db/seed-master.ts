/**
 * Master-data seed: materials, machines, operators, staff users, customers and a starting
 * stock position, taken from the facility's reference sheets (see `seed-data.ts`).
 *
 * Idempotent and additive — every insert upserts on its natural key, so re-running it
 * refreshes the master data without touching work orders, production progress or the
 * issuance/event history. It never deletes anything.
 *
 *   npm run db:seed:master
 */
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  companies,
  brands,
  materials,
  machines,
  operators,
  users,
  workOrders,
  purchaseRecords,
  inventoryRolls,
  productionOrderLines,
} from "@db/schema";
import { calculateTotalRollPer200m, calculateInvoiceWeight } from "@api/utils/purchase-formula";
import { MATERIALS, OPERATORS, MACHINES, SAMPLE_COMPANIES, USERS, VENDORS } from "./seed-data";

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** Leading label width in mm, e.g. "70mm TC1676 X1 white coton" -> 70. */
function sizeMm(code: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*mm/i.exec(code.trim());
  return match ? Number(match[1]) : null;
}

/**
 * The sheet leaves a lot of weight cells blank or zero. A zero `weightPerRoll` would make
 * the planning Total Weight (`weightPerRoll × totalRolls`) collapse to 0, so blanks are
 * filled with a placeholder interpolated from the sheet's own figures: the mean
 * weight-per-mm of the other rows sharing the same description, falling back to the mean
 * across every priced row. Rows the sheet actually prices keep their exact value.
 */
function fillWeights(rows: typeof MATERIALS): Map<string, number> {
  const priced = rows.filter((r) => r.weight != null && r.weight > 0 && sizeMm(r.code));
  const globalRatio =
    priced.reduce((sum, r) => sum + r.weight! / sizeMm(r.code)!, 0) / (priced.length || 1);

  const familyRatio = new Map<string, number>();
  for (const row of rows) {
    const key = row.description ?? "";
    const peers = priced.filter((p) => (p.description ?? "") === key);
    if (peers.length > 0 && !familyRatio.has(key)) {
      familyRatio.set(key, peers.reduce((s, p) => s + p.weight! / sizeMm(p.code)!, 0) / peers.length);
    }
  }

  const filled = new Map<string, number>();
  for (const row of rows) {
    if (row.weight != null && row.weight > 0) {
      filled.set(row.code, round4(row.weight));
      continue;
    }
    const mm = sizeMm(row.code);
    const ratio = familyRatio.get(row.description ?? "") ?? globalRatio;
    // Codes with no mm prefix (Jambo Roll, inks) get a flat placeholder.
    filled.set(row.code, mm ? round4(mm * ratio) : 1);
  }
  return filled;
}

async function seedMaterials() {
  const weights = fillWeights(MATERIALS);
  const estimated = MATERIALS.filter((m) => m.weight == null || m.weight <= 0).length;

  for (const row of MATERIALS) {
    const weight = String(weights.get(row.code)!);
    await db
      .insert(materials)
      .values({
        code: row.code,
        type: row.type,
        description: row.description,
        weightPerRoll: weight,
      })
      .onConflictDoUpdate({
        target: materials.code,
        set: {
          type: row.type,
          description: row.description,
          // Never downgrade a weight the user already entered to a placeholder.
          weightPerRoll:
            row.weight != null && row.weight > 0
              ? weight
              : sql`greatest(${materials.weightPerRoll}, ${weight})`,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`materials      ${MATERIALS.length} upserted (${estimated} weights estimated)`);
}

async function seedOperators(): Promise<Map<string, number>> {
  const byName = new Map<string, number>();
  for (const row of OPERATORS) {
    const [saved] = await db
      .insert(operators)
      .values({ ...row, status: "Active" })
      .onConflictDoUpdate({
        target: operators.name,
        set: { designation: row.designation, employeeCode: row.employeeCode, updatedAt: new Date() },
      })
      .returning();
    byName.set(row.name, saved.id);
  }
  console.log(`operators      ${OPERATORS.length} upserted`);
  return byName;
}

/**
 * Three machines already existed holding codes the sheet reuses (`AS005`, `HC004`) and two
 * of them are referenced by production lines, so they are re-pointed onto matching sheet
 * identities by id — preserving every FK — before the rest are inserted.
 */
const MACHINE_TAKEOVERS: Record<number, string> = {
  1: "SR Flexo 2+1", // was "Orange mechine"/AS005, Printing — used as a printing machine
  2: "HC004", //         was "Abdul Rehman"/HC004, unreferenced
  3: "AS001", //         was "cutting mechine"/AS0010, Cutting — used as a cutting machine
};

async function seedMachines(operatorIds: Map<string, number>) {
  const existing = await db.select({ id: machines.id }).from(machines);
  const existingIds = new Set(existing.map((m) => m.id));
  const claimed = new Set<string>();

  for (const [id, name] of Object.entries(MACHINE_TAKEOVERS)) {
    if (!existingIds.has(Number(id))) continue;
    const row = MACHINES.find((m) => m.name === name)!;
    await db
      .update(machines)
      .set({
        name: row.name,
        machineCode: row.machineCode,
        machineName: row.name,
        machineType: row.machineType,
        capacityPerHour: row.capacityPerHour,
        machineOperatorId: row.operatorName ? operatorIds.get(row.operatorName)! : null,
        status: "Active",
        updatedAt: new Date(),
      })
      .where(eq(machines.id, Number(id)));
    claimed.add(row.name);
  }

  for (const row of MACHINES) {
    if (claimed.has(row.name)) continue;
    await db
      .insert(machines)
      .values({
        name: row.name,
        machineCode: row.machineCode,
        machineName: row.name,
        machineType: row.machineType,
        capacityPerHour: row.capacityPerHour,
        machineOperatorId: row.operatorName ? operatorIds.get(row.operatorName)! : null,
        status: "Active",
      })
      .onConflictDoUpdate({
        target: machines.machineCode,
        set: {
          name: row.name,
          machineName: row.name,
          machineType: row.machineType,
          capacityPerHour: row.capacityPerHour,
          machineOperatorId: row.operatorName ? operatorIds.get(row.operatorName)! : null,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`machines       ${MACHINES.length} upserted (${claimed.size} re-pointed in place)`);
}

/**
 * Two existing production lines carry stage assignments that cross designations (a
 * printing operator set as the cutting operator, and as the packager). Now that real
 * stage-scoped resources exist, point them at operators of the right designation so the
 * dashboard's filtered dropdowns show a matching value instead of a blank.
 */
async function realignExistingLines(operatorIds: Map<string, number>) {
  const lines = await db
    .select({
      id: productionOrderLines.id,
      cuttingOperatorId: productionOrderLines.cuttingOperatorId,
      packagingOperatorId: productionOrderLines.packagingOperatorId,
    })
    .from(productionOrderLines);

  const cuttingPool = ["Aleem", "Waleed", "Faisal (Cutting)"];
  let fixed = 0;

  for (const [index, line] of lines.entries()) {
    const patch: Record<string, number> = {};
    const cutting = operatorIds.get(cuttingPool[index % cuttingPool.length])!;
    const packaging = operatorIds.get(index % 2 === 0 ? "Mudassar" : "Awais")!;

    if (line.cuttingOperatorId !== cutting) patch.cuttingOperatorId = cutting;
    if (line.packagingOperatorId !== packaging) patch.packagingOperatorId = packaging;
    if (Object.keys(patch).length === 0) continue;

    await db.update(productionOrderLines).set(patch).where(eq(productionOrderLines.id, line.id));
    fixed += 1;
  }
  if (fixed > 0) console.log(`lines          ${fixed} stage assignment(s) re-pointed to matching designations`);
}

async function seedUsers() {
  for (const row of USERS) {
    const email = `${row.name.toLowerCase().replace(/[^a-z]+/g, ".")}@3q.test`;
    await db
      .insert(users)
      .values({ name: row.name, role: row.role, email })
      .onConflictDoUpdate({ target: users.email, set: { name: row.name, role: row.role, updatedAt: new Date() } });
  }
  console.log(`users          ${USERS.length} upserted`);
}

async function seedCompanies() {
  let brandCount = 0;
  for (const row of SAMPLE_COMPANIES) {
    const [company] = await db
      .insert(companies)
      .values({
        name: row.name,
        email: row.email,
        location: row.location,
        contactPerson: row.contactPerson,
        phone: row.phone,
      })
      .onConflictDoUpdate({
        target: companies.name,
        set: { email: row.email, location: row.location, contactPerson: row.contactPerson, phone: row.phone },
      })
      .returning();

    for (const brandName of row.brands) {
      await db
        .insert(brands)
        .values({ companyId: company.id, name: brandName })
        .onConflictDoNothing();
      brandCount += 1;
    }
  }
  console.log(`companies      ${SAMPLE_COMPANIES.length} upserted with ${brandCount} brands (SAMPLE data)`);
}

/**
 * Gives the most-used materials a real stock position: a purchase record (with its four
 * derived fields computed by the canonical formulas) plus the matching inventory credit,
 * mirroring what `createPurchaseWithStock` does at runtime.
 */
const STOCKED = [
  { code: "10mm NT65 PL", cartons: 120, perCarton: 20, rollLength: 200, netWeight: 385, rollPerKg: 6.2 },
  { code: "16mm NT65 PL", cartons: 80, perCarton: 20, rollLength: 200, netWeight: 305, rollPerKg: 5.3 },
  { code: "25mm NT65 PL", cartons: 60, perCarton: 20, rollLength: 200, netWeight: 412, rollPerKg: 2.9 },
  { code: "16mm PS7539 SS", cartons: 90, perCarton: 18, rollLength: 200, netWeight: 530, rollPerKg: 3.1 },
  { code: "25mm PS7539 SS", cartons: 70, perCarton: 18, rollLength: 400, netWeight: 610, rollPerKg: 2.1 },
  { code: "35mm PS7539 SS", cartons: 55, perCarton: 18, rollLength: 200, netWeight: 690, rollPerKg: 1.5 },
  { code: "25mm PS5075 DSS", cartons: 65, perCarton: 20, rollLength: 200, netWeight: 545, rollPerKg: 1.9 },
  { code: "32mm PS5075 DSS", cartons: 45, perCarton: 20, rollLength: 200, netWeight: 620, rollPerKg: 1.5 },
  { code: "25mm MZ3303 SSWE", cartons: 50, perCarton: 16, rollLength: 200, netWeight: 700, rollPerKg: 1.05 },
  { code: "35mm MZ3303 SSWE", cartons: 40, perCarton: 16, rollLength: 200, netWeight: 830, rollPerKg: 0.76 },
  { code: "25mm MZ3302 DSWE", cartons: 42, perCarton: 16, rollLength: 200, netWeight: 760, rollPerKg: 0.93 },
  { code: "35mm PT240W white", cartons: 30, perCarton: 12, rollLength: 200, netWeight: 290, rollPerKg: 1.86 },
  { code: "40mm PT7328 PF", cartons: 25, perCarton: 12, rollLength: 200, netWeight: 260, rollPerKg: 1.53 },
  { code: "40mm S90", cartons: 28, perCarton: 12, rollLength: 200, netWeight: 275, rollPerKg: 1.4 },
  { code: "13mm tearaway", cartons: 35, perCarton: 20, rollLength: 200, netWeight: 210, rollPerKg: 4.25 },
  { code: "30mm RS70 SS White", cartons: 22, perCarton: 16, rollLength: 200, netWeight: 320, rollPerKg: 1.57 },
];

async function seedStock() {
  const materialRows = await db.select().from(materials);
  const weightByCode = new Map(materialRows.map((m) => [m.code, m.weightPerRoll]));

  const existingPurchases = await db
    .select({ materialCode: purchaseRecords.materialCode, vendor: purchaseRecords.vendor })
    .from(purchaseRecords);
  const existingRolls = await db
    .select({ materialCode: inventoryRolls.materialCode })
    .from(inventoryRolls);
  const alreadyStocked = new Set(existingRolls.map((r) => r.materialCode));

  let purchases = 0;
  let ledgers = 0;

  for (const [index, row] of STOCKED.entries()) {
    const vendor = VENDORS[index % VENDORS.length];
    // Skip anything already recorded so re-runs don't inflate stock.
    if (existingPurchases.some((p) => p.materialCode === row.code && p.vendor === vendor)) continue;

    const totalRoll = row.cartons * row.perCarton;
    const material = materialRows.find((m) => m.code === row.code);
    if (!material) continue;

    const reportDate = new Date(Date.now() - (index + 1) * 5 * 86400000).toISOString().slice(0, 10);

    await db.insert(purchaseRecords).values({
      reportDate,
      materialCode: row.code,
      materialType: material.type,
      itemName: material.description ?? row.code,
      invoiceNumber: `INV-2026-${String(1000 + index)}`,
      gdNumber: `GD-${String(48000 + index)}`,
      vendor,
      cartonQty: row.cartons,
      rollsPerCarton: row.perCarton,
      totalRoll: String(totalRoll),
      rollLength: String(row.rollLength),
      netWeight: String(row.netWeight),
      totalRollPer200m: String(calculateTotalRollPer200m(totalRoll, row.rollLength)),
      invoiceWeight: String(calculateInvoiceWeight(row.netWeight, totalRoll, row.rollLength)),
      localWeight: weightByCode.get(row.code) ?? "0",
    });
    purchases += 1;

    // Purchases credit stock — same effect as the runtime transactional path.
    if (alreadyStocked.has(row.code)) {
      await db
        .update(inventoryRolls)
        .set({
          receivedRolls: sql`${inventoryRolls.receivedRolls} + ${totalRoll}`,
          balanceRolls: sql`${inventoryRolls.balanceRolls} + ${totalRoll}`,
          rollPerKg: String(row.rollPerKg),
          updatedAt: new Date(),
        })
        .where(eq(inventoryRolls.materialCode, row.code));
    } else {
      await db.insert(inventoryRolls).values({
        materialCode: row.code,
        openingStock: "0",
        receivedRolls: String(totalRoll),
        issuedRolls: "0",
        balanceRolls: String(totalRoll),
        rollPerKg: String(row.rollPerKg),
      });
      ledgers += 1;
    }
  }
  // Any ledger still on the 0 default gets the physically-implied figure, so Per SKU
  // Balance (balanceRolls × rollPerKg) is meaningful on every row rather than reading 0.
  const backfilled = await db
    .update(inventoryRolls)
    .set({
      rollPerKg: sql`round(1 / ${materials.weightPerRoll}, 4)`,
      updatedAt: new Date(),
    })
    .from(materials)
    .where(
      sql`${materials.code} = ${inventoryRolls.materialCode}
          and ${inventoryRolls.rollPerKg} = 0
          and ${materials.weightPerRoll} > 0`
    )
    .returning({ code: inventoryRolls.materialCode });

  console.log(
    `purchases      ${purchases} created, ${ledgers} new stock ledger(s), ${backfilled.length} rollPerKg backfilled`
  );
}

/** Sample sales orders across the sample brands, including two dispatched/locked ones. */
async function seedWorkOrders() {
  const brandRows = await db.select({ id: brands.id, name: brands.name }).from(brands);
  if (brandRows.length === 0) return;

  const specs = [
    { so: "SO-2026-0101", po: "PO-88101", qty: 12000, days: 21 },
    { so: "SO-2026-0102", po: "PO-88102", qty: 8500, days: 18 },
    { so: "SO-2026-0103", po: "PO-88103", qty: 24000, days: 30 },
    { so: "SO-2026-0104", po: "PO-88104", qty: 6400, days: 14 },
    { so: "SO-2026-0105", po: "PO-88105", qty: 15750, days: 25 },
    { so: "SO-2026-0106", po: "PO-88106", qty: 3200, days: 10 },
    { so: "SO-2026-0107", po: "PO-88107", qty: 9800, days: 20, complete: true },
    { so: "SO-2026-0108", po: "PO-88108", qty: 5000, days: 12, complete: true },
  ];

  let created = 0;
  for (const [index, spec] of specs.entries()) {
    const brand = brandRows[index % brandRows.length];
    const orderDate = new Date(Date.now() - (30 - index) * 86400000).toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + spec.days * 86400000).toISOString().slice(0, 10);

    const result = await db
      .insert(workOrders)
      .values({
        soNumber: spec.so,
        poNumber: spec.po,
        orderDate,
        dueDate,
        totalQty: spec.qty,
        brandId: brand.id,
        comment: `Sample order for ${brand.name}`,
        status: spec.complete ? "complete" : "initiate_production",
        dcNumber: spec.complete ? `DC-${9000 + index}` : null,
        dispatchedDate: spec.complete ? dueDate : null,
      })
      .onConflictDoNothing()
      .returning();
    created += result.length;
  }
  console.log(`work orders    ${created} created (${specs.length - created} already present)`);
}

async function main() {
  console.log("Seeding master data...\n");
  await seedMaterials();
  const operatorIds = await seedOperators();
  await seedMachines(operatorIds);
  await realignExistingLines(operatorIds);
  await seedUsers();
  await seedCompanies();
  await seedStock();
  await seedWorkOrders();
  console.log("\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Master seed failed:", error);
    process.exit(1);
  });
