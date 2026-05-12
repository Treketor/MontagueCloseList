create extension if not exists pgcrypto;

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  section text not null,
  task_type text not null check (task_type in ('daily_closing', 'weekly_cleaning')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.closing_checklists (
  id uuid primary key default gen_random_uuid(),
  bar_date date not null unique,
  worker_id uuid references public.workers(id) on delete set null,
  notes text not null default '',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.closing_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.closing_checklists(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete restrict,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_id, task_id)
);

create table if not exists public.weekly_cleaning_runs (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_cleaning_items (
  id uuid primary key default gen_random_uuid(),
  weekly_run_id uuid not null references public.weekly_cleaning_runs(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete restrict,
  is_completed boolean not null default false,
  worker_id uuid references public.workers(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (weekly_run_id, task_id)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists workers_set_updated_at on public.workers;
create trigger workers_set_updated_at
before update on public.workers
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists closing_checklists_set_updated_at on public.closing_checklists;
create trigger closing_checklists_set_updated_at
before update on public.closing_checklists
for each row execute function public.set_updated_at();

drop trigger if exists closing_checklist_items_set_updated_at on public.closing_checklist_items;
create trigger closing_checklist_items_set_updated_at
before update on public.closing_checklist_items
for each row execute function public.set_updated_at();

drop trigger if exists weekly_cleaning_runs_set_updated_at on public.weekly_cleaning_runs;
create trigger weekly_cleaning_runs_set_updated_at
before update on public.weekly_cleaning_runs
for each row execute function public.set_updated_at();

drop trigger if exists weekly_cleaning_items_set_updated_at on public.weekly_cleaning_items;
create trigger weekly_cleaning_items_set_updated_at
before update on public.weekly_cleaning_items
for each row execute function public.set_updated_at();

alter table public.workers enable row level security;
alter table public.tasks enable row level security;
alter table public.closing_checklists enable row level security;
alter table public.closing_checklist_items enable row level security;
alter table public.weekly_cleaning_runs enable row level security;
alter table public.weekly_cleaning_items enable row level security;

drop policy if exists "prototype read workers" on public.workers;
create policy "prototype read workers" on public.workers
for select using (true);

drop policy if exists "prototype write workers" on public.workers;
create policy "prototype write workers" on public.workers
for all using (true) with check (true);

drop policy if exists "prototype read tasks" on public.tasks;
create policy "prototype read tasks" on public.tasks
for select using (true);

drop policy if exists "prototype write tasks" on public.tasks;
create policy "prototype write tasks" on public.tasks
for all using (true) with check (true);

drop policy if exists "prototype read closing checklists" on public.closing_checklists;
create policy "prototype read closing checklists" on public.closing_checklists
for select using (true);

drop policy if exists "prototype write closing checklists" on public.closing_checklists;
create policy "prototype write closing checklists" on public.closing_checklists
for all using (true) with check (true);

drop policy if exists "prototype read closing items" on public.closing_checklist_items;
create policy "prototype read closing items" on public.closing_checklist_items
for select using (true);

drop policy if exists "prototype write closing items" on public.closing_checklist_items;
create policy "prototype write closing items" on public.closing_checklist_items
for all using (true) with check (true);

drop policy if exists "prototype read weekly runs" on public.weekly_cleaning_runs;
create policy "prototype read weekly runs" on public.weekly_cleaning_runs
for select using (true);

drop policy if exists "prototype write weekly runs" on public.weekly_cleaning_runs;
create policy "prototype write weekly runs" on public.weekly_cleaning_runs
for all using (true) with check (true);

drop policy if exists "prototype read weekly items" on public.weekly_cleaning_items;
create policy "prototype read weekly items" on public.weekly_cleaning_items
for select using (true);

drop policy if exists "prototype write weekly items" on public.weekly_cleaning_items;
create policy "prototype write weekly items" on public.weekly_cleaning_items
for all using (true) with check (true);

create or replace function public.delete_worker(worker_id_to_delete uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  update public.closing_checklists
  set worker_id = null
  where worker_id = worker_id_to_delete;

  update public.weekly_cleaning_items
  set worker_id = null
  where worker_id = worker_id_to_delete;

  delete from public.workers
  where id = worker_id_to_delete;

  get diagnostics deleted_count = row_count;

  return deleted_count > 0
    or not exists (
      select 1 from public.workers where id = worker_id_to_delete
    );
end;
$$;

create or replace function public.delete_task(task_id_to_delete uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.closing_checklist_items
  where task_id = task_id_to_delete;

  delete from public.weekly_cleaning_items
  where task_id = task_id_to_delete;

  delete from public.tasks
  where id = task_id_to_delete;

  get diagnostics deleted_count = row_count;

  return deleted_count > 0
    or not exists (
      select 1 from public.tasks where id = task_id_to_delete
    );
end;
$$;

revoke all on function public.delete_worker(uuid) from public;
revoke all on function public.delete_task(uuid) from public;
grant execute on function public.delete_worker(uuid) to anon, authenticated;
grant execute on function public.delete_task(uuid) to anon, authenticated;

drop function if exists public.closelist_upsert_task(uuid, text, text, text, text, integer, boolean);
create or replace function public.closelist_upsert_task(
  task_id uuid,
  task_title text,
  task_description text,
  task_section text,
  task_type_value text,
  task_sort_order integer,
  task_is_active boolean
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_task public.tasks;
begin
  if task_id is null then
    insert into public.tasks (
      title,
      description,
      section,
      task_type,
      sort_order,
      is_active
    )
    values (
      task_title,
      task_description,
      task_section,
      task_type_value,
      task_sort_order,
      task_is_active
    )
    returning * into saved_task;
  else
    insert into public.tasks (
      id,
      title,
      description,
      section,
      task_type,
      sort_order,
      is_active
    )
    values (
      task_id,
      task_title,
      task_description,
      task_section,
      task_type_value,
      task_sort_order,
      task_is_active
    )
    on conflict (id) do update
    set
      title = excluded.title,
      description = excluded.description,
      section = excluded.section,
      task_type = excluded.task_type,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active
    returning * into saved_task;
  end if;

  return saved_task;
end;
$$;

revoke all on function public.closelist_upsert_task(uuid, text, text, text, text, integer, boolean) from public;
grant execute on function public.closelist_upsert_task(uuid, text, text, text, text, integer, boolean) to anon, authenticated;
