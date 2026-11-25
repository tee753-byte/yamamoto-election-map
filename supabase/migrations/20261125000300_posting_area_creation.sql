create or replace function public.valid_posting_polygon(p_geometry jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_ring jsonb;
  v_point jsonb;
  v_ring_length integer;
  v_vertex_count integer := 0;
  v_longitude numeric;
  v_latitude numeric;
begin
  if jsonb_typeof(p_geometry) <> 'object'
    or p_geometry ->> 'type' <> 'Polygon'
    or jsonb_typeof(p_geometry -> 'coordinates') <> 'array'
    or jsonb_array_length(p_geometry -> 'coordinates') < 1
    or jsonb_array_length(p_geometry -> 'coordinates') > 20 then
    return false;
  end if;

  for v_ring in
    select value from jsonb_array_elements(p_geometry -> 'coordinates')
  loop
    if jsonb_typeof(v_ring) <> 'array' then return false; end if;
    v_ring_length := jsonb_array_length(v_ring);
    if v_ring_length < 4 then return false; end if;
    v_vertex_count := v_vertex_count + v_ring_length;
    if v_vertex_count > 5000 then return false; end if;
    if v_ring -> 0 <> v_ring -> (v_ring_length - 1) then return false; end if;

    for v_point in select value from jsonb_array_elements(v_ring)
    loop
      if jsonb_typeof(v_point) <> 'array'
        or jsonb_array_length(v_point) <> 2
        or jsonb_typeof(v_point -> 0) <> 'number'
        or jsonb_typeof(v_point -> 1) <> 'number' then
        return false;
      end if;
      v_longitude := (v_point ->> 0)::numeric;
      v_latitude := (v_point ->> 1)::numeric;
      if v_longitude < -180 or v_longitude > 180
        or v_latitude < -90 or v_latitude > 90 then
        return false;
      end if;
    end loop;
  end loop;

  return true;
exception when others then
  return false;
end;
$$;

create or replace function public.create_posting_area(
  p_area_code text,
  p_name text,
  p_geometry jsonb,
  p_target_count integer,
  p_note text,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_plan_id uuid;
  v_area_id uuid;
  v_after jsonb;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active = true;

  if v_role is distinct from 'admin'::public.app_role then
    raise exception 'not authorized';
  end if;
  if p_request_id is null then raise exception 'request id is required'; end if;
  if char_length(trim(p_area_code)) < 1 or char_length(trim(p_area_code)) > 40 then
    raise exception 'invalid area code';
  end if;
  if char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 120 then
    raise exception 'invalid area name';
  end if;
  if p_target_count is not null and (p_target_count < 0 or p_target_count > 1000000) then
    raise exception 'invalid target count';
  end if;
  if p_note is not null and char_length(trim(p_note)) > 300 then
    raise exception 'invalid note';
  end if;
  if not public.valid_posting_polygon(p_geometry) then
    raise exception 'invalid polygon';
  end if;

  select l.entity_id into v_area_id
  from public.audit_logs l
  where l.actor_id = auth.uid() and l.request_id = p_request_id;
  if v_area_id is not null then return v_area_id; end if;

  select p.id into v_plan_id
  from public.activity_plans p
  where p.activity_type = 'posting' and p.is_enabled = true
  order by p.starts_at desc nulls last, p.created_at desc
  limit 1;
  if v_plan_id is null then raise exception 'active posting plan not found'; end if;

  insert into public.posting_areas (
    activity_plan_id, area_code, name, geometry, target_count, note, is_sample
  ) values (
    v_plan_id, trim(p_area_code), trim(p_name), p_geometry, p_target_count,
    nullif(trim(p_note), ''), false
  )
  returning id, to_jsonb(posting_areas) into v_area_id, v_after;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, after_data, request_id
  ) values (
    auth.uid(), 'posting_area', v_area_id, 'created', v_after, p_request_id
  );

  return v_area_id;
end;
$$;

revoke all on function public.valid_posting_polygon(jsonb) from public, anon, authenticated;
revoke all on function public.create_posting_area(text, text, jsonb, integer, text, uuid)
  from public, anon;
grant execute on function public.create_posting_area(text, text, jsonb, integer, text, uuid)
  to authenticated;

create or replace function public.import_posting_areas(p_areas jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_area jsonb;
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
    raise exception 'invalid import count';
  end if;

  for v_area in select value from jsonb_array_elements(p_areas)
  loop
    perform public.create_posting_area(
      v_area ->> 'areaCode',
      v_area ->> 'name',
      v_area -> 'geometry',
      case
        when v_area -> 'targetCount' is null or v_area -> 'targetCount' = 'null'::jsonb
          then null
        else (v_area ->> 'targetCount')::integer
      end,
      v_area ->> 'note',
      gen_random_uuid()
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.import_posting_areas(jsonb) from public, anon;
grant execute on function public.import_posting_areas(jsonb) to authenticated;

