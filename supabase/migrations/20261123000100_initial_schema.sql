create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'worker', 'viewer');
create type public.work_status as enum (
  'not_started',
  'assigned',
  'completed',
  'needs_review'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role public.app_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique check (char_length(display_name) between 1 and 80),
  color text not null default '#620000' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_plans (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null,
  title text not null,
  document_description text,
  method_description text,
  starts_at timestamptz,
  ends_at timestamptz,
  compliance_note text,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.poster_boards (
  id uuid primary key default gen_random_uuid(),
  board_number text not null unique,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_hint text not null check (char_length(location_hint) between 1 and 200),
  source_label text,
  source_received_at date,
  source_version text,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_poster_work (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete restrict,
  poster_board_id uuid not null references public.poster_boards(id) on delete restrict,
  status public.work_status not null default 'not_started',
  assignee_id uuid references public.profiles(id) on delete set null,
  note text check (note is null or char_length(note) <= 300),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, poster_board_id),
  check (status <> 'assigned' or assignee_id is not null)
);

create table public.posting_areas (
  id uuid primary key default gen_random_uuid(),
  activity_plan_id uuid not null references public.activity_plans(id) on delete restrict,
  area_code text not null unique,
  name text not null,
  geometry jsonb not null check (geometry ->> 'type' = 'Polygon'),
  status public.work_status not null default 'not_started',
  assignee_id uuid references public.profiles(id) on delete set null,
  target_count integer check (target_count is null or target_count >= 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  note text check (note is null or char_length(note) <= 300),
  version integer not null default 1 check (version > 0),
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'assigned' or assignee_id is not null)
);

create table public.posting_reports (
  id uuid primary key default gen_random_uuid(),
  posting_area_id uuid not null references public.posting_areas(id) on delete restrict,
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  delivered_count integer not null check (delivered_count > 0),
  note text check (note is null or char_length(note) <= 300),
  client_request_id uuid not null unique,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  request_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index candidate_poster_work_candidate_idx
  on public.candidate_poster_work(candidate_id, status);
create index candidate_poster_work_assignee_idx
  on public.candidate_poster_work(assignee_id) where assignee_id is not null;
create index posting_areas_status_idx
  on public.posting_areas(status) where archived_at is null;
create index audit_logs_entity_idx
  on public.audit_logs(entity_type, entity_id, created_at desc);
create unique index audit_logs_actor_request_uidx
  on public.audit_logs(actor_id, request_id)
  where request_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger candidates_set_updated_at before update on public.candidates
for each row execute function public.set_updated_at();
create trigger activity_plans_set_updated_at before update on public.activity_plans
for each row execute function public.set_updated_at();
create trigger poster_boards_set_updated_at before update on public.poster_boards
for each row execute function public.set_updated_at();
create trigger candidate_poster_work_set_updated_at before update on public.candidate_poster_work
for each row execute function public.set_updated_at();
create trigger posting_areas_set_updated_at before update on public.posting_areas
for each row execute function public.set_updated_at();

create or replace function public.current_user_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_active from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active = true;
$$;

revoke all on function public.current_user_active() from public, anon;
revoke all on function public.current_user_role() from public, anon;
grant execute on function public.current_user_active() to authenticated;
grant execute on function public.current_user_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.candidates enable row level security;
alter table public.activity_plans enable row level security;
alter table public.poster_boards enable row level security;
alter table public.candidate_poster_work enable row level security;
alter table public.posting_areas enable row level security;
alter table public.posting_reports enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;
grant select on public.profiles, public.candidates, public.activity_plans,
  public.poster_boards, public.candidate_poster_work, public.posting_areas,
  public.posting_reports, public.audit_logs
  to authenticated;
grant insert, update, delete on public.profiles, public.candidates,
  public.activity_plans, public.poster_boards, public.candidate_poster_work,
  public.posting_areas to authenticated;

create policy profiles_read_active_users
on public.profiles for select to authenticated
using (public.current_user_active());

create policy candidates_read_active_users
on public.candidates for select to authenticated
using (public.current_user_active());

create policy activity_plans_read_active_users
on public.activity_plans for select to authenticated
using (public.current_user_active());

create policy poster_boards_read_active_users
on public.poster_boards for select to authenticated
using (public.current_user_active() and archived_at is null);

create policy candidate_poster_work_read_active_users
on public.candidate_poster_work for select to authenticated
using (public.current_user_active());

create policy posting_areas_read_active_users
on public.posting_areas for select to authenticated
using (public.current_user_active() and archived_at is null);

create policy profiles_admin_update
on public.profiles for update to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy candidates_admin_all
on public.candidates for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy activity_plans_admin_all
on public.activity_plans for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy poster_boards_admin_all
on public.poster_boards for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy candidate_poster_work_admin_all
on public.candidate_poster_work for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy posting_areas_admin_all
on public.posting_areas for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy posting_reports_read_own_or_admin
on public.posting_reports for select to authenticated
using (reporter_id = auth.uid() or public.current_user_role() = 'admin');

create policy audit_logs_admin_read
on public.audit_logs for select to authenticated
using (public.current_user_role() = 'admin');

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

  select w.assignee_id, w.version, to_jsonb(w)
    into v_assignee_id, v_current_version, v_before
  from public.candidate_poster_work w
  where w.id = p_work_id
  for update;

  if not found then raise exception 'work not found'; end if;
  if v_current_version <> p_expected_version then raise exception 'conflict'; end if;
  if v_role <> 'admin' and v_assignee_id is distinct from auth.uid() then
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

  -- 同じ端末から同じ操作が再送された場合は、二重加算せず成功扱いにする。
  if exists (
    select 1
    from public.audit_logs l
    where l.actor_id = auth.uid() and l.request_id = p_request_id
  ) then
    return;
  end if;

  select a.assignee_id, a.version, to_jsonb(a), p.is_enabled, p.starts_at, p.ends_at
    into v_assignee_id, v_current_version, v_before,
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
  if v_role <> 'admin' and v_assignee_id is distinct from auth.uid() then
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

revoke all on function public.update_poster_work(uuid, integer, public.work_status, text)
  from public, anon;
revoke all on function public.record_posting_progress(
  uuid, integer, public.work_status, integer, uuid, text
) from public, anon;
grant execute on function public.update_poster_work(
  uuid, integer, public.work_status, text
) to authenticated;
grant execute on function public.record_posting_progress(
  uuid, integer, public.work_status, integer, uuid, text
) to authenticated;

revoke insert, update, delete on public.posting_reports from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;
