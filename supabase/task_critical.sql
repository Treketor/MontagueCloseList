alter table public.tasks
add column if not exists is_critical boolean not null default false;

notify pgrst, 'reload schema';
