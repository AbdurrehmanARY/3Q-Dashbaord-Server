import { db } from "./index";
import {
  companies,
  brands,
  materials,
  machines,
  operators,
  users,
  workOrders,
  productionOrders,
  productionOrderLines,
  purchaseRecords,
  inventoryRolls,
} from "@db/schema";
import { calculateRequiredRolls, calculateTotalRolls } from "@api/utils/production-formula";
import { calculateTotalRollPer200m, calculateInvoiceWeight } from "@api/utils/purchase-formula";

async function seed() {
  console.log("Seeding database...");

  const [company] = await db.insert(companies).values({
    name: "ABC Labels",
    email: "contact@abclabels.com",
    location: "New York",
  }).returning();
  console.log("Created company:", company.name);

  const [brand] = await db.insert(brands).values({
    companyId: company.id,
    name: "Premium",
  }).returning();
  console.log("Created brand:", brand.name);

  const [material] = await db.insert(materials).values({
    code: "PPR-001",
    type: "Paper",
    description: "50 Micron Paper Roll",
    weightPerRoll: "25.5",
  }).returning();
  console.log("Created material:", material.code);

  const [machine] = await db.insert(machines).values({
    name: "Flexo Printer 1",
    machineCode: "MAC-001",
    machineName: "Flexo Printer 1",
    machineType: "Printing",
    status: "Active",
  }).returning();
  console.log("Created machine:", machine.machineName);

  const [operator] = await db.insert(operators).values({
    name: "John Doe",
    designation: "Printing",
    status: "Active",
  }).returning();
  console.log("Created operator:", operator.name);

  const [workOrder] = await db.insert(workOrders).values({
    soNumber: "SO-001",
    poNumber: "PO-001",
    orderDate: "2024-01-15",
    dueDate: "2024-01-30",
    totalQty: 1000,
    brandId: brand.id,
    status: "initiate_production",
  }).returning();
  console.log("Created work order:", workOrder.soNumber);

  const seededUsers = await db.insert(users).values([
    { name: "Office Staff", role: "office_staff" },
    { name: "Production Manager", role: "production_manager" },
    { name: "Production Operator", role: "production_operator" },
  ]).returning();
  console.log("Created users:", seededUsers.map((u) => u.role).join(", "));

  const [productionOrder] = await db.insert(productionOrders).values({
    productionNumber: "PRD-00001",
    workOrderId: workOrder.id,
    totalQty: workOrder.totalQty,
    status: "planned",
    plannedAt: new Date(),
    createdByUserId: seededUsers[0].id,
  }).returning();
  console.log("Created production order:", productionOrder.productionNumber);

  // Required rolls always come from the canonical formula, never a hand-written number.
  const plannedLines = [
    { labelType: "Barcode Label", quantity: 500, labelSize: 100, extraRolls: 0 },
    { labelType: "QR Code Label", quantity: 500, labelSize: 150, extraRolls: 1 },
  ].map((line) => {
    const requiredRolls = calculateRequiredRolls(line.quantity, line.labelSize);
    const totalRolls = calculateTotalRolls(requiredRolls, line.extraRolls);
    return {
      productionOrderId: productionOrder.id,
      labelType: line.labelType,
      quantity: String(line.quantity),
      labelSize: String(line.labelSize),
      requiredRolls: String(requiredRolls),
      extraRolls: String(line.extraRolls),
      totalRolls: String(totalRolls),
      totalWeight: String(Number(material.weightPerRoll) * totalRolls),
      materialCode: material.code,
      printingMachineId: machine.id,
      printingOperatorId: operator.id,
    };
  });

  await db.insert(productionOrderLines).values(plannedLines);
  console.log("Created production order lines");

  const seedCartonQty = 10;
  const seedRollsPerCarton = 20;
  const seedRollLength = 1000;
  const seedNetWeight = 500;
  const seedTotalRoll = seedCartonQty * seedRollsPerCarton;

  const [purchase] = await db.insert(purchaseRecords).values({
    reportDate: "2024-01-10",
    materialCode: material.code,
    materialType: material.type,
    itemName: "Paper Roll",
    vendor: "Paper Supplies Inc",
    cartonQty: seedCartonQty,
    rollsPerCarton: seedRollsPerCarton,
    totalRoll: String(seedTotalRoll),
    rollLength: String(seedRollLength),
    netWeight: String(seedNetWeight),
    totalRollPer200m: String(calculateTotalRollPer200m(seedTotalRoll, seedRollLength)),
    invoiceWeight: String(calculateInvoiceWeight(seedNetWeight, seedTotalRoll, seedRollLength)),
    localWeight: material.weightPerRoll,
  }).returning();
  console.log("Created purchase record");

  await db.insert(inventoryRolls).values({
    materialCode: material.code,
    openingStock: "0",
    receivedRolls: String(seedTotalRoll),
    issuedRolls: "0",
    balanceRolls: String(seedTotalRoll),
  }).returning();
  console.log("Created inventory roll");

  console.log("Seeding completed successfully!");
}

seed()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
