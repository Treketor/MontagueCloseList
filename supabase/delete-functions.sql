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
