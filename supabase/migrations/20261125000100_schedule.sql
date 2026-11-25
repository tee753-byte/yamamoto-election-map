create type public.schedule_category as enum (
  'important',
  'meeting',
  'work',
  'deadline',
  'other'
);

create type public.schedule_status as enum (
  'confirmed',
  'tentative',
  'needs_review',
  'cancelled'
);

create type public.availability_status as enum (
  'available',
  'unavailable',
  'undecided'
);

create table public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  start_date date not null,
  end_date date,
  start_time time,
  end_time time,
  is_all_day boolean not null default false,
  time_tbd boolean not null default false,
  time_note text check (time_note is null or char_length(time_note) <= 120),
  category public.schedule_category not null default 'other',
  status public.schedule_status not null default 'tentative',
  location text check (location is null or char_length(location) <= 200),
  assignee_text text check (assignee_text is null or char_length(assignee_text) <= 300),
  description text check (description is null or char_length(description) <= 2000),
  confirmation_note text check (
    confirmation_note is null or char_length(confirmation_note) <= 1000
  ),
  google_maps_url text check (
    google_maps_url is null or char_length(google_maps_url) <= 1000
  ),
  related_url text check (related_url is null or char_length(related_url) <= 1000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (not (is_all_day and time_tbd)),
  check (not (is_all_day or time_tbd) or (start_time is null and end_time is null)),
  check (
    start_time is null
    or end_time is null
    or coalesce(end_date, start_date) > start_date
    or end_time > start_time
  )
);

create table public.schedule_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  availability_date date not null,
  status public.availability_status not null,
  is_all_day boolean not null default false,
  start_time time,
  end_time time,
  note text check (note is null or char_length(note) <= 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, availability_date),
  check (
    (status = 'available' and (
      (is_all_day and start_time is null and end_time is null)
      or (not is_all_day and start_time is not null and end_time is not null and end_time > start_time)
    ))
    or (status <> 'available' and not is_all_day and start_time is null and end_time is null)
  )
);

create index schedule_events_date_idx
  on public.schedule_events(start_date, coalesce(end_date, start_date));
create index schedule_events_status_idx
  on public.schedule_events(status, start_date);
create index schedule_availability_date_idx
  on public.schedule_availability(availability_date, user_id);

create trigger schedule_events_set_updated_at
before update on public.schedule_events
for each row execute function public.set_updated_at();

create trigger schedule_availability_set_updated_at
before update on public.schedule_availability
for each row execute function public.set_updated_at();

alter table public.schedule_events enable row level security;
alter table public.schedule_availability enable row level security;

grant select on public.schedule_events, public.schedule_availability to authenticated;
revoke insert, update, delete on public.schedule_events from authenticated;
revoke insert, update, delete on public.schedule_availability from authenticated;

create policy schedule_events_read_active_users
on public.schedule_events for select to authenticated
using (public.current_user_active());

create policy schedule_availability_read_active_users
on public.schedule_availability for select to authenticated
using (public.current_user_active());

create or replace function public.create_schedule_event(
  p_title text,
  p_start_date date,
  p_end_date date,
  p_start_time time,
  p_end_time time,
  p_is_all_day boolean,
  p_time_tbd boolean,
  p_time_note text,
  p_category public.schedule_category,
  p_status public.schedule_status,
  p_location text,
  p_assignee_text text,
  p_description text,
  p_confirmation_note text,
  p_google_maps_url text,
  p_related_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_event_id uuid;
  v_after jsonb;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active = true;

  if v_role is null or v_role = 'viewer' then
    raise exception 'not authorized';
  end if;

  insert into public.schedule_events (
    title, start_date, end_date, start_time, end_time, is_all_day, time_tbd,
    time_note, category, status, location, assignee_text, description,
    confirmation_note, google_maps_url, related_url, created_by, updated_by
  ) values (
    trim(p_title), p_start_date, p_end_date,
    case when p_is_all_day or p_time_tbd then null else p_start_time end,
    case when p_is_all_day or p_time_tbd then null else p_end_time end,
    p_is_all_day, p_time_tbd, nullif(trim(p_time_note), ''), p_category, p_status,
    nullif(trim(p_location), ''), nullif(trim(p_assignee_text), ''),
    nullif(trim(p_description), ''), nullif(trim(p_confirmation_note), ''),
    nullif(trim(p_google_maps_url), ''), nullif(trim(p_related_url), ''),
    auth.uid(), auth.uid()
  )
  returning id, to_jsonb(schedule_events) into v_event_id, v_after;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, after_data
  ) values (
    auth.uid(), 'schedule_event', v_event_id, 'created', v_after
  );

  return v_event_id;
end;
$$;

create or replace function public.update_schedule_event(
  p_event_id uuid,
  p_expected_version integer,
  p_title text,
  p_start_date date,
  p_end_date date,
  p_start_time time,
  p_end_time time,
  p_is_all_day boolean,
  p_time_tbd boolean,
  p_time_note text,
  p_category public.schedule_category,
  p_status public.schedule_status,
  p_location text,
  p_assignee_text text,
  p_description text,
  p_confirmation_note text,
  p_google_maps_url text,
  p_related_url text
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

  if v_role is null or v_role = 'viewer' then
    raise exception 'not authorized';
  end if;

  select e.version, to_jsonb(e)
    into v_current_version, v_before
  from public.schedule_events e
  where e.id = p_event_id
  for update;

  if not found then raise exception 'event not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;

  update public.schedule_events
  set title = trim(p_title),
      start_date = p_start_date,
      end_date = p_end_date,
      start_time = case when p_is_all_day or p_time_tbd then null else p_start_time end,
      end_time = case when p_is_all_day or p_time_tbd then null else p_end_time end,
      is_all_day = p_is_all_day,
      time_tbd = p_time_tbd,
      time_note = nullif(trim(p_time_note), ''),
      category = p_category,
      status = p_status,
      location = nullif(trim(p_location), ''),
      assignee_text = nullif(trim(p_assignee_text), ''),
      description = nullif(trim(p_description), ''),
      confirmation_note = nullif(trim(p_confirmation_note), ''),
      google_maps_url = nullif(trim(p_google_maps_url), ''),
      related_url = nullif(trim(p_related_url), ''),
      updated_by = auth.uid(),
      version = version + 1
  where id = p_event_id
  returning to_jsonb(schedule_events) into v_after;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, before_data, after_data
  ) values (
    auth.uid(), 'schedule_event', p_event_id, 'updated', v_before, v_after
  );
end;
$$;

create or replace function public.delete_schedule_event(
  p_event_id uuid,
  p_expected_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_created_by uuid;
  v_current_version integer;
  v_before jsonb;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active = true;

  if v_role is null or v_role = 'viewer' then
    raise exception 'not authorized';
  end if;

  select e.created_by, e.version, to_jsonb(e)
    into v_created_by, v_current_version, v_before
  from public.schedule_events e
  where e.id = p_event_id
  for update;

  if not found then raise exception 'event not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;
  if v_role <> 'admin' and v_created_by <> auth.uid() then
    raise exception 'not authorized to delete';
  end if;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, before_data
  ) values (
    auth.uid(), 'schedule_event', p_event_id, 'deleted', v_before
  );

  delete from public.schedule_events where id = p_event_id;
end;
$$;

create or replace function public.upsert_schedule_availability(
  p_availability_id uuid,
  p_expected_version integer,
  p_user_id uuid,
  p_availability_date date,
  p_status public.availability_status,
  p_is_all_day boolean,
  p_start_time time,
  p_end_time time,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_existing_id uuid;
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
  if v_role <> 'admin' and p_user_id <> auth.uid() then
    raise exception 'not authorized for another user';
  end if;
  if not exists (
    select 1 from public.profiles p where p.id = p_user_id and p.is_active = true
  ) then
    raise exception 'target user is inactive';
  end if;

  if p_availability_id is null then
    select a.id into v_existing_id
    from public.schedule_availability a
    where a.user_id = p_user_id and a.availability_date = p_availability_date
    for update;

    if found then raise exception 'conflict'; end if;

    insert into public.schedule_availability (
      user_id, availability_date, status, is_all_day, start_time, end_time,
      note, created_by, updated_by
    ) values (
      p_user_id, p_availability_date, p_status,
      case when p_status = 'available' then p_is_all_day else false end,
      case when p_status = 'available' and not p_is_all_day then p_start_time else null end,
      case when p_status = 'available' and not p_is_all_day then p_end_time else null end,
      nullif(trim(p_note), ''), auth.uid(), auth.uid()
    )
    returning id, to_jsonb(schedule_availability) into v_existing_id, v_after;

    insert into public.audit_logs (
      actor_id, entity_type, entity_id, action, after_data
    ) values (
      auth.uid(), 'schedule_availability', v_existing_id, 'created', v_after
    );

    return v_existing_id;
  end if;

  select a.version, to_jsonb(a)
    into v_current_version, v_before
  from public.schedule_availability a
  where a.id = p_availability_id
    and a.user_id = p_user_id
    and a.availability_date = p_availability_date
  for update;

  if not found then raise exception 'availability not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;

  update public.schedule_availability
  set status = p_status,
      is_all_day = case when p_status = 'available' then p_is_all_day else false end,
      start_time = case when p_status = 'available' and not p_is_all_day then p_start_time else null end,
      end_time = case when p_status = 'available' and not p_is_all_day then p_end_time else null end,
      note = nullif(trim(p_note), ''),
      updated_by = auth.uid(),
      version = version + 1
  where id = p_availability_id
  returning id, to_jsonb(schedule_availability) into v_existing_id, v_after;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, before_data, after_data
  ) values (
    auth.uid(), 'schedule_availability', v_existing_id, 'updated', v_before, v_after
  );

  return v_existing_id;
end;
$$;

create or replace function public.delete_schedule_availability(
  p_availability_id uuid,
  p_expected_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_user_id uuid;
  v_current_version integer;
  v_before jsonb;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active = true;

  if v_role is null or v_role = 'viewer' then
    raise exception 'not authorized';
  end if;

  select a.user_id, a.version, to_jsonb(a)
    into v_user_id, v_current_version, v_before
  from public.schedule_availability a
  where a.id = p_availability_id
  for update;

  if not found then raise exception 'availability not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;
  if v_role <> 'admin' and v_user_id <> auth.uid() then
    raise exception 'not authorized to delete';
  end if;

  insert into public.audit_logs (
    actor_id, entity_type, entity_id, action, before_data
  ) values (
    auth.uid(), 'schedule_availability', p_availability_id, 'deleted', v_before
  );

  delete from public.schedule_availability where id = p_availability_id;
end;
$$;

revoke all on function public.create_schedule_event(
  text, date, date, time, time, boolean, boolean, text,
  public.schedule_category, public.schedule_status, text, text, text, text, text, text
) from public, anon;
revoke all on function public.update_schedule_event(
  uuid, integer, text, date, date, time, time, boolean, boolean, text,
  public.schedule_category, public.schedule_status, text, text, text, text, text, text
) from public, anon;
revoke all on function public.delete_schedule_event(uuid, integer) from public, anon;
revoke all on function public.upsert_schedule_availability(
  uuid, integer, uuid, date, public.availability_status, boolean, time, time, text
) from public, anon;
revoke all on function public.delete_schedule_availability(uuid, integer) from public, anon;

grant execute on function public.create_schedule_event(
  text, date, date, time, time, boolean, boolean, text,
  public.schedule_category, public.schedule_status, text, text, text, text, text, text
) to authenticated;
grant execute on function public.update_schedule_event(
  uuid, integer, text, date, date, time, time, boolean, boolean, text,
  public.schedule_category, public.schedule_status, text, text, text, text, text, text
) to authenticated;
grant execute on function public.delete_schedule_event(uuid, integer) to authenticated;
grant execute on function public.upsert_schedule_availability(
  uuid, integer, uuid, date, public.availability_status, boolean, time, time, text
) to authenticated;
grant execute on function public.delete_schedule_availability(uuid, integer) to authenticated;
