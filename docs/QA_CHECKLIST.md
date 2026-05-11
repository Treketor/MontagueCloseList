# CloseList QA Checklist

## Local Setup

- [ ] Run `npm install`.
- [ ] Create `.env.local` from `.env.example`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Run `npx vercel dev` when testing manager access locally.

## Supabase Setup

- [ ] Run `supabase/schema.sql` in the Supabase SQL editor.
- [ ] Confirm `workers`, `tasks`, `closing_checklists`, `closing_checklist_items`, `weekly_cleaning_runs`, and `weekly_cleaning_items` exist.
- [ ] Confirm Vite uses the public anon key, not a secret key.
- [ ] Confirm the app header says `Cloud sync ready`.

## Manager Access

- [ ] Confirm wrong manager code shows an error.
- [ ] Confirm correct manager code unlocks task controls.
- [ ] Refresh and confirm manager access is locked again.
- [ ] Add a task and confirm it appears in Supabase.
- [ ] Disable a task and confirm the confirmation prompt appears.
- [ ] Restore a task and confirm it becomes active again.

## Worker Flow

- [ ] Add a worker.
- [ ] Confirm duplicate worker names are blocked case-insensitively.
- [ ] Refresh and confirm the worker remains.
- [ ] Confirm another device/browser can load the worker from Supabase.

## Daily Close Flow

- [ ] Select a worker.
- [ ] Tick several daily tasks.
- [ ] Refresh and confirm progress remains.
- [ ] Add close notes and confirm they persist.
- [ ] Try submitting before all tasks are complete and confirm it is blocked.
- [ ] Complete all tasks and submit.
- [ ] Confirm `submitted_at` is set in Supabase.
- [ ] Uncheck a task after submit and confirm the submitted state clears.

## This Week History

- [ ] Open This Week and confirm the current bar date appears.
- [ ] Tap Refresh and confirm the list reloads.
- [ ] Open checklist detail and confirm completed/missed tasks are correct.
- [ ] Confirm long checklist detail content scrolls inside the modal.
- [ ] Confirm old inactive tasks still resolve where possible.

## Weekly Cleaning Flow

- [ ] Select a worker.
- [ ] Tick weekly cleaning tasks.
- [ ] Confirm completed rows show the worker and time.
- [ ] Refresh and confirm progress remains.
- [ ] Uncheck a task and confirm worker/time are cleared.
- [ ] Add a weekly cleaning task in Manage Tasks and confirm it appears incomplete.
- [ ] Disable a weekly cleaning task and confirm it disappears after refresh/reconciliation.

## iPad Home Screen Flow

- [ ] Open the deployed site in iPad Safari.
- [ ] Tap Share, then Add to Home Screen.
- [ ] Open from the Home Screen.
- [ ] Confirm the install hint is hidden in standalone mode.
- [ ] Confirm header and bottom navigation respect safe areas.
- [ ] Confirm Today, Manage Tasks, This Week, and Weekly Cleaning scroll naturally.

## Offline/Local Fallback Behaviour

- [ ] Disable Supabase env vars or block network.
- [ ] Confirm the header shows local-only/failure status where appropriate.
- [ ] Tick daily tasks and confirm local progress persists after refresh.
- [ ] Tick weekly cleaning tasks and confirm local progress persists after refresh.
- [ ] Re-enable Supabase and confirm the app remains usable.

## Deployment Verification

- [ ] Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `MANAGER_CODE` in Vercel.
- [ ] Deploy from Vercel.
- [ ] Confirm manager code works on the deployed URL.
- [ ] Submit a test daily close.
- [ ] Complete a test weekly cleaning task.
- [ ] Remove test rows from Supabase if needed before real service.
