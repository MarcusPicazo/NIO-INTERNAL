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

revoke all on function admin_approve_redemption(uuid, uuid, text) from public;
grant execute on function admin_approve_redemption(uuid, uuid, text) to service_role;
