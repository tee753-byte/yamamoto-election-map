alter table public.candidate_poster_work
  add column assignee_label text
  check (assignee_label is null or char_length(assignee_label) between 1 and 80);

alter table public.posting_areas
  add column assignee_label text
  check (assignee_label is null or char_length(assignee_label) between 1 and 80);

update public.candidate_poster_work w
set assignee_label = p.display_name
from public.profiles p
where w.assignee_id = p.id;

update public.posting_areas a
set assignee_label = p.display_name
from public.profiles p
where a.assignee_id = p.id;

alter table public.candidate_poster_work
  drop constraint if exists candidate_poster_work_check;
alter table public.candidate_poster_work
  add constraint candidate_poster_work_assignment_check
  check (status <> 'assigned' or assignee_id is not null or assignee_label is not null);

alter table public.posting_areas
  drop constraint if exists posting_areas_check;
alter table public.posting_areas
  add constraint posting_areas_assignment_check
  check (status <> 'assigned' or assignee_id is not null or assignee_label is not null);

create or replace function public.assign_poster_work(
  p_work_id uuid,
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

  select w.version, to_jsonb(w)
    into v_current_version, v_before
  from public.candidate_poster_work w
  where w.id = p_work_id
  for update;

  if not found then raise exception 'work not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;

  update public.candidate_poster_work
  set assignee_id = v_assignee_id,
      assignee_label = v_label,
      status = case
        when v_label is null and status = 'assigned'
          then 'not_started'::public.work_status
        when v_label is not null and status = 'not_started'
          then 'assigned'::public.work_status
        else status
      end,
      version = version + 1
  where id = p_work_id
  returning to_jsonb(candidate_poster_work) into v_after;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, before_data, after_data
  ) values (
    auth.uid(), 'candidate_poster_work', p_work_id, 'assignee_changed', v_before, v_after
  );
end;
$$;

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
        when v_label is not null and status = 'not_started'
          then 'assigned'::public.work_status
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

create or replace function public.update_poster_work(
  p_work_id uuid,
  p_expected_version integer,
  p_new_status public.work_status,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_assignee_id uuid;
  v_assignee_label text;
  v_current_version integer;
  v_before jsonb;
  v_after jsonb;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active = true;

  if v_role is null or v_role = 'viewer' then
    raise exception 'not authorized';
  end if;

  select w.assignee_id, w.assignee_label, w.version, to_jsonb(w)
    into v_assignee_id, v_assignee_label, v_current_version, v_before
  from public.candidate_poster_work w
  where w.id = p_work_id
  for update;

  if not found then raise exception 'work not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;
  if v_role <> 'admin' and v_assignee_id is not null
    and v_assignee_id is distinct from auth.uid() then
    raise exception 'not assigned';
  end if;
  if v_role <> 'admin' and v_assignee_id is null and v_assignee_label is null then
    raise exception 'not assigned';
  end if;

  update public.candidate_poster_work
  set status = p_new_status,
      note = nullif(trim(p_note), ''),
      version = version + 1
  where id = p_work_id
  returning to_jsonb(candidate_poster_work) into v_after;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, before_data, after_data
  ) values (
    auth.uid(), 'candidate_poster_work', p_work_id, 'status_changed', v_before, v_after
  );
end;
$$;

create or replace function public.record_posting_progress(
  p_area_id uuid,
  p_expected_version integer,
  p_new_status public.work_status,
  p_delivered_increment integer,
  p_request_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_assignee_id uuid;
  v_assignee_label text;
  v_current_version integer;
  v_before jsonb;
  v_after jsonb;
  v_plan_enabled boolean;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  if p_delivered_increment < 0 or p_delivered_increment > 5000 then
    raise exception 'invalid delivered count';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active = true;

  if v_role is null or v_role = 'viewer' then
    raise exception 'not authorized';
  end if;

  if exists (
    select 1
    from public.audit_logs l
    where l.actor_id = auth.uid() and l.request_id = p_request_id
  ) then
    return;
  end if;

  select a.assignee_id, a.assignee_label, a.version, to_jsonb(a),
      p.is_enabled, p.starts_at, p.ends_at
    into v_assignee_id, v_assignee_label, v_current_version, v_before,
      v_plan_enabled, v_starts_at, v_ends_at
  from public.posting_areas a
  join public.activity_plans p on p.id = a.activity_plan_id
  where a.id = p_area_id and a.archived_at is null
  for update;

  if not found then raise exception 'area not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;
  if not v_plan_enabled
    or (v_starts_at is not null and now() < v_starts_at)
    or (v_ends_at is not null and now() > v_ends_at) then
    raise exception 'activity is outside the configured period';
  end if;
  if v_role <> 'admin' and v_assignee_id is not null
    and v_assignee_id is distinct from auth.uid() then
    raise exception 'not assigned';
  end if;
  if v_role <> 'admin' and v_assignee_id is null and v_assignee_label is null then
    raise exception 'not assigned';
  end if;

  if p_delivered_increment > 0 then
    insert into public.posting_reports (
      posting_area_id, reporter_id, delivered_count, note, client_request_id
    ) values (
      p_area_id, auth.uid(), p_delivered_increment, nullif(trim(p_note), ''), p_request_id
    );
  end if;

  update public.posting_areas
  set status = p_new_status,
      delivered_count = delivered_count + p_delivered_increment,
      note = nullif(trim(p_note), ''),
      version = version + 1
  where id = p_area_id
  returning to_jsonb(posting_areas) into v_after;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, before_data, after_data, request_id
  ) values (
    auth.uid(), 'posting_area', p_area_id, 'progress_recorded', v_before, v_after, p_request_id
  );
end;
$$;

revoke all on function public.assign_poster_work(uuid, integer, text)
  from public, anon;
revoke all on function public.assign_posting_area(uuid, integer, text)
  from public, anon;
grant execute on function public.assign_poster_work(uuid, integer, text)
  to authenticated;
grant execute on function public.assign_posting_area(uuid, integer, text)
  to authenticated;
