# CloseList

CloseList is an iPad-first bar closing and cleaning checklist app built with React, Vite, TypeScript, Tailwind CSS, Supabase, and Vercel.

## Install

```bash
npm install
```

## Local Development

```bash
npm run dev
```

Plain Vite dev does not serve Vercel API routes. To test manager-code verification locally, use Vercel dev:

```bash
npx vercel dev
```

Or test manager access after deployment.

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
MANAGER_CODE=
```

`MANAGER_CODE` is used only by the Vercel serverless API route. It is not exposed to the Vite frontend.

## Supabase

Create the database schema by running:

```text
supabase/schema.sql
```

in the Supabase SQL editor.

The app currently uses Supabase for workers, task editing, daily closing checklists, weekly history, and weekly cleaning. localStorage remains a fallback/cache.

## Vercel Deployment

1. Import the GitHub repo into Vercel.
2. Add these Project Settings environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `MANAGER_CODE`
3. Deploy.
4. Open the deployed site on iPad Safari.
5. Tap Share, then Add to Home Screen.

## Deploy to Vercel

1. Push the project to GitHub.
2. Import the repo into Vercel.
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `MANAGER_CODE`
4. Deploy.
5. Open the production URL.
6. Unlock Manage Tasks with the manager code.
7. Confirm Diagnostics says cloud sync ready.
8. Add a test worker.
9. Confirm the test worker appears in Supabase.
10. Complete one test daily task.
11. Confirm `closing_checklists` and `closing_checklist_items` update in Supabase.
12. Complete one test weekly cleaning task.
13. Confirm `weekly_cleaning_runs` and `weekly_cleaning_items` update in Supabase.
14. Test on iPad Safari.
15. Add to Home Screen.

## Common Sync Issues

### App says Local only

- Confirm `VITE_SUPABASE_URL` exists in Vercel.
- Confirm `VITE_SUPABASE_ANON_KEY` exists in Vercel.
- Confirm variables were added to the correct Vercel environment.
- Redeploy after adding or changing env vars.
- Do not use an `sb_secret_` key in `VITE_SUPABASE_ANON_KEY`; use the public anon/publishable key.

### Manager code does not work

- Confirm `MANAGER_CODE` exists in Vercel.
- Test using the deployed Vercel URL, not plain `npm run dev`.
- Use `npx vercel dev` for local API route testing.

### Tasks or workers are not updating on iPad

- Open Manage Tasks.
- Unlock manager controls.
- Tap Refresh cloud data.
- Confirm the iPad is online.
- Confirm the Supabase project is not paused.
- If needed, use Clear local cache on this device from Diagnostics.

### Checklist saves locally but not cloud

- Confirm the header says Cloud sync ready.
- Confirm Supabase RLS prototype policies exist.
- Check the browser console for Supabase errors.
- Confirm task IDs in checklist items exist in the `tasks` table.

## Pre-use Checklist

- Run `npm run build`.
- Confirm Supabase environment variables are set in Vercel.
- Confirm `MANAGER_CODE` works through the deployed Vercel site.
- Add the app to the iPad Home Screen.
- Submit a test close.
- Complete a test weekly cleaning task.
- Delete test rows from Supabase if needed before real use.
- Run through [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md).

## Operational Features

### Skipped Tasks And Close Notes

Daily close tasks can be marked completed or skipped. Skipped tasks require a reason, and submitting a close with any skipped task also requires close notes.

### Important Tasks

Managers can mark tasks as important. Important tasks are shown with a subtle label and appear first inside their section, which makes skipped or pending critical work easier to review.

### Manager Review Mode

The Manage page includes Review closes. It shows recent closes from the last four weeks and highlights incomplete, skipped, noted, and submitted closes.

### Task Ordering

Daily close and weekly cleaning task managers include Move up and Move down controls. Ordering is saved through the same cloud/local task save flow.

### Sync Details

Tap the sync status in the header to see cloud readiness, last successful sync, last sync issue, local cache status, and a Refresh cloud data action.

## Safety Notes

This app uses a lightweight manager code, not full user authentication.

The Supabase RLS policies in `supabase/schema.sql` are permissive for prototype/workplace use. For wider or public use, replace them with authenticated access and role-based manager controls.
