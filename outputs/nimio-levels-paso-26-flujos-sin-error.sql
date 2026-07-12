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

grant execute on function admin_resolve_point_request(uuid, uuid, text, integer, text) to service_role;
grant execute on function admin_approve_redemption(uuid, uuid, text) to service_role;
