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

drop function if exists public.closelist_upsert_closing_checklist(date, uuid, text, timestamptz, jsonb);
create or replace function public.closelist_upsert_closing_checklist(
  checklist_bar_date date,
  checklist_worker_id uuid,
  checklist_notes text,
  checklist_submitted_at timestamptz,
  checklist_items jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_checklist_id uuid;
  item jsonb;
  item_task_id uuid;
begin
  insert into public.closing_checklists (
    bar_date,
    worker_id,
    notes,
    submitted_at
  )
  values (
    checklist_bar_date,
    case
      when checklist_worker_id is not null
        and exists (select 1 from public.workers where id = checklist_worker_id)
      then checklist_worker_id
      else null
    end,
    coalesce(checklist_notes, ''),
    checklist_submitted_at
  )
  on conflict (bar_date) do update
  set
    worker_id = excluded.worker_id,
    notes = excluded.notes,
    submitted_at = excluded.submitted_at
  returning id into saved_checklist_id;

  for item in select * from jsonb_array_elements(coalesce(checklist_items, '[]'::jsonb))
  loop
    item_task_id := nullif(item->>'taskId', '')::uuid;

    if exists (select 1 from public.tasks where id = item_task_id) then
      insert into public.closing_checklist_items (
        checklist_id,
        task_id,
        is_completed,
        completed_at
      )
      values (
        saved_checklist_id,
        item_task_id,
        coalesce((item->>'isCompleted')::boolean, false),
        nullif(item->>'completedAt', '')::timestamptz
      )
      on conflict (checklist_id, task_id) do update
      set
        is_completed = excluded.is_completed,
        completed_at = excluded.completed_at;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function public.closelist_upsert_closing_checklist(date, uuid, text, timestamptz, jsonb) from public;
grant execute on function public.closelist_upsert_closing_checklist(date, uuid, text, timestamptz, jsonb) to anon, authenticated;
