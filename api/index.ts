// Vercel serverless entry. Vercel exposes files under api/ as serverless functions and
// treats a default-exported Express app as the request handler. vercel.json rewrites every
// path to this function, so Express does all the routing internally.
//
// Deliberately imports `./app` (the pure Express app) rather than `src/index.ts`, so it
// does NOT call server.listen() or run the on-startup ad-hoc migrations — neither belongs
// in a serverless function. Schema changes are applied from a dev machine via `db:migrate`.
import "dotenv/config";
import app from "../src/app";

export default app;
