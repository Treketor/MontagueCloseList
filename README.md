# CloseList - Bar Closing & Cleaning Checklist

CloseList is an iPad-first web app I built for the bar I work at, so staff can run through the nightly closing routine and weekly cleaning tasks on the venue iPad, and managers can review what actually got done. It replaced paper checklists and a lot of "did that get finished?" guesswork.

## What it does
- Nightly close checklist that staff work through on the iPad, grouped by section.
- Weekly cleaning schedule tracked separately, with its own history.
- Skip-with-a-reason: any skipped task needs a reason, and submitting a close with skipped tasks requires close notes, so nothing quietly slips.
- Important tasks: managers can flag critical tasks so they surface first.
- Manager review mode: managers unlock with a code to edit and reorder tasks and review recent closes, with incomplete, skipped or noted closes highlighted.
- Cloud sync with offline fallback: data syncs to Supabase, with a local cache so the app keeps working if the iPad drops offline, plus a clear sync-status indicator.
- Installable: added to the iPad home screen so it behaves like a native app.

## Tech
React, TypeScript, Vite, Tailwind CSS, Supabase (PostgreSQL), and a Vercel serverless function for manager-code verification. Deployed on Vercel.

## Running locally
```bash
npm install
npm run dev        # frontend
npx vercel dev     # also runs the manager-code API route
```
Copy `.env.example` to `.env.local` and add your Supabase URL, anon key, and a manager code.

## Notes
This is a real tool built for a working venue. It uses a lightweight manager code rather than full user accounts, which suited the single-venue, shared-iPad use case. Fuller setup, QA and troubleshooting notes live in `docs/`.
