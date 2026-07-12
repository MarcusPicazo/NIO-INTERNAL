create extension if not exists pgcrypto with schema extensions;

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

revoke all on function verify_member_access_code(text) from public;
revoke all on function admin_issue_access_code(uuid, text, uuid) from public;
revoke all on function create_initial_owner_admin(text, text, text) from public;
revoke all on function verify_admin_credentials(text, text) from public;

grant execute on function verify_member_access_code(text) to service_role;
grant execute on function admin_issue_access_code(uuid, text, uuid) to service_role;
grant execute on function create_initial_owner_admin(text, text, text) to service_role;
grant execute on function verify_admin_credentials(text, text) to service_role;
