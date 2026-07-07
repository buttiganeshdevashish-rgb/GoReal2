# Deploying GoalReal to Vercel + Supabase

The repo ships in **local demo mode** (SQLite, zero setup) so it runs flawlessly on any laptop — ideal for a live buildathon demo. This guide takes it to the cloud.

## Why the swap is needed

Vercel's serverless filesystem is read-only, so SQLite can't persist there. The data layer is deliberately isolated in `src/lib/` (queries, actions, stats) so the storage backend swaps without touching any page or component.

## Step 1 — Supabase (~5 min)

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → paste and run `supabase/schema.sql` (creates all 10 tables, constraints, and indexes)
3. In **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
4. **Storage** → create a public bucket named `proofs` (for photo uploads)
5. Optional: **Authentication → Providers** → enable Google (paste OAuth client ID/secret from Google Cloud Console)

## Step 2 — Swap the data layer (~10 min)

Install the client:

```bash
npm i @supabase/supabase-js
```

Then replace the SQLite calls in `src/lib/` with Supabase queries. Each function in `queries.ts` / `actions.ts` / `stats.ts` maps 1:1 to a Supabase call, e.g.:

```ts
// before (SQLite)
db.prepare("SELECT * FROM users WHERE email = ?").get(email)

// after (Supabase)
const { data } = await supabase.from("users").select("*").eq("email", email).single()
```

For photo uploads in `actions.ts`, replace the `fs.writeFileSync` block with:

```ts
const { data } = await supabase.storage.from("proofs").upload(filename, buffer, { contentType: image.type });
imageUrl = supabase.storage.from("proofs").getPublicUrl(filename).data.publicUrl;
```

## Step 3 — Vercel (~3 min)

1. Push the repo to GitHub
2. [vercel.com/new](https://vercel.com/new) → import the repo (Next.js auto-detected)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` (any long random string)
   - `OPENAI_API_KEY` (optional — AI falls back to the built-in engine without it)
4. Deploy.

## Seeding production

Run `supabase/seed.sql` note — or simply sign up fresh accounts; the app works from an empty database. For demo-grade seed data in Postgres, adapt `src/lib/seed.ts` (the generator is deterministic and backend-agnostic in its logic).
