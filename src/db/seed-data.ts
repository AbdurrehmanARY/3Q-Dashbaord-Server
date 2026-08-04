/**
 * Master data transcribed from the facility's reference sheets (materials, machines &
 * operators, companies & brands). Consumed by `seed-master.ts`.
 *
 * Source-sheet spellings are normalised here to the fixed option lists the client uses
 * (`client/src/features/materials/schemas/material-schemas.ts`) — e.g. the sheet writes
 * "Teffeta"/"Mirco Fiber"/"Recyle satin", which map to "Taffeta"/"Micro Fiber"/"Recycle
 * Satin". Keeping them aligned is what makes the searchable type/description dropdowns
 * and the stock type filter actually match the seeded rows.
 */

/** A material row exactly as it appears on the sheet. `weight: null` = blank/zero cell. */
export interface MaterialSeed {
  code: string;
  description: string | null;
  type: string;
  weight: number | null;
}

/**
 * ~135 material rows. Weights are the sheet's own figures; blank and 0 cells are filled
 * in by `seed-master.ts` with an interpolated placeholder so nothing carries a zero
 * weight into the Total Weight planning formula.
 */
export const MATERIALS: MaterialSeed[] = [
  // — Paper Label / Taffeta —
  { code: "10mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.1605 },
  { code: "16mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.1901 },
  { code: "20mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.2953 },
  { code: "25mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.3424 },
  { code: "32mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.4348 },
  { code: "35mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.486 },
  { code: "38mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: null },
  { code: "40mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.5166 },
  { code: "50mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.7201 },
  { code: "55mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.7883 },

  // — Simple Satin —
  { code: "13mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: null },
  { code: "16mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: 0.328 },
  { code: "20mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: 0.4063 },
  { code: "25mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: 0.48485 },
  { code: "30mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: 0.61955 },
  { code: "32mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: 0.5881 },
  { code: "35mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: 0.6735 },
  { code: "38mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: null },
  { code: "40mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: 0.86695 },
  { code: "45mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: 0.8584 },
  { code: "50mm PS7539 SS", description: "Simple Satin", type: "Satin", weight: 1.0755 },

  // — Double Side Simple Satin —
  { code: "13mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: null },
  { code: "15mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: null },
  { code: "20mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: null },
  { code: "25mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.527 },
  { code: "30mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.7793 },
  { code: "32mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.682 },
  { code: "35mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.725 },
  { code: "38mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.7964 },
  { code: "40mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.8423 },
  { code: "45mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: null },
  { code: "50mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: null },

  // — Single Side Woven Edge —
  { code: "10mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 0.403 },
  { code: "13mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: null },
  { code: "15mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: null },
  { code: "20mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: null },
  { code: "25mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 0.9544 },
  { code: "30mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: null },
  { code: "32mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.2356 },
  { code: "35mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.3157 },
  { code: "38mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: null },
  { code: "40mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.5282 },
  { code: "45mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.7424 },
  { code: "50mm MZ3303 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: null },

  // — Double Side Woven Edge —
  { code: "10mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: null },
  { code: "13mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: null },
  { code: "15mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: null },
  { code: "20mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: null },
  { code: "25mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.0698 },
  { code: "30mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: null },
  { code: "32mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.4058 },
  { code: "35mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.4258 },
  { code: "38mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: null },
  { code: "40mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.7667 },
  { code: "45mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.9009 },
  { code: "50mm MZ3302 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: null },

  // — Micro Fiber / speciality —
  { code: "35mm PT240W white", description: "Micro Fiber", type: "Micro Fiber", weight: 0.53665 },
  { code: "35mm PT240W black", description: "Micro Fiber", type: "Micro Fiber", weight: 0.5615 },
  { code: "40mm PT7328 PF", description: "Pearl Finish Satin", type: "Pearl Finish Satin", weight: 0.6511 },
  { code: "40mm S90", description: "Dull Satin", type: "Dull Satin", weight: 0.71175 },
  { code: "40mm Energy", description: "Accted Taffeta", type: "Accted Taffeta", weight: null },

  // — Grey —
  { code: "13mm Grey", description: "Single Side Woven Edge", type: "Satin", weight: 0.5052 },
  { code: "35mm Grey", description: "Single Side Woven Edge", type: "Satin", weight: 1.3041 },

  // — Tearaway —
  { code: "13mm tearaway", description: "Tearaway Fabric", type: "Tearaway", weight: 0.2348 },
  { code: "20mm tear away", description: "Tearaway Fabric", type: "Tearaway", weight: 0.4061 },
  { code: "30mm tear away", description: "Tearaway Fabric", type: "Tearaway", weight: 0.48 },
  { code: "35mm tear away", description: "Tearaway Fabric", type: "Tearaway", weight: 0.6191 },

  // — Cotton —
  { code: "13mm white coton", description: "White Cotton", type: "Cotton", weight: null },
  { code: "25mm white coton", description: "White Cotton", type: "Cotton", weight: null },
  { code: "32mm white coton", description: "White Cotton", type: "Cotton", weight: null },
  { code: "38mm white coton", description: "White Cotton", type: "Cotton", weight: null },
  { code: "45mm white coton", description: "White Cotton", type: "Cotton", weight: null },
  { code: "70mm TC1676 X1 white coton", description: "White Cotton", type: "Cotton", weight: 2.21 },
  { code: "16mm off white coton", description: "Off White Cotton", type: "Cotton", weight: null },
  { code: "25mm off white coton", description: "Off White Cotton", type: "Cotton", weight: null },
  { code: "38mm off white coton", description: "Off White Cotton", type: "Cotton", weight: null },

  // — Simple Satin Black —
  { code: "13mm PS7530 SS Black", description: "Simple Satin Black", type: "Satin", weight: null },
  { code: "16mm PS7530 SS Black", description: "Simple Satin Black", type: "Satin", weight: null },
  { code: "20mm PS7530 SS Black", description: "Simple Satin Black", type: "Satin", weight: null },
  { code: "25mm PS7530 SS Black", description: "Simple Satin Black", type: "Satin", weight: null },
  { code: "30mm PS7530 SS Black", description: "Simple Satin Black", type: "Satin", weight: null },
  { code: "32mm PS7530 SS Black", description: "Simple Satin Black", type: "Satin", weight: null },
  { code: "35mm PS7530 SS Black", description: "Simple Satin Black", type: "Satin", weight: null },
  { code: "38mm PS7530 SS Black", description: "Simple Satin Black", type: "Satin", weight: null },

  // — Double Side Simple Satin Black —
  { code: "15mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: null },
  { code: "20mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: null },
  { code: "25mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: null },
  { code: "30mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: null },
  { code: "32mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: null },
  { code: "35mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: null },
  { code: "38mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: null },
  { code: "45mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: null },

  // — Single Side Woven Edge Black —
  { code: "15mm MZ3303 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: null },
  { code: "20mm MZ3303 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: null },
  { code: "25mm MZ3303 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: null },
  { code: "30mm MZ3303 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: null },
  { code: "32mm MZ3303 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: null },
  { code: "35mm MZ3303 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: null },
  { code: "38mm MZ3303 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: null },
  { code: "40mm MZ3303 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: null },
  { code: "45mm MZ3303 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: null },
  { code: "50mm MZ3303 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: null },

  // — Double Side Woven Edge Black —
  { code: "13mm MZ3302 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: null },
  { code: "20mm MZ3302 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: null },
  { code: "25mm MZ3302 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: null },
  { code: "30mm MZ3302 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: null },
  { code: "32mm MZ3302 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: null },
  { code: "35mm MZ3302 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: null },
  { code: "38mm MZ3302 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: null },
  { code: "40mm MZ3302 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: null },
  { code: "45mm MZ3302 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: null },
  { code: "50mm MZ3302 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: null },

  // — Recycle —
  { code: "30mm RS70 SS White", description: "Recycle Single Side Satin", type: "Recycle Satin", weight: 0.6355 },
  { code: "25mm RS70 SS White", description: "Recycle Single Side Satin", type: "Recycle Satin", weight: null },

  // — Sheets / consumables. The sheet leaves type and description blank for the inks;
  //   `type` is NOT NULL so they are filed under Sheets with no description. —
  { code: "Jambo Roll", description: "Label Fabric", type: "Sheets", weight: null },
  { code: "Dencer Black Ink", description: null, type: "Sheets", weight: null },
  { code: "Red Ink", description: null, type: "Sheets", weight: null },

  // — EFS / 20% recycle variants —
  { code: "25mm NT65 PL EFS", description: "Paper Label", type: "Taffeta", weight: null },
  { code: "40mm NT65 PL EFS", description: "Paper Label", type: "Taffeta", weight: null },
  { code: "30mm RS70 SS White EFS", description: "Recycle Single Side Satin 20% Recycle", type: "Recycle Satin", weight: null },
  { code: "45mm MZ315 SSWE EFS", description: "Single Side Woven Edge 20% Recycle", type: "Satin", weight: null },
  { code: "32mm MZ316 DSWE EFS", description: "Double Side Woven Edge 20% Recycle", type: "Satin", weight: null },
  { code: "40mm MZ316 DSWE EFS", description: "Double Side Woven Edge 20% Recycle", type: "Satin", weight: null },
  { code: "13mm tearaway RT215-B soft EFS", description: "Tearaway Fabric 20% Recycle", type: "Tearaway", weight: null },
  { code: "20mm tearaway RT215-B soft EFS", description: "Tearaway Fabric 20% Recycle", type: "Tearaway", weight: null },
  { code: "35mm tearaway RT215-B soft EFS", description: "Tearaway Fabric 20% Recycle", type: "Tearaway", weight: null },
  { code: "40mm S90 EFS", description: "Dull Satin 20% Recycle", type: "Satin", weight: null },
  { code: "35mm tearaway RT215-B soft", description: "Tearaway Fabric 20% Recycle", type: "Tearaway", weight: null },

  // — MZ315 / MZ316 / RS227 —
  { code: "25mm MZ316 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: null },
  { code: "35mm MZ316 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: null },
  { code: "40mm MZ316 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: null },
  { code: "35mm MZ315 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: null },
  { code: "40mm RS227 DSS", description: "Double Side Simple Satin", type: "Satin", weight: null },
  { code: "40mm PS7544 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: null },
];

/** Operator names are UNIQUE, so the two people who appear in both the printing and the
 *  cutting column of the sheet (Faisal, Sarmad) are disambiguated by stage. */
export interface OperatorSeed {
  name: string;
  employeeCode: string;
  designation: "Printing" | "Cutting" | "Packaging";
}

export const OPERATORS: OperatorSeed[] = [
  { name: "Saleem", employeeCode: "OP-P01", designation: "Printing" },
  { name: "Faisal (Printing)", employeeCode: "OP-P02", designation: "Printing" },
  { name: "Sarmad (Printing)", employeeCode: "OP-P03", designation: "Printing" },
  { name: "Kamran", employeeCode: "OP-P04", designation: "Printing" },
  { name: "Tahir", employeeCode: "OP-P05", designation: "Printing" },

  { name: "Aleem", employeeCode: "OP-C01", designation: "Cutting" },
  { name: "Waleed", employeeCode: "OP-C02", designation: "Cutting" },
  { name: "Faisal (Cutting)", employeeCode: "OP-C03", designation: "Cutting" },
  { name: "Mubashar", employeeCode: "OP-C04", designation: "Cutting" },
  { name: "Hassan", employeeCode: "OP-C05", designation: "Cutting" },
  { name: "Sarmad (Cutting)", employeeCode: "OP-C06", designation: "Cutting" },

  { name: "Mudassar", employeeCode: "OP-K01", designation: "Packaging" },
  { name: "Awais", employeeCode: "OP-K02", designation: "Packaging" },
];

export interface MachineSeed {
  name: string;
  machineCode: string;
  machineType: "Printing" | "Cutting";
  /** Operator paired with this machine on the same sheet row, if any. */
  operatorName: string | null;
  capacityPerHour: number;
}

export const MACHINES: MachineSeed[] = [
  { name: "SR Flexo 2+1", machineCode: "PRN-SR-2-1", machineType: "Printing", operatorName: "Saleem", capacityPerHour: 1200 },
  { name: "SL Flexo 4+1", machineCode: "PRN-SL-4-1", machineType: "Printing", operatorName: "Faisal (Printing)", capacityPerHour: 1500 },
  { name: "TA Flexo 3+2", machineCode: "PRN-TA-3-2", machineType: "Printing", operatorName: "Sarmad (Printing)", capacityPerHour: 1400 },
  { name: "KB Flexo 2+1", machineCode: "PRN-KB-2-1", machineType: "Printing", operatorName: "Kamran", capacityPerHour: 1100 },
  { name: "FA Flexo 4+2", machineCode: "PRN-FA-4-2", machineType: "Printing", operatorName: null, capacityPerHour: 1600 },
  { name: "Thermal printer", machineCode: "PRN-THERMAL", machineType: "Printing", operatorName: "Tahir", capacityPerHour: 800 },

  { name: "AS001", machineCode: "AS001", machineType: "Cutting", operatorName: "Aleem", capacityPerHour: 900 },
  { name: "AS002", machineCode: "AS002", machineType: "Cutting", operatorName: "Waleed", capacityPerHour: 900 },
  { name: "AS003", machineCode: "AS003", machineType: "Cutting", operatorName: "Faisal (Cutting)", capacityPerHour: 900 },
  { name: "AS004", machineCode: "AS004", machineType: "Cutting", operatorName: null, capacityPerHour: 900 },
  { name: "AS005", machineCode: "AS005", machineType: "Cutting", operatorName: "Mubashar", capacityPerHour: 900 },
  { name: "AS006", machineCode: "AS006", machineType: "Cutting", operatorName: "Hassan", capacityPerHour: 900 },
  { name: "HC001", machineCode: "HC001", machineType: "Cutting", operatorName: "Sarmad (Cutting)", capacityPerHour: 750 },
  { name: "HC002", machineCode: "HC002", machineType: "Cutting", operatorName: null, capacityPerHour: 750 },
  { name: "HC003", machineCode: "HC003", machineType: "Cutting", operatorName: null, capacityPerHour: 750 },
  { name: "HC004", machineCode: "HC004", machineType: "Cutting", operatorName: null, capacityPerHour: 750 },
  { name: "C&F AS007", machineCode: "AS007", machineType: "Cutting", operatorName: null, capacityPerHour: 900 },
];

/**
 * SAMPLE customers — NOT the facility's real company/brand sheet.
 *
 * The supplied companies & brands image renders at roughly 3px per character, which is
 * below the threshold at which the names can be read reliably, so transcribing it would
 * have meant inventing customer names. These are stand-ins so work orders are testable;
 * replace them once the real list is available as text/CSV.
 */
export interface CompanySeed {
  name: string;
  email: string;
  location: string;
  contactPerson: string;
  phone: string;
  brands: string[];
}

export const SAMPLE_COMPANIES: CompanySeed[] = [
  {
    name: "Sample Apparel & Textile Unit 1",
    email: "orders@sample-apparel-1.test",
    location: "Lahore",
    contactPerson: "Bilal Ahmed",
    phone: "+92-300-1000001",
    brands: ["Evolution", "Northbound", "Riverstone"],
  },
  {
    name: "Sample Apparel & Textile Unit 2",
    email: "orders@sample-apparel-2.test",
    location: "Lahore",
    contactPerson: "Hina Raza",
    phone: "+92-300-1000002",
    brands: ["Meridian", "Coastline", "Harbour Co"],
  },
  {
    name: "Sample Apparel & Textile Unit 3",
    email: "orders@sample-apparel-3.test",
    location: "Faisalabad",
    contactPerson: "Owais Khan",
    phone: "+92-300-1000003",
    brands: ["Ironwood", "Sable", "Truewear"],
  },
  {
    name: "Sample Denim Mills",
    email: "orders@sample-denim.test",
    location: "Karachi",
    contactPerson: "Nadia Iqbal",
    phone: "+92-300-1000004",
    brands: ["Indigo Line", "Raw Selvedge", "Blue Ridge"],
  },
  {
    name: "Sample Knitwear Industries",
    email: "orders@sample-knitwear.test",
    location: "Faisalabad",
    contactPerson: "Usman Tariq",
    phone: "+92-300-1000005",
    brands: ["Loopline", "Softknit", "Everyday"],
  },
  {
    name: "Sample Fabric Mills",
    email: "orders@sample-fabric.test",
    location: "Multan",
    contactPerson: "Sana Malik",
    phone: "+92-300-1000006",
    brands: ["Weftwood", "Loomcraft"],
  },
  {
    name: "Sample Garments Pvt Ltd",
    email: "orders@sample-garments.test",
    location: "Sialkot",
    contactPerson: "Kashif Hussain",
    phone: "+92-300-1000007",
    brands: ["Stitchline", "Field & Co", "Uniform Works"],
  },
  {
    name: "Sample Sportswear Co",
    email: "orders@sample-sportswear.test",
    location: "Sialkot",
    contactPerson: "Rabia Nawaz",
    phone: "+92-300-1000008",
    brands: ["Velocity", "Endurance", "Trackside"],
  },
  {
    name: "Sample Home Textiles",
    email: "orders@sample-home.test",
    location: "Karachi",
    contactPerson: "Imran Sheikh",
    phone: "+92-300-1000009",
    brands: ["Hearth", "Linen House"],
  },
  {
    name: "Sample Export House",
    email: "orders@sample-export.test",
    location: "Lahore",
    contactPerson: "Ayesha Farooq",
    phone: "+92-300-1000010",
    brands: ["Overseas One", "Portside", "Global Thread"],
  },
];

export const USERS = [
  { name: "Ayesha Siddiqui", role: "office_staff" as const },
  { name: "Bilal Hussain", role: "office_staff" as const },
  { name: "Rizwan Ali", role: "production_manager" as const },
  { name: "Nabeel Ahmed", role: "production_manager" as const },
  { name: "Saleem", role: "production_operator" as const },
  { name: "Aleem", role: "production_operator" as const },
  { name: "Mudassar", role: "production_operator" as const },
];

export const VENDORS = [
  "HUZHOU ZHENMIN SILK RIBBON CO., LTD.",
  "Shaoxing Weaving Supplies Co.",
  "Dongguan Label Materials Ltd.",
  "Karachi Ribbon Traders",
];
