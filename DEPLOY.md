# Server — Vercel deployment

Express API deployed as a Vercel serverless function.

## How it's wired

- `api/index.ts` exports the Express `app` — Vercel treats it as the request handler.
- `vercel.json` rewrites every path to that function, so Express does all routing internally
  (`/health`, `/api/*`). Region is pinned to `bom1` (Mumbai) to sit next to the Supabase
  `ap-south-1` database.
- `src/index.ts` (which calls `server.listen()` and runs the on-startup ad-hoc migrations) is
  **local dev only** and is never used on Vercel.
- The DB connection uses the Supabase **transaction pooler** with postgres-js `prepare: false`
  (`src/db/drizzle.ts`) — the correct setup for short-lived serverless invocations.

## Deploy

1. Push this folder to its own GitHub repo (see the root `DEPLOYMENT.md` for split commands).
2. In Vercel → **Add New Project** → import the repo.
   - Framework preset: **Other**
   - Root directory: `./`
   - Build/Output: leave empty (Vercel auto-builds `api/` functions)
3. Add **Environment Variables** (Project → Settings → Environment Variables):

   | Name          | Value                                                                 |
   |---------------|-----------------------------------------------------------------------|
   | `DATABASE_URL`| Supabase **transaction pooler** URI (port 6543). Percent-encode `@` as `%40`. |
   | `NODE_ENV`    | `production`                                                           |
   | `CORS_ORIGIN` | your deployed client URL, e.g. `https://your-client.vercel.app`       |
   | `JWT_SECRET`  | a strong random string                                                |

   `DIRECT_URL` (session pooler, port 5432) is only needed to run migrations from a dev
   machine — it is **not** required at runtime, so it doesn't need to be set on Vercel.

4. Deploy, then check `https://your-server.vercel.app/health` → `{ "status": "ok", ... }`.

## Migrations (run from a dev machine, not Vercel)

```bash
npm run db:generate   # after editing src/db/tables/*
npm run db:migrate    # applies to Supabase via DIRECT_URL (session pooler)
```

The transaction pooler doesn't support the session features drizzle-kit needs, which is why
migrations use `DIRECT_URL` (session pooler, 5432) while the app runtime uses the transaction
pooler (6543).
