create extension if not exists pgcrypto;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text unique,
  password_hash text not null,
  member_id uuid,
  is_owner boolean not null default false,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists admins_single_owner_idx
  on admins(is_owner)
  where is_owner = true;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  area text,
  role_title text,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked', 'deleted')),
  base_avatar_url text,
  custom_avatar_url text,
  joined_at timestamptz not null default now(),
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admins
  add constraint admins_member_id_fkey
  foreign key (member_id) references members(id) on delete set null;

create table if not exists access_codes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete restrict,
  code_hash text not null,
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_by_admin_id uuid references admins(id) on delete set null,
  created_at timestamptz not null default now(),
  blocked_at timestamptz,
  last_used_at timestamptz
);

create unique index if not exists access_codes_one_active_per_member
  on access_codes(member_id)
  where status = 'active';

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists levels (
  id uuid primary key default gen_random_uuid(),
  rank integer not null unique check (rank > 0),
  name text not null,
  min_points integer not null check (min_points >= 0),
  max_points integer check (max_points is null or max_points >= min_points),
  message text,
  base_asset_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists member_level_assets (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete restrict,
  level_id uuid not null references levels(id) on delete restrict,
  asset_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id, level_id)
);

create table if not exists point_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  project_name text,
  activity text not null,
  achievement_type text not null,
  suggested_points integer not null check (suggested_points > 0),
  approved_points integer check (approved_points is null or approved_points > 0),
  evidence_url text,
  comment text,
  admin_comment text,
  status text not null default 'pending_review' check (
    status in ('pending_review', 'in_review', 'approved', 'approved_adjusted', 'rejected', 'needs_more_evidence')
  ),
  request_fingerprint text not null,
  reviewed_by_admin_id uuid references admins(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists point_requests_member_fingerprint_open_idx
  on point_requests(member_id, request_fingerprint)
  where status <> 'rejected';

create table if not exists point_movements (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  member_id uuid not null references members(id) on delete restrict,
  movement_type text not null check (
    movement_type in (
      'approved_points',
      'manual_points_added',
      'points_deducted',
      'redemption_approved',
      'admin_adjustment',
      'correction'
    )
  ),
  points integer not null check (points <> 0),
  project_id uuid references projects(id) on delete set null,
  reason text not null,
  evidence_url text,
  status text not null default 'approved' check (status in ('pending', 'approved', 'void')),
  approved_by_admin_id uuid references admins(id) on delete set null,
  point_request_id uuid references point_requests(id) on delete set null,
  redemption_request_id uuid,
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  reward_type text not null check (reward_type in ('money', 'benefit', 'course', 'tool', 'priority', 'other')),
  points_required integer not null check (points_required > 0),
  value_mxn numeric(12, 2) not null default 0 check (value_mxn >= 0),
  is_active boolean not null default true,
  monthly_limit_per_member integer check (monthly_limit_per_member is null or monthly_limit_per_member > 0),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists redemption_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete restrict,
  reward_id uuid not null references rewards(id) on delete restrict,
  points_snapshot integer not null check (points_snapshot > 0),
  value_mxn_snapshot numeric(12, 2) not null default 0 check (value_mxn_snapshot >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected', 'cancelled')),
  member_comment text,
  admin_comment text,
  payment_proof_url text,
  reviewed_by_admin_id uuid references admins(id) on delete set null,
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table point_movements
  add constraint point_movements_redemption_request_id_fkey
  foreign key (redemption_request_id) references redemption_requests(id) on delete set null;

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admins(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists system_settings (
  key text primary key,
  value jsonb not null,
  updated_by_admin_id uuid references admins(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_members_updated_at on members;
create trigger set_members_updated_at
before update on members
for each row execute function set_updated_at();

drop trigger if exists set_levels_updated_at on levels;
create trigger set_levels_updated_at
before update on levels
for each row execute function set_updated_at();

drop trigger if exists set_member_level_assets_updated_at on member_level_assets;
create trigger set_member_level_assets_updated_at
before update on member_level_assets
for each row execute function set_updated_at();

drop trigger if exists set_point_requests_updated_at on point_requests;
create trigger set_point_requests_updated_at
before update on point_requests
for each row execute function set_updated_at();

drop trigger if exists set_rewards_updated_at on rewards;
create trigger set_rewards_updated_at
before update on rewards
for each row execute function set_updated_at();

drop trigger if exists set_redemption_requests_updated_at on redemption_requests;
create trigger set_redemption_requests_updated_at
before update on redemption_requests
for each row execute function set_updated_at();

create or replace view member_balances as
with movement_totals as (
  select
    m.id as member_id,
    coalesce(sum(
      case
        when pm.status = 'approved'
          and pm.points > 0
          and pm.movement_type in ('approved_points', 'manual_points_added', 'admin_adjustment', 'correction')
        then pm.points
        else 0
      end
    ), 0)::integer as historical_points,
    coalesce(sum(
      case
        when pm.status = 'approved'
          and pm.movement_type = 'redemption_approved'
        then abs(pm.points)
        else 0
      end
    ), 0)::integer as spent_points,
    coalesce(sum(
      case
        when pm.status = 'approved'
          and pm.points < 0
          and pm.movement_type <> 'redemption_approved'
        then abs(pm.points)
        else 0
      end
    ), 0)::integer as deducted_points
  from members m
  left join point_movements pm on pm.member_id = m.id
  group by m.id
)
select
  member_id,
  historical_points,
  spent_points,
  deducted_points,
  greatest(historical_points - spent_points - deducted_points, 0)::integer as available_points
from movement_totals;

create or replace view member_profiles as
select
  m.id,
  m.full_name,
  m.area,
  m.role_title,
  m.email,
  m.status,
  m.base_avatar_url,
  m.custom_avatar_url,
  m.joined_at,
  m.private_notes,
  b.historical_points,
  b.spent_points,
  b.deducted_points,
  b.available_points,
  l.id as level_id,
  l.name as level_name,
  l.rank as level_rank,
  l.min_points as level_min_points,
  l.max_points as level_max_points,
  l.message as level_message,
  l.base_asset_url as level_asset_url,
  mla.asset_url as custom_level_asset_url
from members m
join member_balances b on b.member_id = m.id
left join lateral (
  select *
  from levels level_candidate
  where level_candidate.is_active = true
    and b.historical_points >= level_candidate.min_points
    and (level_candidate.max_points is null or b.historical_points <= level_candidate.max_points)
  order by level_candidate.rank desc
  limit 1
) l on true
left join member_level_assets mla on mla.member_id = m.id and mla.level_id = l.id;

create or replace function normalized_access_code(raw_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(trim(raw_code), '\s+', '', 'g'));
$$;

create or replace function verify_member_access_code(raw_code text)
returns table(member_id uuid, member_status text, code_status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update access_codes ac
  set last_used_at = now()
  from members m
  where ac.member_id = m.id
    and extensions.crypt(normalized_access_code(raw_code), ac.code_hash) = ac.code_hash
  returning ac.member_id, m.status, ac.status;
end;
$$;

create or replace function admin_issue_access_code(p_member_id uuid, p_raw_code text, p_admin_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code_id uuid;
begin
  update access_codes
  set status = 'blocked',
      blocked_at = now()
  where member_id = p_member_id
    and status = 'active';

  insert into access_codes(member_id, code_hash, status, created_by_admin_id)
  values (p_member_id, extensions.crypt(normalized_access_code(p_raw_code), extensions.gen_salt('bf')), 'active', p_admin_id)
  returning id into new_code_id;

  return new_code_id;
end;
$$;

create or replace function create_initial_owner_admin(
  p_display_name text,
  p_email text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_admin_id uuid;
begin
  if exists (select 1 from admins) then
    raise exception 'initial admin setup is locked';
  end if;

  if length(trim(p_display_name)) < 2 then
    raise exception 'display name is required';
  end if;

  if length(p_password) < 10 then
    raise exception 'password must be at least 10 characters';
  end if;

  insert into admins(display_name, email, password_hash, is_owner, is_active)
  values (
    trim(p_display_name),
    lower(trim(p_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    true,
    true
  )
  returning id into new_admin_id;

  insert into admin_audit_logs(admin_id, action, entity_type, entity_id, details)
  values (
    new_admin_id,
    'initial_owner_admin_created',
    'admin',
    new_admin_id::text,
    jsonb_build_object('email', lower(trim(p_email)))
  );

  return new_admin_id;
end;
$$;

create or replace function verify_admin_credentials(
  p_email text,
  p_password text
)
returns table(admin_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update admins a
  set last_login_at = now()
  where a.email = lower(trim(p_email))
    and a.is_active = true
    and extensions.crypt(p_password, a.password_hash) = a.password_hash
  returning a.id;
end;
$$;

create or replace function admin_resolve_point_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_status text,
  p_approved_points integer,
  p_admin_comment text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record point_requests%rowtype;
  admin_member_id uuid;
  movement_id uuid;
  final_status text;
begin
  select * into request_record
  from point_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'point request not found';
  end if;

  if request_record.status in ('approved', 'approved_adjusted') then
    select id into movement_id
    from point_movements
    where point_request_id = p_request_id
    order by created_at desc
    limit 1;

    return movement_id;
  end if;

  if request_record.status = 'rejected' then
    return null;
  end if;

  if p_approved_points <= 0 then
    raise exception 'approved points must be positive';
  end if;

  select member_id into admin_member_id
  from admins
  where id = p_admin_id;

  if admin_member_id is not null and admin_member_id = request_record.member_id then
    raise exception 'admins cannot approve their own points';
  end if;

  final_status := case
    when p_approved_points = request_record.suggested_points then 'approved'
    else 'approved_adjusted'
  end;

  update point_requests
  set status = final_status,
      approved_points = p_approved_points,
      admin_comment = p_admin_comment,
      reviewed_by_admin_id = p_admin_id,
      reviewed_at = now()
  where id = p_request_id;

  insert into point_movements(
    member_id,
    movement_type,
    points,
    project_id,
    reason,
    evidence_url,
    status,
    approved_by_admin_id,
    point_request_id,
    comment
  )
  values (
    request_record.member_id,
    'approved_points',
    p_approved_points,
    request_record.project_id,
    request_record.activity,
    request_record.evidence_url,
    'approved',
    p_admin_id,
    p_request_id,
    p_admin_comment
  )
  returning id into movement_id;

  return movement_id;
end;
$$;

create or replace function admin_approve_redemption(
  p_redemption_id uuid,
  p_admin_id uuid,
  p_admin_comment text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  redemption_record redemption_requests%rowtype;
  reward_record rewards%rowtype;
  profile_record member_profiles%rowtype;
  movement_id uuid;
  monthly_count integer;
begin
  select * into redemption_record
  from redemption_requests
  where id = p_redemption_id
  for update;

  if not found then
    raise exception 'redemption not found';
  end if;

  if redemption_record.status <> 'pending' then
    select id into movement_id
    from point_movements
    where redemption_request_id = p_redemption_id
    order by created_at desc
    limit 1;

    return movement_id;
  end if;

  select * into reward_record
  from rewards
  where id = redemption_record.reward_id
    and is_active = true;

  if not found then
    raise exception 'reward is inactive or missing';
  end if;

  select * into profile_record
  from member_profiles
  where id = redemption_record.member_id;

  if profile_record.available_points < reward_record.points_required then
    raise exception 'insufficient available points';
  end if;

  if reward_record.monthly_limit_per_member is not null then
    select count(*) into monthly_count
    from redemption_requests
    where member_id = redemption_record.member_id
      and reward_id = redemption_record.reward_id
      and status in ('pending', 'approved', 'paid')
      and created_at >= date_trunc('month', now())
      and created_at < date_trunc('month', now()) + interval '1 month'
      and id <> p_redemption_id;

    if monthly_count >= reward_record.monthly_limit_per_member then
      raise exception 'monthly redemption limit reached';
    end if;
  end if;

  update redemption_requests
  set status = 'approved',
      points_snapshot = reward_record.points_required,
      value_mxn_snapshot = reward_record.value_mxn,
      admin_comment = p_admin_comment,
      reviewed_by_admin_id = p_admin_id,
      reviewed_at = now()
  where id = p_redemption_id;

  insert into point_movements(
    member_id,
    movement_type,
    points,
    reason,
    status,
    approved_by_admin_id,
    redemption_request_id,
    comment
  )
  values (
    redemption_record.member_id,
    'redemption_approved',
    reward_record.points_required * -1,
    'Canje aprobado: ' || reward_record.name,
    'approved',
    p_admin_id,
    p_redemption_id,
    p_admin_comment
  )
  returning id into movement_id;

  return movement_id;
end;
$$;

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('evidence', 'evidence', false),
  ('reward-images', 'reward-images', true)
on conflict (id) do nothing;

alter table admins enable row level security;
alter table members enable row level security;
alter table access_codes enable row level security;
alter table projects enable row level security;
alter table levels enable row level security;
alter table member_level_assets enable row level security;
alter table point_requests enable row level security;
alter table point_movements enable row level security;
alter table rewards enable row level security;
alter table redemption_requests enable row level security;
alter table admin_audit_logs enable row level security;
alter table system_settings enable row level security;

create or replace function jwt_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'app_role', '') = 'admin';
$$;

create or replace function jwt_member_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'member_id', '')::uuid;
$$;

drop policy if exists "admins can manage admins" on admins;
drop policy if exists "admins can read admins" on admins;
create policy "admins can read admins" on admins
for select using (jwt_is_admin());

drop policy if exists "members can read own member record" on members;
create policy "members can read own member record" on members
for select using (id = jwt_member_id());

drop policy if exists "admins can manage members" on members;
create policy "admins can manage members" on members
for all using (jwt_is_admin()) with check (jwt_is_admin());

drop policy if exists "admins can manage access codes" on access_codes;
create policy "admins can manage access codes" on access_codes
for all using (jwt_is_admin()) with check (jwt_is_admin());

drop policy if exists "members can read active projects" on projects;
create policy "members can read active projects" on projects
for select using (is_active = true);

drop policy if exists "admins can manage projects" on projects;
create policy "admins can manage projects" on projects
for all using (jwt_is_admin()) with check (jwt_is_admin());

drop policy if exists "members can read active levels" on levels;
create policy "members can read active levels" on levels
for select using (is_active = true);

drop policy if exists "admins can manage levels" on levels;
create policy "admins can manage levels" on levels
for all using (jwt_is_admin()) with check (jwt_is_admin());

drop policy if exists "members can read own level assets" on member_level_assets;
create policy "members can read own level assets" on member_level_assets
for select using (member_id = jwt_member_id());

drop policy if exists "admins can manage member level assets" on member_level_assets;
create policy "admins can manage member level assets" on member_level_assets
for all using (jwt_is_admin()) with check (jwt_is_admin());

drop policy if exists "members can read own point requests" on point_requests;
create policy "members can read own point requests" on point_requests
for select using (member_id = jwt_member_id());

drop policy if exists "members can create own point requests" on point_requests;
create policy "members can create own point requests" on point_requests
for insert with check (member_id = jwt_member_id() and suggested_points > 0);

drop policy if exists "admins can manage point requests" on point_requests;
create policy "admins can manage point requests" on point_requests
for all using (jwt_is_admin()) with check (jwt_is_admin());

drop policy if exists "members can read own movements" on point_movements;
create policy "members can read own movements" on point_movements
for select using (member_id = jwt_member_id());

drop policy if exists "admins can manage movements" on point_movements;
create policy "admins can manage movements" on point_movements
for all using (jwt_is_admin()) with check (jwt_is_admin());

drop policy if exists "members can read active rewards" on rewards;
create policy "members can read active rewards" on rewards
for select using (is_active = true);

drop policy if exists "admins can manage rewards" on rewards;
create policy "admins can manage rewards" on rewards
for all using (jwt_is_admin()) with check (jwt_is_admin());

drop policy if exists "members can read own redemptions" on redemption_requests;
create policy "members can read own redemptions" on redemption_requests
for select using (member_id = jwt_member_id());

drop policy if exists "members can create own redemptions" on redemption_requests;
create policy "members can create own redemptions" on redemption_requests
for insert with check (member_id = jwt_member_id());

drop policy if exists "admins can manage redemptions" on redemption_requests;
create policy "admins can manage redemptions" on redemption_requests
for all using (jwt_is_admin()) with check (jwt_is_admin());

drop policy if exists "admins can read audit logs" on admin_audit_logs;
create policy "admins can read audit logs" on admin_audit_logs
for select using (jwt_is_admin());

drop policy if exists "admins can create audit logs" on admin_audit_logs;
create policy "admins can create audit logs" on admin_audit_logs
for insert with check (jwt_is_admin());

drop policy if exists "admins can manage settings" on system_settings;
create policy "admins can manage settings" on system_settings
for all using (jwt_is_admin()) with check (jwt_is_admin());

drop policy if exists "public can read configured storage assets" on storage.objects;
create policy "public can read configured storage assets" on storage.objects
for select using (bucket_id in ('avatars', 'reward-images'));

drop policy if exists "admins can manage configured storage assets" on storage.objects;
create policy "admins can manage configured storage assets" on storage.objects
for all using (jwt_is_admin() and bucket_id in ('avatars', 'evidence', 'reward-images'))
with check (jwt_is_admin() and bucket_id in ('avatars', 'evidence', 'reward-images'));

revoke all on function verify_member_access_code(text) from public;
revoke all on function admin_issue_access_code(uuid, text, uuid) from public;
revoke all on function create_initial_owner_admin(text, text, text) from public;
revoke all on function verify_admin_credentials(text, text) from public;
revoke all on function admin_resolve_point_request(uuid, uuid, text, integer, text) from public;
revoke all on function admin_approve_redemption(uuid, uuid, text) from public;

grant execute on function verify_member_access_code(text) to service_role;
grant execute on function admin_issue_access_code(uuid, text, uuid) to service_role;
grant execute on function create_initial_owner_admin(text, text, text) to service_role;
grant execute on function verify_admin_credentials(text, text) to service_role;
grant execute on function admin_resolve_point_request(uuid, uuid, text, integer, text) to service_role;
grant execute on function admin_approve_redemption(uuid, uuid, text) to service_role;
