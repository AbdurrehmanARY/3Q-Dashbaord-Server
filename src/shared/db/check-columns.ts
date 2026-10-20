import postgres from "postgres";
import "dotenv/config";

const sql = postgres(process.env.DIRECT_URL!);
const rows = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'production_batches'
  ORDER BY ordinal_position
`;
rows.forEach((r) => console.log(`${r.column_name} :: ${r.data_type}`));
await sql.end();
