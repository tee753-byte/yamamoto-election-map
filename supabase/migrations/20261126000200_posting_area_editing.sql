create or replace function public.assign_posting_area(
  p_area_id uuid,
  p_expected_version integer,
  p_assignee_label text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_assignee_id uuid;
  v_label text := nullif(trim(p_assignee_label), '');
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

  if v_label is not null and char_length(v_label) > 80 then
    raise exception 'invalid assignee label';
  end if;

  if v_label is not null then
    select p.id into v_assignee_id
    from public.profiles p
    where p.is_active = true
      and p.role in ('admin'::public.app_role, 'worker'::public.app_role)
      and p.display_name = v_label
    order by p.id
    limit 1;
  end if;

  select a.version, to_jsonb(a)
    into v_current_version, v_before
  from public.posting_areas a
  where a.id = p_area_id and a.archived_at is null
  for update;

  if not found then raise exception 'area not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;

  update public.posting_areas
  set assignee_id = v_assignee_id,
      assignee_label = v_label,
      status = case
        when v_label is null and status = 'assigned'
          then 'not_started'::public.work_status
        else status
      end,
      version = version + 1
  where id = p_area_id
  returning to_jsonb(posting_areas) into v_after;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, before_data, after_data
  ) values (
    auth.uid(), 'posting_area', p_area_id, 'assignee_changed', v_before, v_after
  );
end;
$$;

create or replace function public.update_posting_area(
  p_area_id uuid,
  p_expected_version integer,
  p_name text,
  p_geometry jsonb,
  p_target_count integer,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_name text := trim(p_name);
  v_note text := nullif(trim(p_note), '');
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
  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception 'invalid area name';
  end if;
  if p_target_count is not null and (p_target_count < 0 or p_target_count > 1000000) then
    raise exception 'invalid target count';
  end if;
  if v_note is not null and char_length(v_note) > 300 then
    raise exception 'invalid note';
  end if;
  if not public.valid_posting_polygon(p_geometry) then
    raise exception 'invalid polygon';
  end if;

  select a.version, to_jsonb(a)
    into v_current_version, v_before
  from public.posting_areas a
  where a.id = p_area_id and a.archived_at is null
  for update;

  if not found then raise exception 'area not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;

  update public.posting_areas
  set name = v_name,
      geometry = p_geometry,
      target_count = p_target_count,
      note = v_note,
      version = version + 1
  where id = p_area_id
  returning to_jsonb(posting_areas) into v_after;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, before_data, after_data
  ) values (
    auth.uid(), 'posting_area', p_area_id, 'details_updated', v_before, v_after
  );
end;
$$;

revoke all on function public.update_posting_area(
  uuid, integer, text, jsonb, integer, text
) from public, anon;
grant execute on function public.update_posting_area(
  uuid, integer, text, jsonb, integer, text
) to authenticated;

create or replace function public.import_posting_areas(p_areas jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_item jsonb;
  v_area_id uuid;
  v_assignee_label text;
  v_count integer := 0;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active = true;

  if v_role is distinct from 'admin'::public.app_role then
    raise exception 'not authorized';
  end if;
  if jsonb_typeof(p_areas) <> 'array'
    or jsonb_array_length(p_areas) < 1
    or jsonb_array_length(p_areas) > 200 then
    raise exception 'invalid import payload';
  end if;

  for v_item in select value from jsonb_array_elements(p_areas)
  loop
    v_area_id := public.create_posting_area(
      v_item->>'areaCode',
      v_item->>'name',
      v_item->'geometry',
      case
        when v_item->>'targetCount' is null then null
        else (v_item->>'targetCount')::integer
      end,
      v_item->>'note',
      gen_random_uuid()
    );

    v_assignee_label := nullif(trim(v_item->>'assigneeLabel'), '');
    if v_assignee_label is not null then
      perform public.assign_posting_area(v_area_id, 1, v_assignee_label);
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
