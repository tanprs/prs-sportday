# กีฬาสี 2569 — Next.js app

Frontend for the school Sports Day management system. Talks to the `PRS-Sportday` Supabase project (database + RLS already in place — see `../database/ASSUMPTIONS.md`).

## Stack

Next.js 16 (App Router, TypeScript, Tailwind v4), Supabase Auth + Postgres via `@supabase/ssr`.

## Local setup

```bash
npm install
cp .env.example .env.local   # already filled in with the real project URL + anon key in this handoff
npm run dev
```

Open http://localhost:3000.

## What's here (Phase 2 app shell)

- Email/password auth: `/login`, `/signup` (new accounts default to role `sport_captain`, no house — an admin assigns the real role + house afterwards, same as the DB-level design from Phase 1).
- `middleware.ts` refreshes the Supabase session on every request and redirects signed-out visitors away from anything except `/`, `/login`, `/signup`, `/scoreboard`.
- Role-aware layout/nav at `src/app/(app)/layout.tsx` — shows the signed-in user's name, role, and house; "ผู้ดูแลระบบ" only shows for `admin`/`teacher`.
- Real, working read-only pages backed by the live database: `/teams` (team list), `/matches` (match list), `/admin` (counts), `/scoreboard` (public house standings — no login required).
- `src/lib/database.types.ts` — generated from the live schema. Regenerate after any migration with the Supabase MCP `generate_typescript_types` tool, or `npx supabase gen types typescript --project-id gnqsbswdcglpvoxmjdop`.

## What's intentionally NOT here yet

Team registration forms, roster editing, match score entry, approval workflows, user/role management UI, the QR attendance sync. These are real features that need their own design pass — this phase only builds the shell (auth, navigation, RLS-respecting data reads) so there's a working app to build on. See the project's task list for what's next.

## Pushing to GitHub

This folder was built locally and is not yet pushed anywhere. From the **repo root** (one level up — `database/` and `app/` are siblings):

```bash
cd ..                     # repo root
git init
git add .
git commit -m "Phase 1 database + Phase 2 app shell"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

Replace `<your-github-repo-url>` with the URL of a repo you create on GitHub (e.g. `https://github.com/<you>/prs-sportday.git`). `.env.local` is gitignored and will not be pushed — when deploying (e.g. Vercel), set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables there using the same values from `.env.local`.
