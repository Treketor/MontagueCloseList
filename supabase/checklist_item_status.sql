alter table public.closing_checklist_items
add column if not exists status text not null default 'pending'
check (status in ('pending', 'completed', 'skipped'));

alter table public.closing_checklist_items
add column if not exists skip_reason text;

notify pgrst, 'reload schema';
