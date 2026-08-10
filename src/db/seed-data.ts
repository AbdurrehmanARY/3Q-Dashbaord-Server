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
  { code: "10mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.1901 },
  { code: "15mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.1901 },
  { code: "20mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.255 },
  { code: "25mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.3404 },
  { code: "30mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.4048 },
  { code: "32mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.458 },
  { code: "35mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.49 },
  { code: "40mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.5165 },
  { code: "50mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.7201 },
  { code: "55mm NT65 PL", description: "Paper Label", type: "Taffeta", weight: 0.7982 },

  // — Simple Satin (PST510 SS) —
  { code: "10mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.21 },
  { code: "13mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.27 },
  { code: "15mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.328 },
  { code: "20mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.4063 },
  { code: "25mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.4985 },
  { code: "30mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.61955 },
  { code: "32mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.5881 },
  { code: "35mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.6735 },
  { code: "38mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.75 },
  { code: "40mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.86855 },
  { code: "45mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 0.9684 },
  { code: "50mm PST510 SS", description: "Simple Satin", type: "Satin", weight: 1.0755 },

  // — Double Side Simple Satin (PS5075 DSS) —
  { code: "13mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.29 },
  { code: "15mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.35 },
  { code: "20mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.46 },
  { code: "25mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.527 },
  { code: "30mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.7765 },
  { code: "32mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.692 },
  { code: "35mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.725 },
  { code: "38mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.7961 },
  { code: "40mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.8431 },
  { code: "45mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.96 },
  { code: "50mm PS5075 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 1.10 },

  // — Single Side Woven Edge (MZ3003 SSWE) —
  { code: "10mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 0.400 },
  { code: "13mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 0.48 },
  { code: "15mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 0.52 },
  { code: "20mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 0.68 },
  { code: "25mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 0.85 },
  { code: "29mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 0.9941 },
  { code: "30mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.05 },
  { code: "32mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.2305 },
  { code: "35mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.3197 },
  { code: "38mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.42 },
  { code: "40mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.5282 },
  { code: "45mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.7031 },
  { code: "50mm MZ3003 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.90 },

  // — Double Side Woven Edge (MZ3002 DSWE) —
  { code: "10mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 0.42 },
  { code: "12mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 0.50 },
  { code: "15mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 0.60 },
  { code: "20mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 0.80 },
  { code: "25mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.0590 },
  { code: "30mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.25 },
  { code: "32mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.4058 },
  { code: "35mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.4250 },
  { code: "38mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.55 },
  { code: "40mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.7667 },
  { code: "45mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.9609 },
  { code: "50mm MZ3002 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 2.15 },

  // — Micro Fiber & Dull Satin & Accted Taffeta —
  { code: "35mm PT240W White", description: "Micro Fiber", type: "Micro Fiber", weight: 0.53665 },
  { code: "35mm PT240W Black", description: "Micro Fiber", type: "Micro Fiber", weight: 0.5405 },
  { code: "40mm PT7328 PF", description: "Pearl Finish Satin", type: "Pearl Finish Satin", weight: 0.6511 },
  { code: "40mm 590", description: "Dull Satin", type: "Dull Satin", weight: 0.71175 },
  { code: "40mm Energy", description: "Accted Taffeta", type: "Accted Taffeta", weight: 0.60 },

  // — Grey & Tearaway —
  { code: "12mm Grey", description: "Single Side Woven Edge", type: "Satin", weight: 0.9092 },
  { code: "20mm Grey", description: "Single Side Woven Edge", type: "Satin", weight: 1.3941 },
  { code: "12mm Tearaway", description: "Tearaway Fabric", type: "Tearaway", weight: 0.2548 },
  { code: "20mm Tearaway", description: "Tearaway Fabric", type: "Tearaway", weight: 0.4061 },
  { code: "25mm Tearaway", description: "Tearaway Fabric", type: "Tearaway", weight: 0.6151 },
  { code: "30mm Tearaway", description: "Tearaway Fabric", type: "Tearaway", weight: 0.48 },

  // — Cotton (White & Off White) —
  { code: "12mm White Cotton", description: "White Cotton", type: "Cotton", weight: 0.25 },
  { code: "20mm White Cotton", description: "White Cotton", type: "Cotton", weight: 0.40 },
  { code: "25mm White Cotton", description: "White Cotton", type: "Cotton", weight: 0.50 },
  { code: "30mm White Cotton", description: "White Cotton", type: "Cotton", weight: 0.60 },
  { code: "40mm White Cotton", description: "White Cotton", type: "Cotton", weight: 0.80 },
  { code: "45mm White Cotton", description: "White Cotton", type: "Cotton", weight: 0.90 },
  { code: "70mm TC1628-K1 White Cotton", description: "White Cotton", type: "Cotton", weight: 2.21 },
  { code: "15mm Off White Cotton", description: "Off White Cotton", type: "Cotton", weight: 0.30 },
  { code: "20mm Off White Cotton", description: "Off White Cotton", type: "Cotton", weight: 0.40 },
  { code: "28mm Off White Cotton", description: "Off White Cotton", type: "Cotton", weight: 0.56 },

  // — Simple Satin Black —
  { code: "12mm PST510 SS Black", description: "Simple Satin Black", type: "Satin", weight: 0.25 },
  { code: "15mm PST510 SS Black", description: "Simple Satin Black", type: "Satin", weight: 0.328 },
  { code: "20mm PST510 SS Black", description: "Simple Satin Black", type: "Satin", weight: 0.4365 },
  { code: "25mm PST510 SS Black", description: "Simple Satin Black", type: "Satin", weight: 0.4985 },
  { code: "30mm PST510 SS Black", description: "Simple Satin Black", type: "Satin", weight: 0.61955 },
  { code: "32mm PST510 SS Black", description: "Simple Satin Black", type: "Satin", weight: 0.6881 },
  { code: "35mm PST510 SS Black", description: "Simple Satin Black", type: "Satin", weight: 0.75 },
  { code: "38mm PST510 SS Black", description: "Simple Satin Black", type: "Satin", weight: 0.82 },

  // — Double Side Simple Satin Black —
  { code: "15mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: 0.35 },
  { code: "20mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: 0.46 },
  { code: "25mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: 0.57 },
  { code: "30mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: 0.7765 },
  { code: "32mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: 0.692 },
  { code: "35mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: 0.725 },
  { code: "38mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: 0.7961 },
  { code: "45mm PS5075 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: 0.96 },

  // — Single Side Woven Edge Black —
  { code: "15mm MZ3003 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: 0.52 },
  { code: "20mm MZ3003 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: 0.68 },
  { code: "25mm MZ3003 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: 0.85 },
  { code: "30mm MZ3003 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: 1.05 },
  { code: "32mm MZ3003 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: 1.2305 },
  { code: "35mm MZ3003 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: 1.3197 },
  { code: "38mm MZ3003 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: 1.42 },
  { code: "40mm MZ3003 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: 1.5282 },
  { code: "45mm MZ3003 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: 1.7031 },
  { code: "50mm MZ3003 SSWE Black", description: "Single Side Woven Edge Black", type: "Satin", weight: 1.90 },

  // — Double Side Woven Edge Black —
  { code: "12mm MZ3002 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: 0.42 },
  { code: "20mm MZ3002 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: 0.80 },
  { code: "25mm MZ3002 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: 1.0590 },
  { code: "30mm MZ3002 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: 1.25 },
  { code: "32mm MZ3002 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: 1.4058 },
  { code: "35mm MZ3002 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: 1.4250 },
  { code: "38mm MZ3002 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: 1.55 },
  { code: "40mm MZ3002 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: 1.7667 },
  { code: "45mm MZ3002 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: 1.9609 },
  { code: "50mm MZ3002 DSWE Black", description: "Double Side Woven Edge Black", type: "Satin", weight: 2.15 },

  // — Recycle Satin & GFS / EFS Specials —
  { code: "20mm RS70 SS White", description: "Recycle Single Side Satin", type: "Recycle Satin", weight: 0.4355 },
  { code: "25mm RS70 SS White", description: "Recycle Single Side Satin", type: "Recycle Satin", weight: 0.54 },
  { code: "30mm RS70 SS White", description: "Recycle Single Side Satin", type: "Recycle Satin", weight: 0.6355 },

  // — Sheets / consumables —
  { code: "Jambo Roll", description: "Label Fabric", type: "Sheets", weight: 1.0 },
  { code: "Dencer Black Ink", description: null, type: "Sheets", weight: 1.0 },
  { code: "Red Ink", description: null, type: "Sheets", weight: 1.0 },

  // — EFS / 20% recycle variants —
  { code: "25mm NT65 PL EFS", description: "Paper Label", type: "Taffeta", weight: 0.3404 },
  { code: "40mm NT65 PL EFS", description: "Paper Label", type: "Taffeta", weight: 0.5165 },
  { code: "30mm RS70 SS White EFS", description: "Recycle Single Side Satin 20% Recycle", type: "Recycle Satin", weight: 0.6355 },
  { code: "45mm MZ315 SSWE EFS", description: "Single Side Woven Edge 20% Recycle", type: "Satin", weight: 1.7031 },
  { code: "32mm MZ316 DSWE EFS", description: "Double Side Woven Edge 20% Recycle", type: "Satin", weight: 1.4058 },
  { code: "40mm MZ316 DSWE EFS", description: "Double Side Woven Edge 20% Recycle", type: "Satin", weight: 1.7667 },
  { code: "12mm tearaway RT215-B soft EFS", description: "Tearaway Fabric 20% Recycle", type: "Tearaway", weight: 0.2548 },
  { code: "20mm tearaway RT215-B soft EFS", description: "Tearaway Fabric 20% Recycle", type: "Tearaway", weight: 0.4061 },
  { code: "35mm tearaway RT215-B soft EFS", description: "Tearaway Fabric 20% Recycle", type: "Tearaway", weight: 0.6151 },
  { code: "40mm S90 EFS", description: "Dull Satin 20% Recycle", type: "Satin", weight: 0.71175 },
  { code: "35mm tearaway RT215-B soft", description: "Tearaway Fabric 20% Recycle", type: "Tearaway", weight: 0.6151 },

  // — MZ315 / MZ316 / RS227 —
  { code: "25mm MZ316 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.0590 },
  { code: "35mm MZ316 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.4250 },
  { code: "40mm MZ316 DSWE", description: "Double Side Woven Edge", type: "Satin", weight: 1.7667 },
  { code: "35mm MZ315 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 1.3197 },
  { code: "25mm MZ315 SSWE", description: "Single Side Woven Edge", type: "Satin", weight: 0.85 },
  { code: "55mm PST712 SS", description: "Double Side Simple Satin", type: "Satin", weight: 1.18 },
  { code: "40mm RS227 DSS", description: "Double Side Simple Satin", type: "Satin", weight: 0.8431 },
  { code: "40mm PS7544 DSS Black", description: "Double Side Simple Satin Black", type: "Satin", weight: 0.8431 },
];

/** Operator names are UNIQUE, so the two people who appear in both the printing and the
 *  cutting column of the sheet (Faisal, Sarmad) are disambiguated by stage. */
export interface OperatorSeed {
  name: string;
  employeeCode: string;
  designation: "Printing" | "Cutting" | "Packaging";
}

export const OPERATORS: OperatorSeed[] = [
  // Printing Operators
  { name: "Saleem", employeeCode: "OP-P01", designation: "Printing" },
  { name: "Faisal (Printing)", employeeCode: "OP-P02", designation: "Printing" },
  { name: "Sarmad (Printing)", employeeCode: "OP-P03", designation: "Printing" },
  { name: "Kamran", employeeCode: "OP-P04", designation: "Printing" },
  { name: "Tahir", employeeCode: "OP-P05", designation: "Printing" },
  { name: "Asim", employeeCode: "OP-P06", designation: "Printing" },
  { name: "Master Nadeem", employeeCode: "OP-P07", designation: "Printing" },

  // Cutting Operators
  { name: "Aleem", employeeCode: "OP-C01", designation: "Cutting" },
  { name: "Waleed", employeeCode: "OP-C02", designation: "Cutting" },
  { name: "Faisal (Cutting)", employeeCode: "OP-C03", designation: "Cutting" },
  { name: "Mubashar", employeeCode: "OP-C04", designation: "Cutting" },
  { name: "Hassan", employeeCode: "OP-C05", designation: "Cutting" },
  { name: "Sarmad (Cutting)", employeeCode: "OP-C06", designation: "Cutting" },

  // Packaging Operators
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
  // Printing Machines
  { name: "SR Flexo 2+1", machineCode: "PRN-SR-2-1", machineType: "Printing", operatorName: "Saleem", capacityPerHour: 1200 },
  { name: "SL Flexo 4+1", machineCode: "PRN-SL-4-1", machineType: "Printing", operatorName: "Faisal (Printing)", capacityPerHour: 1500 },
  { name: "TA Flexo 3+2", machineCode: "PRN-TA-3-2", machineType: "Printing", operatorName: "Sarmad (Printing)", capacityPerHour: 1400 },
  { name: "KB Flexo 2+1", machineCode: "PRN-KB-2-1", machineType: "Printing", operatorName: "Kamran", capacityPerHour: 1100 },
  { name: "FA Flexo 4+2", machineCode: "PRN-FA-4-2", machineType: "Printing", operatorName: null, capacityPerHour: 1600 },
  { name: "Thermal printer", machineCode: "PRN-THERMAL", machineType: "Printing", operatorName: "Tahir", capacityPerHour: 800 },
  { name: "jack-1", machineCode: "PRN-JACK-1", machineType: "Printing", operatorName: null, capacityPerHour: 1000 },
  { name: "jack-2", machineCode: "PRN-JACK-2", machineType: "Printing", operatorName: null, capacityPerHour: 1000 },
  { name: "jack-3", machineCode: "PRN-JACK-3", machineType: "Printing", operatorName: null, capacityPerHour: 1000 },
  { name: "jack-4", machineCode: "PRN-JACK-4", machineType: "Printing", operatorName: null, capacityPerHour: 1000 },
  { name: "needle-1", machineCode: "PRN-NEEDLE-1", machineType: "Printing", operatorName: "Asim", capacityPerHour: 1200 },

  // Cutting Machines
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

export const COMPANIES: CompanySeed[] = [
  { name: "A.H Garments Unit 1", email: "contact@ahgarments.com", location: "Lahore", contactPerson: "Asif Mahmood", phone: "+92-42-35000001", brands: ["Cinderella"] },
  { name: "A.H Garments Unit 2", email: "unit2@ahgarments.com", location: "Lahore", contactPerson: "Tariq Mahmood", phone: "+92-42-35000002", brands: ["J. (Junaid Jamshed)"] },
  { name: "A.H Garments Unit 3", email: "unit3@ahgarments.com", location: "Lahore", contactPerson: "Shahid Mahmood", phone: "+92-42-35000003", brands: ["Ideas by Gul Ahmed"] },
  { name: "A.H Garments Unit 4", email: "unit4@ahgarments.com", location: "Lahore", contactPerson: "Imran Mahmood", phone: "+92-42-35000004", brands: ["Gul Ahmed"] },
  { name: "A.H Garments Unit 5", email: "unit5@ahgarments.com", location: "Lahore", contactPerson: "Kamran Mahmood", phone: "+92-42-35000005", brands: ["Din Apparel"] },
  { name: "A.H Garments Unit 6", email: "unit6@ahgarments.com", location: "Lahore", contactPerson: "Faisal Mahmood", phone: "+92-42-35000006", brands: ["Din Textile"] },
  { name: "Mega Fabrics", email: "info@megafabrics.com", location: "Faisalabad", contactPerson: "Zubair Ahmad", phone: "+92-41-8700001", brands: ["Mega"] },
  { name: "M/S Haroon Bros", email: "orders@haroonbros.com", location: "Karachi", contactPerson: "Haroon Rashid", phone: "+92-21-3400001", brands: ["Haroon"] },
  { name: "Kashif Apparel (Pvt) Ltd", email: "info@kashifapparel.com", location: "Lahore", contactPerson: "Kashif Ali", phone: "+92-42-3510001", brands: ["Kashif Apparel"] },
  { name: "Target Apparel (Pvt) Ltd", email: "sales@targetapparel.com", location: "Karachi", contactPerson: "Usman Ghani", phone: "+92-21-3410001", brands: ["Target"] },
  { name: "Rightway Knitwear (Pvt) Ltd", email: "info@rightwayknit.com", location: "Faisalabad", contactPerson: "Bilal Anwar", phone: "+92-41-8710001", brands: ["Rightway"] },
  { name: "Total Apparel (Pvt) Ltd", email: "info@totalapparel.com", location: "Sialkot", contactPerson: "Hamza Riaz", phone: "+92-52-4510001", brands: ["Total"] },
  { name: "Vogue Apparel (Pvt) Ltd", email: "orders@vogueapparel.com", location: "Lahore", contactPerson: "Adnan Raza", phone: "+92-42-3520001", brands: ["Vogue"] },
  { name: "Silver Fiber (Pvt) Ltd", email: "info@silverfiber.com", location: "Multan", contactPerson: "Sajid Khan", phone: "+92-61-6510001", brands: ["Silver Fiber"] },
  { name: "Style Textile (Pvt) Ltd", email: "info@styletextile.com", location: "Lahore", contactPerson: "Asghar Ali", phone: "+92-42-3530001", brands: ["Style"] },
  { name: "Kishwar Knitting", email: "info@kishwarknitting.com", location: "Faisalabad", contactPerson: "Kishwar Sultan", phone: "+92-41-8720001", brands: ["Kishwar"] },
  { name: "Akhtar Textile", email: "contact@akhtartextile.com", location: "Karachi", contactPerson: "Akhtar Hussain", phone: "+92-21-3420001", brands: ["Akhtar"] },
  { name: "Fashion World", email: "info@fashionworld.com", location: "Lahore", contactPerson: "Zeeshan Malik", phone: "+92-42-3540001", brands: ["Fashion World"] },
  { name: "Unique Apparel", email: "sales@uniqueapparel.com", location: "Sialkot", contactPerson: "Noman Sheikh", phone: "+92-52-4520001", brands: ["Unique"] },
  { name: "Crescent Textile Mills", email: "info@crescenttextile.com", location: "Faisalabad", contactPerson: "Omer Saeed", phone: "+92-41-8730001", brands: ["Crescent"] },
  { name: "Master Fabric", email: "info@masterfabric.com", location: "Lahore", contactPerson: "Tariq Master", phone: "+92-42-3550001", brands: ["Master"] },
  { name: "Nishat Mills Ltd", email: "info@nishatmillsltd.com", location: "Lahore", contactPerson: "Mian Mansha", phone: "+92-42-3560001", brands: ["Nishat"] },
  { name: "Interloop Ltd", email: "info@interloop.com.pk", location: "Faisalabad", contactPerson: "Musadaq Zulqarnain", phone: "+92-41-8740001", brands: ["Interloop"] },
  { name: "Masood Textile Mills", email: "info@masoodtextile.com", location: "Faisalabad", contactPerson: "Shahid Nazir", phone: "+92-41-8750001", brands: ["Masood"] },
  { name: "Sadiq Fabrics", email: "sales@sadiqfabrics.com", location: "Lahore", contactPerson: "Sadiq Muhammad", phone: "+92-42-3570001", brands: ["Sadiq"] },
  { name: "Kings Apparel", email: "info@kingsapparel.com", location: "Karachi", contactPerson: "Munir Ahmed", phone: "+92-21-3430001", brands: ["Kings"] },
  { name: "Zubair Apparel", email: "info@zubairapparel.com", location: "Lahore", contactPerson: "Zubair Hashmi", phone: "+92-42-3580001", brands: ["Zubair Apparel"] },
  { name: "Premier Apparel", email: "info@premierapparel.com", location: "Faisalabad", contactPerson: "Rashid Latif", phone: "+92-41-8760001", brands: ["Premier"] },
  { name: "Prime Textile Mills", email: "info@primetextile.com", location: "Karachi", contactPerson: "Irfan Siddiqui", phone: "+92-21-3440001", brands: ["Prime"] },
  { name: "Al-Karam Textile Mills", email: "info@alkaram.com", location: "Karachi", contactPerson: "Fawad Anwar", phone: "+92-21-3450001", brands: ["Al-Karam"] },
  { name: "Liberty Books & Textile", email: "info@libertytextile.com", location: "Karachi", contactPerson: "Saleem Bashir", phone: "+92-21-3460001", brands: ["Liberty"] },
  { name: "Chenab Textile Mills", email: "info@chenabgroup.com", location: "Faisalabad", contactPerson: "Mian Latif", phone: "+92-41-8770001", brands: ["Chenab"] },
  { name: "Kohinoor Textile Mills", email: "info@kohinoor.com", location: "Rawalpindi", contactPerson: "Tawfiq Saigol", phone: "+92-51-4400001", brands: ["Kohinoor"] },
  { name: "Fazal Cloth Mills", email: "info@fazalcloth.com", location: "Multan", contactPerson: "Rehman Naseem", phone: "+92-61-6520001", brands: ["Fazal Cloth"] },
  { name: "Sapphire Textile Mills", email: "info@sapphire.com.pk", location: "Lahore", contactPerson: "Nabeel Abdullah", phone: "+92-42-3590001", brands: ["Sapphire"] },
  { name: "Artistic Fabric Mills", email: "info@artisticfabric.com", location: "Karachi", contactPerson: "Iqbal Ahmed", phone: "+92-21-3470001", brands: ["Artistic"] },
  { name: "US Apparel & Textile", email: "info@usapparel.com", location: "Lahore", contactPerson: "Javed Bhatti", phone: "+92-42-3600001", brands: ["US Apparel"] },
  { name: "Zephyr Textile", email: "info@zephyr.com.pk", location: "Lahore", contactPerson: "Waseem Hassan", phone: "+92-42-3610001", brands: ["Zephyr"] },
  { name: "Suraj Cotton Mills", email: "info@suraj.com.pk", location: "Lahore", contactPerson: "Ahsan Bashir", phone: "+92-42-3620001", brands: ["Suraj Cotton"] },
  { name: "Ibrahim Fibres Ltd", email: "info@igc.com.pk", location: "Faisalabad", contactPerson: "Naeem Ibrahim", phone: "+92-41-8780001", brands: ["Ibrahim"] },
  { name: "Soorty Enterprises", email: "info@soorty.com", location: "Karachi", contactPerson: "Shahid Soorty", phone: "+92-21-3480001", brands: ["Soorty"] },
  { name: "Denim Cloth Mills", email: "info@denimcloth.com", location: "Karachi", contactPerson: "Asif Habib", phone: "+92-21-3490001", brands: ["Denim Cloth"] },
  { name: "Azgard Nine Ltd", email: "info@azgard9.com", location: "Lahore", contactPerson: "Ahmed Shaikh", phone: "+92-42-3630001", brands: ["Azgard Nine"] },
  { name: "Sitara Textile Industries", email: "info@sitara.com.pk", location: "Faisalabad", contactPerson: "Muhammad Sitara", phone: "+92-41-8790001", brands: ["Sitara"] },
  { name: "Orient Textile Mills", email: "info@orienttextile.com", location: "Karachi", contactPerson: "Saqib Orient", phone: "+92-21-3500001", brands: ["Orient"] },
  { name: "Bonanza Garments", email: "info@bonanzasatrangi.com", location: "Karachi", contactPerson: "Haneef Bilwani", phone: "+92-21-3510001", brands: ["Bonanza"] },
  { name: "Saya Fabrics", email: "info@saya.pk", location: "Karachi", contactPerson: "Farhan Saya", phone: "+92-21-3520001", brands: ["Saya"] },
  { name: "Baroque Fashions", email: "info@baroque.pk", location: "Lahore", contactPerson: "Raza Baroque", phone: "+92-42-3640001", brands: ["Baroque"] },
  { name: "Maria B. Designs", email: "info@mariab.pk", location: "Lahore", contactPerson: "Maria B.", phone: "+92-42-3650001", brands: ["Maria B."] },
  { name: "Sana Safinaz", email: "info@sanasafinaz.com", location: "Karachi", contactPerson: "Sana Hashwani", phone: "+92-21-3530001", brands: ["Sana Safinaz"] },
  { name: "Asim Jofa", email: "info@asimjofa.com", location: "Karachi", contactPerson: "Asim Jofa", phone: "+92-21-3540001", brands: ["Asim Jofa"] },
  { name: "Cross Stitch", email: "info@crossstitch.pk", location: "Lahore", contactPerson: "Usman Cross", phone: "+92-42-3660001", brands: ["Cross Stitch"] },
  { name: "Charizma", email: "info@houseofcharizma.com", location: "Lahore", contactPerson: "Riaz Charizma", phone: "+92-42-3670001", brands: ["Charizma"] },
  { name: "Beechtree", email: "info@beechtree.pk", location: "Lahore", contactPerson: "Kehkeshan Beechtree", phone: "+92-42-3680001", brands: ["Beechtree"] },
  { name: "Ethnic by Outfitters", email: "info@ethnic.pk", location: "Lahore", contactPerson: "Kamran Ethnic", phone: "+92-42-3690001", brands: ["Ethnic"] },
  { name: "Outfitters", email: "info@outfitters.com.pk", location: "Lahore", contactPerson: "Kamran Khurshid", phone: "+92-42-3700001", brands: ["Outfitters"] },
  { name: "Breakout", email: "info@breakout.com.pk", location: "Lahore", contactPerson: "Imran Breakout", phone: "+92-42-3710001", brands: ["Breakout"] },
  { name: "Engines & Fabrics", email: "info@enginesfabrics.com", location: "Faisalabad", contactPerson: "Tariq Engine", phone: "+92-41-8800001", brands: ["Engines"] },
  { name: "Cougar Clothing", email: "info@cougar.com.pk", location: "Lahore", contactPerson: "Asad Cougar", phone: "+92-42-3720001", brands: ["Cougar"] },
  { name: "Stoneage", email: "info@stoneage.com.pk", location: "Lahore", contactPerson: "Faisal Stoneage", phone: "+92-42-3730001", brands: ["Stoneage"] },
  { name: "Chinyere", email: "info@chinyere.pk", location: "Lahore", contactPerson: "Salman Bareeze", phone: "+92-42-3740001", brands: ["Chinyere"] },
  { name: "Mango Pakistan", email: "info@mango.com.pk", location: "Karachi", contactPerson: "Zubair Mango", phone: "+92-21-3550001", brands: ["Mango"] },
  { name: "Zellbury", email: "info@zellbury.com", location: "Karachi", contactPerson: "Rauf Zellbury", phone: "+92-21-3560001", brands: ["Zellbury"] },
  { name: "Generation", email: "info@generation.com.pk", location: "Lahore", contactPerson: "Saad Rahman", phone: "+92-42-3750001", brands: ["Generation"] },
  { name: "Image Fabrics", email: "info@image.net.pk", location: "Karachi", contactPerson: "Mudar Image", phone: "+92-21-3570001", brands: ["Image"] },
  { name: "Rang Ja", email: "info@rangja.com.pk", location: "Lahore", contactPerson: "Ahsan RangJa", phone: "+92-42-3760001", brands: ["Rang Ja"] },
  { name: "Eagle Clothing", email: "info@eagleclothing.com", location: "Sialkot", contactPerson: "Arshad Eagle", phone: "+92-52-4530001", brands: ["Eagle"] },
  { name: "Laam", email: "info@laam.pk", location: "Lahore", contactPerson: "Arif Laam", phone: "+92-42-3770001", brands: ["Laam"] },
  { name: "Bareeze", email: "info@bareeze.com", location: "Lahore", contactPerson: "Hamid Bareeze", phone: "+92-42-3780001", brands: ["Bareeze"] },
  { name: "Edenrobe", email: "info@edenrobe.com", location: "Karachi", contactPerson: "Zain Edenrobe", phone: "+92-21-3580001", brands: ["Edenrobe"] },
  { name: "Unze London", email: "info@unze.com.pk", location: "Lahore", contactPerson: "Shabbir Unze", phone: "+92-42-3790001", brands: ["Unze"] },
  { name: "Royal Tag", email: "info@royaltag.com.pk", location: "Lahore", contactPerson: "Asif Royal", phone: "+92-42-3800001", brands: ["Royal Tag"] },
  { name: "Diners", email: "info@diners.com.pk", location: "Karachi", contactPerson: "Mohsin Diners", phone: "+92-21-3590001", brands: ["Diners"] },
  { name: "Cambridge", email: "info@thecambridgeshop.com", location: "Karachi", contactPerson: "Anis Ismail", phone: "+92-21-3600001", brands: ["Cambridge"] },
  { name: "Lawrencepur", email: "info@lawrencepur.com", location: "Lahore", contactPerson: "Farooq Lawrencepur", phone: "+92-42-3810001", brands: ["Lawrencepur"] },
  { name: "Charcoal", email: "info@charcoal.com.pk", location: "Lahore", contactPerson: "Zubair Charcoal", phone: "+92-42-3820001", brands: ["Charcoal"] },
  { name: "Monark", email: "info@monark.com.pk", location: "Lahore", contactPerson: "Taimoor Monark", phone: "+92-42-3830001", brands: ["Monark"] },
  { name: "Chester Bernard", email: "info@chesterbernard.com", location: "Karachi", contactPerson: "Chester Bernard", phone: "+92-21-3610001", brands: ["Chester Bernard"] },
  { name: "Studio by Tallah", email: "info@studiobytallah.com", location: "Lahore", contactPerson: "Tallah Studio", phone: "+92-42-3840001", brands: ["Studio by Tallah"] },
  { name: "Snoopy Kids", email: "info@snoopykids.pk", location: "Lahore", contactPerson: "Rashid Snoopy", phone: "+92-42-3850001", brands: ["Snoopy"] },
  { name: "Juniors", email: "info@juniors.pk", location: "Karachi", contactPerson: "Faraz Juniors", phone: "+92-21-3620001", brands: ["Juniors"] },
  { name: "Mini Minors", email: "info@miniminors.com", location: "Lahore", contactPerson: "Tariq Mini", phone: "+92-42-3860001", brands: ["Mini Minors"] },
  { name: "Hopscotch", email: "info@hopscotch.pk", location: "Lahore", contactPerson: "Romana Hopscotch", phone: "+92-42-3870001", brands: ["Hopscotch"] },
  { name: "Pepperland", email: "info@pepperland.pk", location: "Lahore", contactPerson: "Ali Pepperland", phone: "+92-42-3880001", brands: ["Pepperland"] },
  { name: "Kids & Co", email: "info@kidsco.pk", location: "Karachi", contactPerson: "Sameer Kids", phone: "+92-21-3630001", brands: ["Kids & Co"] },
  { name: "Limelight", email: "info@limelight.pk", location: "Lahore", contactPerson: "Waseem Limelight", phone: "+92-42-3890001", brands: ["Limelight"] },
  { name: "Agha Noor", email: "info@aghanoor.pk", location: "Karachi", contactPerson: "Agha Noor", phone: "+92-21-3640001", brands: ["Agha Noor"] },
  { name: "Zahra Ahmad", email: "info@zahraahmad.com", location: "Lahore", contactPerson: "Zahra Ahmad", phone: "+92-42-3900001", brands: ["Zahra Ahmad"] },
  { name: "Soaked in Luxury", email: "info@soakedinluxury.com", location: "Karachi", contactPerson: "Kashif Luxury", phone: "+92-21-3650001", brands: ["Soaked in Luxury"] },
  { name: "Faiza Samee", email: "info@faizasamee.com", location: "Karachi", contactPerson: "Faiza Samee", phone: "+92-21-3660001", brands: ["Faiza Samee"] },
  { name: "Nomi Ansari", email: "info@nomiansari.com.pk", location: "Karachi", contactPerson: "Nomi Ansari", phone: "+92-21-3670001", brands: ["Nomi Ansari"] },
  { name: "Hassan Sheheryar Yasin (HSY)", email: "info@hsy.com.pk", location: "Lahore", contactPerson: "Hassan Sheheryar Yasin", phone: "+92-42-3910001", brands: ["HSY"] },
  { name: "Faraz Manan", email: "info@farazmanan.com", location: "Lahore", contactPerson: "Faraz Manan", phone: "+92-42-3920001", brands: ["Faraz Manan"] },
  { name: "Ali Xeeshan", email: "info@alixeeshan.com", location: "Lahore", contactPerson: "Ali Xeeshan", phone: "+92-42-3930001", brands: ["Ali Xeeshan"] },
  { name: "Sania Maskatiya", email: "info@saniamaskatiya.com", location: "Karachi", contactPerson: "Sania Maskatiya", phone: "+92-21-3680001", brands: ["Sania Maskatiya"] },
  { name: "Shehla Chatoor", email: "info@shehlachatoor.com", location: "Karachi", contactPerson: "Shehla Chatoor", phone: "+92-21-3690001", brands: ["Shehla Chatoor"] },
  { name: "Shamaeel Ansari", email: "info@shamaeelansari.com", location: "Karachi", contactPerson: "Shamaeel Ansari", phone: "+92-21-3700001", brands: ["Shamaeel Ansari"] },
  { name: "Zuria Dor", email: "info@zuriador.com", location: "Lahore", contactPerson: "Kizil Zuria", phone: "+92-42-3940001", brands: ["Zuria Dor"] },
  { name: "Mustafa", email: "info@mustafaapparel.com", location: "Faisalabad", contactPerson: "Mustafa Ali", phone: "+92-41-8810001", brands: ["Mustafa"] },
  { name: "Anaya by Kiran Chaudhry", email: "info@anaya.com.pk", location: "Lahore", contactPerson: "Kiran Chaudhry", phone: "+92-42-3950001", brands: ["Anaya"] },
  { name: "Nida Azwer", email: "info@nidaazwer.com", location: "Karachi", contactPerson: "Nida Azwer", phone: "+92-21-3710001", brands: ["Nida Azwer"] },
  { name: "Elan", email: "info@elan.pk", location: "Lahore", contactPerson: "Khadijah Shah", phone: "+92-42-3960001", brands: ["Elan"] },
  { name: "Republic by Omer Farooq", email: "info@republic.com.pk", location: "Lahore", contactPerson: "Omer Farooq", phone: "+92-42-3970001", brands: ["Republic"] },
  { name: "Tenzin Chatwal", email: "info@tenzinchatwal.com", location: "Lahore", contactPerson: "Tenzin Chatwal", phone: "+92-42-3980001", brands: ["Tenzin"] },
  { name: "Tena Durrani", email: "info@tenadurrani.com", location: "Karachi", contactPerson: "Tena Durrani", phone: "+92-21-3720001", brands: ["Tena Durrani"] },
  { name: "Maheen Karim", email: "info@maheenkarim.com", location: "Karachi", contactPerson: "Maheen Karim", phone: "+92-21-3730001", brands: ["Maheen Karim"] },
  { name: "Sadaf Fawad Khan (SFK)", email: "info@sfk.com.pk", location: "Lahore", contactPerson: "Sadaf Fawad Khan", phone: "+92-42-3990001", brands: ["SFK"] },
  { name: "Zainab Chottani", email: "info@zainabchottani.com", location: "Karachi", contactPerson: "Zainab Chottani", phone: "+92-21-3740001", brands: ["Zainab Chottani"] },
  { name: "Sammy K", email: "info@sammyk.com", location: "Lahore", contactPerson: "Sammy K", phone: "+92-42-4000001", brands: ["Sammy K"] },
  { name: "Azure", email: "info@azure.com.pk", location: "Lahore", contactPerson: "Tariq Azure", phone: "+92-42-4010001", brands: ["Azure"] },
  { name: "Festive", email: "info@festive.com.pk", location: "Lahore", contactPerson: "Hamza Festive", phone: "+92-42-4020001", brands: ["Festive"] },
  { name: "Resonance", email: "info@resonance.com.pk", location: "Karachi", contactPerson: "Ali Resonance", phone: "+92-21-3750001", brands: ["Resonance"] },
  { name: "Khaadi", email: "info@khaadi.com", location: "Karachi", contactPerson: "Shamoon Sultan", phone: "+92-21-3760001", brands: ["Khaadi"] },
  { name: "Needle Impressions", email: "info@needleimpressions.com", location: "Lahore", contactPerson: "Tariq Needle", phone: "+92-42-4030001", brands: ["Needle Impressions"] },
  { name: "Thread & Motifs", email: "info@threadandmotifs.com", location: "Karachi", contactPerson: "Adnan Thread", phone: "+92-21-3770001", brands: ["Thread & Motifs"] },
  { name: "Bullion", email: "info@bullion.com.pk", location: "Lahore", contactPerson: "Raza Bullion", phone: "+92-42-4040001", brands: ["Bullion"] },
  { name: "Morial", email: "info@morial.com.pk", location: "Lahore", contactPerson: "Usman Morial", phone: "+92-42-4050001", brands: ["Morial"] },
  { name: "Textures", email: "info@textures.com.pk", location: "Karachi", contactPerson: "Bilal Textures", phone: "+92-21-3780001", brands: ["Textures"] },
  { name: "Embroidery House", email: "info@embroideryhouse.pk", location: "Faisalabad", contactPerson: "Kamran Embroidery", phone: "+92-41-8820001", brands: ["Embroidery House"] },
  { name: "Urban Sole", email: "info@urbansole.com.pk", location: "Lahore", contactPerson: "Zubair Urban", phone: "+92-42-4060001", brands: ["Urban Sole"] },
  { name: "Borjan", email: "info@borjan.com.pk", location: "Lahore", contactPerson: "Rehan Borjan", phone: "+92-42-4070001", brands: ["Borjan"] },
  { name: "Bata Pakistan", email: "info@bata.com.pk", location: "Lahore", contactPerson: "Imran Bata", phone: "+92-42-4080001", brands: ["Bata"] },
  { name: "Service Industries (Servis)", email: "info@servis.com.pk", location: "Lahore", contactPerson: "Arif Servis", phone: "+92-42-4090001", brands: ["Servis"] },
  { name: "Stylo Shoes", email: "info@stylo.pk", location: "Lahore", contactPerson: "Azhar Stylo", phone: "+92-42-4100001", brands: ["Stylo"] },
  { name: "Ndure", email: "info@ndure.com.pk", location: "Lahore", contactPerson: "Omer Ndure", phone: "+92-42-4110001", brands: ["Ndure"] },
  { name: "Clive Shoes", email: "info@cliveshoes.com", location: "Lahore", contactPerson: "Faisal Clive", phone: "+92-42-4120001", brands: ["Clive"] },
  { name: "Metro Shoes", email: "info@metroshoes.com.pk", location: "Lahore", contactPerson: "Farhan Metro", phone: "+92-42-4130001", brands: ["Metro"] },
  { name: "1st Step", email: "info@1ststep.com.pk", location: "Karachi", contactPerson: "Tariq 1stStep", phone: "+92-21-3790001", brands: ["1st Step"] },
  { name: "Logic Shoes", email: "info@logicshoes.com", location: "Lahore", contactPerson: "Asad Logic", phone: "+92-42-4140001", brands: ["Logic"] },
  { name: "Starlet Shoes", email: "info@starlet.pk", location: "Lahore", contactPerson: "Noman Starlet", phone: "+92-42-4150001", brands: ["Starlet"] },
  { name: "Inch5", email: "info@inch5.com.pk", location: "Karachi", contactPerson: "Sajid Inch5", phone: "+92-21-3800001", brands: ["Inch5"] },
  { name: "English Boot House (EBH)", email: "info@ebh.com.pk", location: "Karachi", contactPerson: "Mustafa EBH", phone: "+92-21-3810001", brands: ["EBH"] },
  { name: "Episode", email: "info@episode.com.pk", location: "Lahore", contactPerson: "Bilal Episode", phone: "+92-42-4160001", brands: ["Episode"] },
  { name: "High Street", email: "info@highstreet.com.pk", location: "Lahore", contactPerson: "Zeeshan HighStreet", phone: "+92-42-4170001", brands: ["High Street"] },
  { name: "Urban Outfitters Pakistan", email: "info@urbanoutfitters.pk", location: "Lahore", contactPerson: "Hamza UO", phone: "+92-42-4180001", brands: ["Urban Outfitters"] },
  { name: "Jack & Jones Pakistan", email: "info@jackjones.pk", location: "Lahore", contactPerson: "Adnan JJ", phone: "+92-42-4190001", brands: ["Jack & Jones"] },
  { name: "Vero Moda Pakistan", email: "info@veromoda.pk", location: "Lahore", contactPerson: "Hina Vero", phone: "+92-42-4200001", brands: ["Vero Moda"] },
  { name: "Only Pakistan", email: "info@only.pk", location: "Lahore", contactPerson: "Sania Only", phone: "+92-42-4210001", brands: ["Only"] },
  { name: "Name It Pakistan", email: "info@nameit.pk", location: "Lahore", contactPerson: "Usman NameIt", phone: "+92-42-4220001", brands: ["Name It"] },
  { name: "Giordano Pakistan", email: "info@giordano.com.pk", location: "Karachi", contactPerson: "Raza Giordano", phone: "+92-21-3820001", brands: ["Giordano"] },
  { name: "Splash Pakistan", email: "info@splashfashions.pk", location: "Karachi", contactPerson: "Faisal Splash", phone: "+92-21-3830001", brands: ["Splash"] },
  { name: "Babyshop Pakistan", email: "info@babyshop.pk", location: "Karachi", contactPerson: "Ayesha Babyshop", phone: "+92-21-3840001", brands: ["Babyshop"] },
  { name: "Max Fashion Pakistan", email: "info@maxfashion.pk", location: "Karachi", contactPerson: "Nabeel Max", phone: "+92-21-3850001", brands: ["Max"] },
  { name: "Centrepoint Pakistan", email: "info@centrepoint.pk", location: "Karachi", contactPerson: "Imran Centrepoint", phone: "+92-21-3860001", brands: ["Centrepoint"] },
  { name: "Mothercare Pakistan", email: "info@mothercare.pk", location: "Lahore", contactPerson: "Rabia Mothercare", phone: "+92-42-4230001", brands: ["Mothercare"] },
  { name: "Next Pakistan", email: "info@next.com.pk", location: "Lahore", contactPerson: "Tariq Next", phone: "+92-42-4240001", brands: ["Next"] },
  { name: "Aldo Pakistan", email: "info@aldoshoes.pk", location: "Lahore", contactPerson: "Zubair Aldo", phone: "+92-42-4250001", brands: ["Aldo"] },
  { name: "Charles & Keith Pakistan", email: "info@charleskeith.pk", location: "Lahore", contactPerson: "Maria CK", phone: "+92-42-4260001", brands: ["Charles & Keith"] },
  { name: "Pedro Pakistan", email: "info@pedroshoes.pk", location: "Lahore", contactPerson: "Faisal Pedro", phone: "+92-42-4270001", brands: ["Pedro"] },
  { name: "Miniso Pakistan", email: "info@miniso.pk", location: "Lahore", contactPerson: "Chen Miniso", phone: "+92-42-4280001", brands: ["Miniso"] },
  { name: "Mumuso Pakistan", email: "info@mumuso.pk", location: "Lahore", contactPerson: "Lee Mumuso", phone: "+92-42-4290001", brands: ["Mumuso"] },
  { name: "Yoyoso Pakistan", email: "info@yoyoso.pk", location: "Lahore", contactPerson: "Wang Yoyoso", phone: "+92-42-4300001", brands: ["Yoyoso"] },
  { name: "Ximi Vogue Pakistan", email: "info@ximivogue.pk", location: "Lahore", contactPerson: "Zhang Ximi", phone: "+92-42-4310001", brands: ["Ximi Vogue"] },
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

export interface PurchaseSeed {
  reportDate: string;
  itemName: string;
  vendor: string;
  invoiceNumber: string;
  gdNumber: string | null;
  description: string;
  cartonQty: number;
  rollsPerCarton: number;
  totalRoll: number;
  rollLength: number;
  netWeight: number;
  totalRollPer200m: number;
  isEfs: boolean;
  invoiceWeight: number;
  localWeight: number;
  materialCode: string;
}

export const PURCHASE_SEEDS: PurchaseSeed[] = [
  { reportDate: "2024-11-01", itemName: "Simple Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-001", description: "Satin", cartonQty: 30, rollsPerCarton: 20, totalRoll: 600, rollLength: 400, netWeight: 800, totalRollPer200m: 1200, isEfs: false, invoiceWeight: 0.61955, localWeight: 0.61955, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-02", itemName: "Paper Label", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-002", description: "Taffeta", cartonQty: 83, rollsPerCarton: 24, totalRoll: 1992, rollLength: 400, netWeight: 1358.04, totalRollPer200m: 3984, isEfs: false, invoiceWeight: 0.341, localWeight: 0.3404, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-03", itemName: "Single Side Woven Edge", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-003", description: "Satin", cartonQty: 66, rollsPerCarton: 18, totalRoll: 1188, rollLength: 400, netWeight: 942.8, totalRollPer200m: 2376, isEfs: false, invoiceWeight: 0.3968, localWeight: 1.3041, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-11-04", itemName: "Paper Label", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-004", description: "Taffeta", cartonQty: 36, rollsPerCarton: 14, totalRoll: 504, rollLength: 400, netWeight: 499.97, totalRollPer200m: 1008, isEfs: false, invoiceWeight: 0.496, localWeight: 0.5165, materialCode: "40mm NT65 PL" },
  { reportDate: "2024-11-05", itemName: "Simple Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-005", description: "Satin", cartonQty: 83, rollsPerCarton: 18, totalRoll: 1494, rollLength: 200, netWeight: 2084.43, totalRollPer200m: 1494, isEfs: false, invoiceWeight: 1.3952, localWeight: 0.61955, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-06", itemName: "Simple Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-006", description: "Satin", cartonQty: 83, rollsPerCarton: 18, totalRoll: 1494, rollLength: 200, netWeight: 2084.43, totalRollPer200m: 1494, isEfs: false, invoiceWeight: 1.3952, localWeight: 0.61955, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-07", itemName: "Label Sheet", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-007", description: "Taffeta", cartonQty: 10, rollsPerCarton: 2, totalRoll: 20, rollLength: 300, netWeight: 100, totalRollPer200m: 30, isEfs: false, invoiceWeight: 5.0, localWeight: 1.0, materialCode: "50mm NT65 PL" },
  { reportDate: "2024-11-08", itemName: "Label Fabric Sheet", vendor: "yousaf enterprises", invoiceNumber: "507", gdNumber: null, description: "Sheets", cartonQty: 1, rollsPerCarton: 1439, totalRoll: 1439, rollLength: 200, netWeight: 1439, totalRollPer200m: 1439, isEfs: false, invoiceWeight: 1.0, localWeight: 1.0, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-09", itemName: "Label Fabric Sheet", vendor: "yousaf enterprises", invoiceNumber: "508", gdNumber: null, description: "Sheets", cartonQty: 1, rollsPerCarton: 1053, totalRoll: 1053, rollLength: 200, netWeight: 1053, totalRollPer200m: 1053, isEfs: false, invoiceWeight: 1.0, localWeight: 1.0, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-10", itemName: "Label Fabric Sheet", vendor: "yousaf enterprises", invoiceNumber: "509", gdNumber: null, description: "Sheets", cartonQty: 1, rollsPerCarton: 1232, totalRoll: 1232, rollLength: 200, netWeight: 1232, totalRollPer200m: 1232, isEfs: false, invoiceWeight: 1.0, localWeight: 1.0, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-11", itemName: "Label Fabric Sheet", vendor: "yousaf enterprises", invoiceNumber: "539", gdNumber: null, description: "Sheets", cartonQty: 1, rollsPerCarton: 1280, totalRoll: 1280, rollLength: 200, netWeight: 1280, totalRollPer200m: 1280, isEfs: false, invoiceWeight: 1.0, localWeight: 1.0, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-12", itemName: "Label Fabric Sheet", vendor: "yousaf enterprises", invoiceNumber: "538", gdNumber: null, description: "Sheets", cartonQty: 1, rollsPerCarton: 823, totalRoll: 823, rollLength: 200, netWeight: 823, totalRollPer200m: 823, isEfs: false, invoiceWeight: 1.0, localWeight: 1.0, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-13", itemName: "Label Fabric Sheet", vendor: "yousaf enterprises", invoiceNumber: "541", gdNumber: null, description: "Sheets", cartonQty: 1, rollsPerCarton: 1005, totalRoll: 1005, rollLength: 200, netWeight: 1005, totalRollPer200m: 1005, isEfs: false, invoiceWeight: 1.0, localWeight: 1.0, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-14", itemName: "Label Fabric Sheet", vendor: "yousaf enterprises", invoiceNumber: "542", gdNumber: null, description: "Sheets", cartonQty: 1, rollsPerCarton: 1070, totalRoll: 1070, rollLength: 200, netWeight: 1070, totalRollPer200m: 1070, isEfs: false, invoiceWeight: 1.0, localWeight: 1.0, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-15", itemName: "Label Fabric Sheet", vendor: "yousaf enterprises", invoiceNumber: "543", gdNumber: null, description: "Sheets", cartonQty: 1, rollsPerCarton: 895, totalRoll: 895, rollLength: 200, netWeight: 895, totalRollPer200m: 895, isEfs: false, invoiceWeight: 1.0, localWeight: 1.0, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-16", itemName: "Label Fabric Sheet", vendor: "yousaf enterprises", invoiceNumber: "544", gdNumber: null, description: "Sheets", cartonQty: 1, rollsPerCarton: 973, totalRoll: 973, rollLength: 200, netWeight: 973, totalRollPer200m: 973, isEfs: false, invoiceWeight: 1.0, localWeight: 1.0, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-17", itemName: "Label Fabric Sheet", vendor: "yousaf enterprises", invoiceNumber: "545", gdNumber: null, description: "Sheets", cartonQty: 1, rollsPerCarton: 1103, totalRoll: 1103, rollLength: 200, netWeight: 1103, totalRollPer200m: 1103, isEfs: false, invoiceWeight: 1.0, localWeight: 1.0, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-11-18", itemName: "Double Side Simple Satin Black", vendor: "yousaf enterprises", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-008", description: "Satin", cartonQty: 19, rollsPerCarton: 12, totalRoll: 228, rollLength: 400, netWeight: 452.58, totalRollPer200m: 456, isEfs: false, invoiceWeight: 0.9925, localWeight: 0.8431, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-19", itemName: "Paper Label", vendor: "yousaf enterprises", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-009", description: "Taffeta", cartonQty: 2, rollsPerCarton: 25, totalRoll: 50, rollLength: 200, netWeight: 28.25, totalRollPer200m: 50, isEfs: false, invoiceWeight: 0.565, localWeight: 0.5166, materialCode: "40mm NT65 PL" },
  { reportDate: "2024-11-20", itemName: "Double Side Woven Edge", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-010", description: "Satin", cartonQty: 10, rollsPerCarton: 18, totalRoll: 180, rollLength: 200, netWeight: 253.04, totalRollPer200m: 180, isEfs: false, invoiceWeight: 1.4058, localWeight: 1.4058, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-11-21", itemName: "Double Side Woven Edge", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-011", description: "Satin", cartonQty: 10, rollsPerCarton: 18, totalRoll: 180, rollLength: 400, netWeight: 210.6, totalRollPer200m: 360, isEfs: false, invoiceWeight: 1.17, localWeight: 1.4258, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-11-22", itemName: "Double Side Simple Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-012", description: "Satin", cartonQty: 10, rollsPerCarton: 12, totalRoll: 120, rollLength: 400, netWeight: 216.6, totalRollPer200m: 240, isEfs: false, invoiceWeight: 0.9025, localWeight: 0.8423, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-23", itemName: "Double Side Simple Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-013", description: "Satin", cartonQty: 10, rollsPerCarton: 12, totalRoll: 120, rollLength: 200, netWeight: 172.2, totalRollPer200m: 120, isEfs: false, invoiceWeight: 1.435, localWeight: 0.7964, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-24", itemName: "Tearaway Fabric", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-014", description: "Tearaway", cartonQty: 5, rollsPerCarton: 16, totalRoll: 80, rollLength: 400, netWeight: 100, totalRollPer200m: 160, isEfs: false, invoiceWeight: 0.625, localWeight: 0.6191, materialCode: "40mm NT65 PL" },
  { reportDate: "2024-11-25", itemName: "Tearaway Fabric", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-015", description: "Tearaway", cartonQty: 10, rollsPerCarton: 1, totalRoll: 24, rollLength: 200, netWeight: 11.04, totalRollPer200m: 24, isEfs: false, invoiceWeight: 0.46, localWeight: 0.4061, materialCode: "40mm NT65 PL" },
  { reportDate: "2024-11-26", itemName: "Micro Fiber", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-016", description: "Micro Fiber", cartonQty: 5, rollsPerCarton: 16, totalRoll: 80, rollLength: 200, netWeight: 50, totalRollPer200m: 80, isEfs: false, invoiceWeight: 0.625, localWeight: 0.53665, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-27", itemName: "Micro Fiber", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-017", description: "Micro Fiber", cartonQty: 5, rollsPerCarton: 24, totalRoll: 120, rollLength: 400, netWeight: 158.4, totalRollPer200m: 240, isEfs: false, invoiceWeight: 0.66, localWeight: 0.3424, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-28", itemName: "Micro Fiber", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-018", description: "Micro Fiber", cartonQty: 5, rollsPerCarton: 16, totalRoll: 80, rollLength: 400, netWeight: 92, totalRollPer200m: 160, isEfs: false, invoiceWeight: 0.575, localWeight: 0.5615, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-29", itemName: "Recyle Single Side Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-019", description: "Recyle Satin", cartonQty: 5, rollsPerCarton: 20, totalRoll: 100, rollLength: 400, netWeight: 124.5, totalRollPer200m: 200, isEfs: false, invoiceWeight: 0.6225, localWeight: 0.6355, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-30", itemName: "Double Side Woven Edge", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-020", description: "Satin", cartonQty: 1, rollsPerCarton: 24, totalRoll: 24, rollLength: 200, netWeight: 26.04, totalRollPer200m: 24, isEfs: false, invoiceWeight: 1.085, localWeight: 1.0698, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-12-01", itemName: "Paper Label", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-021", description: "Taffeta", cartonQty: 1, rollsPerCarton: 16, totalRoll: 16, rollLength: 400, netWeight: 22.2, totalRollPer200m: 48, isEfs: false, invoiceWeight: 0.4625, localWeight: 0.486, materialCode: "32mm NT65 PL" },
  { reportDate: "2024-12-02", itemName: "Paper Label", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-022", description: "Taffeta", cartonQty: 1, rollsPerCarton: 24, totalRoll: 24, rollLength: 400, netWeight: 35.2, totalRollPer200m: 48, isEfs: false, invoiceWeight: 0.7333, localWeight: 0.7201, materialCode: "50mm NT65 PL" },
  { reportDate: "2024-12-03", itemName: "Paper Label", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-023", description: "Taffeta", cartonQty: 1, rollsPerCarton: 24, totalRoll: 24, rollLength: 400, netWeight: 42.48, totalRollPer200m: 48, isEfs: false, invoiceWeight: 0.885, localWeight: 0.86095, materialCode: "55mm NT65 PL" },
  { reportDate: "2024-12-04", itemName: "Single Side Woven Edge", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-024", description: "Satin", cartonQty: 1, rollsPerCarton: 16, totalRoll: 16, rollLength: 400, netWeight: 21.36, totalRollPer200m: 32, isEfs: false, invoiceWeight: 0.6675, localWeight: 1.3157, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-12-05", itemName: "Single Side Woven Edge", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-025", description: "Satin", cartonQty: 1, rollsPerCarton: 16, totalRoll: 16, rollLength: 400, netWeight: 25.12, totalRollPer200m: 32, isEfs: false, invoiceWeight: 0.785, localWeight: 0.7964, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-12-06", itemName: "Paper Label", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-026", description: "Taffeta", cartonQty: 1, rollsPerCarton: 24, totalRoll: 24, rollLength: 400, netWeight: 13.44, totalRollPer200m: 48, isEfs: false, invoiceWeight: 0.28, localWeight: 0.2953, materialCode: "20mm NT65 PL" },
  { reportDate: "2024-12-07", itemName: "Dull Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-027", description: "Satin", cartonQty: 1, rollsPerCarton: 20, totalRoll: 20, rollLength: 400, netWeight: 28.5, totalRollPer200m: 40, isEfs: false, invoiceWeight: 0.7125, localWeight: 0.71175, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-12-08", itemName: "Simple Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-028", description: "Satin", cartonQty: 1, rollsPerCarton: 20, totalRoll: 20, rollLength: 400, netWeight: 42.5, totalRollPer200m: 40, isEfs: false, invoiceWeight: 1.0625, localWeight: 1.0755, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-12-09", itemName: "Double Side Simple Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZM2004031501", gdNumber: "GD-ZM-2024-029", description: "Satin", cartonQty: 1, rollsPerCarton: 20, totalRoll: 20, rollLength: 400, netWeight: 29.6, totalRollPer200m: 40, isEfs: false, invoiceWeight: 0.74, localWeight: 0.725, materialCode: "30mm PST510 SS" },

  // EFS & 20% Recycle (ZVG002449)
  { reportDate: "2024-11-25", itemName: "Recyle Single Side Satin 20% Recycle", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002449", gdNumber: "KAPW-FS-78771-25-11-2024", description: "Recyle Satin", cartonQty: 400, rollsPerCarton: 20, totalRoll: 8000, rollLength: 400, netWeight: 5200.8, totalRollPer200m: 16000, isEfs: true, invoiceWeight: 0.325, localWeight: 0.6355, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-11-25", itemName: "Single Side Woven Edge 20% Recycle", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002449", gdNumber: "KAPW-FS-78771-25-11-2024", description: "Satin", cartonQty: 42, rollsPerCarton: 12, totalRoll: 504, rollLength: 200, netWeight: 428.4, totalRollPer200m: 504, isEfs: true, invoiceWeight: 0.85, localWeight: 1.7031, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-11-25", itemName: "Double Side Woven Edge 20% Recycle", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002449", gdNumber: "KAPW-FS-78771-25-11-2024", description: "Satin", cartonQty: 56, rollsPerCarton: 18, totalRoll: 1008, rollLength: 200, netWeight: 1406.36, totalRollPer200m: 1008, isEfs: true, invoiceWeight: 1.3952, localWeight: 1.4058, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-11-25", itemName: "Double Side Woven Edge 20% Recycle", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002449", gdNumber: "KAPW-FS-78771-25-11-2024", description: "Satin", cartonQty: 56, rollsPerCarton: 18, totalRoll: 1008, rollLength: 200, netWeight: 898.98, totalRollPer200m: 1008, isEfs: true, invoiceWeight: 1.761, localWeight: 1.7667, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-11-25", itemName: "Tearaway Fabric 20% Recycle", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002449", gdNumber: "KAPW-FS-78771-25-11-2024", description: "Tearaway", cartonQty: 16, rollsPerCarton: 42, totalRoll: 672, rollLength: 200, netWeight: 139.78, totalRollPer200m: 672, isEfs: true, invoiceWeight: 0.208, localWeight: 0.2548, materialCode: "40mm NT65 PL" },
  { reportDate: "2024-11-25", itemName: "Tearaway Fabric 20% Recycle", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002449", gdNumber: "KAPW-FS-78771-25-11-2024", description: "Tearaway", cartonQty: 14, rollsPerCarton: 30, totalRoll: 420, rollLength: 200, netWeight: 268.8, totalRollPer200m: 420, isEfs: true, invoiceWeight: 0.32, localWeight: 0.4061, materialCode: "40mm NT65 PL" },
  { reportDate: "2024-11-25", itemName: "Tearaway Fabric 20% Recycle", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002449", gdNumber: "KAPW-FS-78771-25-11-2024", description: "Tearaway", cartonQty: 83, rollsPerCarton: 18, totalRoll: 1008, rollLength: 400, netWeight: 1128.96, totalRollPer200m: 2016, isEfs: true, invoiceWeight: 0.56, localWeight: 0.6151, materialCode: "40mm NT65 PL" },

  // Domestic Vendors / Imports (AN Traders, Ahmed Enterprises, Star Source, ZM Import)
  { reportDate: "2024-12-10", itemName: "Single Side Woven Edge Black", vendor: "Star source", invoiceNumber: "15", gdNumber: "GD-STAR-015", description: "Satin", cartonQty: 1, rollsPerCarton: 14, totalRoll: 14, rollLength: 200, netWeight: 14, totalRollPer200m: 14, isEfs: false, invoiceWeight: 1.0, localWeight: 1.5282, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-12-28", itemName: "Dull Satin 20% Recycle", vendor: "ZM import", invoiceNumber: "ZVG002472", gdNumber: "LPAF-FS-33461-28-12-2024", description: "Satin", cartonQty: 1, rollsPerCarton: 14, totalRoll: 14, rollLength: 400, netWeight: 196.7, totalRollPer200m: 280, isEfs: false, invoiceWeight: 0.7025, localWeight: 0.71175, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-12-12", itemName: "Double Side Woven Edge", vendor: "AN Traders", invoiceNumber: "n005755", gdNumber: null, description: "Satin", cartonQty: 4, rollsPerCarton: 26, totalRoll: 104, rollLength: 200, netWeight: 113.36, totalRollPer200m: 104, isEfs: false, invoiceWeight: 1.09, localWeight: 1.0698, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-12-13", itemName: "Double Side Woven Edge", vendor: "AN Traders", invoiceNumber: "n005755", gdNumber: null, description: "Satin", cartonQty: 8, rollsPerCarton: 26, totalRoll: 208, rollLength: 200, netWeight: 232.96, totalRollPer200m: 208, isEfs: false, invoiceWeight: 1.12, localWeight: 1.4058, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-12-14", itemName: "Simple Satin", vendor: "Ahmed enterprises", invoiceNumber: "INV-AHMED-01", gdNumber: null, description: "Satin", cartonQty: 2, rollsPerCarton: 60, totalRoll: 120, rollLength: 400, netWeight: 117, totalRollPer200m: 240, isEfs: false, invoiceWeight: 0.4875, localWeight: 0.4985, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-12-15", itemName: "Paper Label", vendor: "AN Traders", invoiceNumber: "06768", gdNumber: null, description: "Taffeta", cartonQty: 3, rollsPerCarton: 32, totalRoll: 128, rollLength: 200, netWeight: 81.92, totalRollPer200m: 128, isEfs: false, invoiceWeight: 0.64, localWeight: 0.5165, materialCode: "40mm NT65 PL" },
  { reportDate: "2024-12-16", itemName: "Paper Label", vendor: "AN Traders", invoiceNumber: "06768", gdNumber: null, description: "Taffeta", cartonQty: 12, rollsPerCarton: 48, totalRoll: 576, rollLength: 200, netWeight: 248.83, totalRollPer200m: 576, isEfs: false, invoiceWeight: 0.43, localWeight: 0.3404, materialCode: "25mm NT65 PL" },

  // ZVG002575 Batch
  { reportDate: "2024-12-17", itemName: "Recyle Single Side Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002575", gdNumber: "GD-ZM-2024-2575", description: "Recyle Satin", cartonQty: 200, rollsPerCarton: 20, totalRoll: 4000, rollLength: 600, netWeight: 7200, totalRollPer200m: 12000, isEfs: false, invoiceWeight: 0.60, localWeight: 0.6355, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-12-18", itemName: "Double Side Woven Edge", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002575", gdNumber: "GD-ZM-2024-2575", description: "Satin", cartonQty: 63, rollsPerCarton: 16, totalRoll: 1008, rollLength: 200, netWeight: 1532.16, totalRollPer200m: 1008, isEfs: false, invoiceWeight: 1.52, localWeight: 1.55, materialCode: "35mm PST510 SS" },
  { reportDate: "2024-12-19", itemName: "Paper Label", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002575", gdNumber: "GD-ZM-2024-2575", description: "Taffeta", cartonQty: 14, rollsPerCarton: 34, totalRoll: 476, rollLength: 400, netWeight: 495.04, totalRollPer200m: 952, isEfs: false, invoiceWeight: 0.52, localWeight: 0.5165, materialCode: "40mm NT65 PL" },
  { reportDate: "2024-12-20", itemName: "Paper Label", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002575", gdNumber: "GD-ZM-2024-2575", description: "Taffeta", cartonQty: 104, rollsPerCarton: 24, totalRoll: 2496, rollLength: 400, netWeight: 1560, totalRollPer200m: 4992, isEfs: false, invoiceWeight: 0.31, localWeight: 0.3404, materialCode: "25mm NT65 PL" },
  { reportDate: "2024-12-21", itemName: "Recyle Single Side Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002575", gdNumber: "GD-ZM-2024-2575", description: "Recyle Satin", cartonQty: 285, rollsPerCarton: 20, totalRoll: 5700, rollLength: 600, netWeight: 6840, totalRollPer200m: 17100, isEfs: false, invoiceWeight: 0.40, localWeight: 0.6355, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-12-22", itemName: "Double Side Simple Satin", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002575", gdNumber: "GD-ZM-2024-2575", description: "Satin", cartonQty: 33, rollsPerCarton: 22, totalRoll: 726, rollLength: 200, netWeight: 784.08, totalRollPer200m: 726, isEfs: false, invoiceWeight: 1.08, localWeight: 1.10, materialCode: "30mm PST510 SS" },
  { reportDate: "2024-12-23", itemName: "Tearaway Fabric 20% Recycle", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002575", gdNumber: "GD-ZM-2024-2575", description: "Tearaway", cartonQty: 43, rollsPerCarton: 12, totalRoll: 516, rollLength: 400, netWeight: 614.04, totalRollPer200m: 1032, isEfs: false, invoiceWeight: 0.59, localWeight: 0.6151, materialCode: "40mm NT65 PL" },
  { reportDate: "2024-12-24", itemName: "Tearaway Fabric 20% Recycle", vendor: "HUZHOU ZHENMIN SILK RIBBON CO., LTD.", invoiceNumber: "ZVG002575", gdNumber: "GD-ZM-2024-2575", description: "Tearaway", cartonQty: 83, rollsPerCarton: 12, totalRoll: 996, rollLength: 400, netWeight: 1155.36, totalRollPer200m: 1992, isEfs: false, invoiceWeight: 0.58, localWeight: 0.6151, materialCode: "40mm NT65 PL" },
];
