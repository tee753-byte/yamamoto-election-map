create or replace function public.archive_posting_area(
  p_area_id uuid,
  p_expected_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_current_version integer;
  v_before jsonb;
  v_after jsonb;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active = true;

  if v_role is distinct from 'admin'::public.app_role then
    raise exception 'not authorized';
  end if;

  select a.version, to_jsonb(a)
    into v_current_version, v_before
  from public.posting_areas a
  where a.id = p_area_id and a.archived_at is null
  for update;

  if not found then raise exception 'area not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;

  update public.posting_areas
  set archived_at = now(),
      version = version + 1
  where id = p_area_id
  returning to_jsonb(posting_areas) into v_after;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, before_data, after_data
  ) values (
    auth.uid(), 'posting_area', p_area_id, 'archived', v_before, v_after
  );
end;
$$;

revoke all on function public.archive_posting_area(uuid, integer)
  from public, anon;
grant execute on function public.archive_posting_area(uuid, integer)
  to authenticated;
