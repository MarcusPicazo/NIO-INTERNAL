import { NextResponse } from "next/server";
import { getAdminDashboard } from "@/lib/data";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { toCsv } from "@/lib/csv";
import { requireAdminSession } from "@/lib/session";

const exporters: Record<string, (data: Awaited<ReturnType<typeof getAdminDashboard>>) => Array<Record<string, unknown>>> = {
  members: (data) =>
    data.members.map((member) => ({
      id: member.id,
      full_name: member.full_name,
      area: member.area,
      role_title: member.role_title,
      email: member.email,
      status: member.status,
      level_name: member.level_name,
      historical_points: member.historical_points,
      available_points: member.available_points,
      spent_points: member.spent_points,
      deducted_points: member.deducted_points,
      joined_at: member.joined_at
    })),
  movements: (data) =>
    data.movements.map((movement) => ({
      id: movement.id,
      occurred_at: movement.occurred_at,
      member: movement.members?.full_name,
      movement_type: movement.movement_type,
      points: movement.points,
      project: movement.projects?.name,
      reason: movement.reason,
      status: movement.status,
      comment: movement.comment
    })),
  point_requests: (data) =>
    data.requests.map((request) => ({
      id: request.id,
      created_at: request.created_at,
      member: request.members?.full_name,
      project: request.projects?.name || request.project_name,
      activity: request.activity,
      achievement_type: request.achievement_type,
      suggested_points: request.suggested_points,
      approved_points: request.approved_points,
      status: request.status,
      evidence_url: request.evidence_url,
      comment: request.comment,
      admin_comment: request.admin_comment
    })),
  redemptions: (data) =>
    data.redemptions.map((redemption) => ({
      id: redemption.id,
      created_at: redemption.created_at,
      member: redemption.members?.full_name,
      reward: redemption.rewards?.name,
      points_snapshot: redemption.points_snapshot,
      value_mxn_snapshot: redemption.value_mxn_snapshot,
      status: redemption.status,
      payment_proof_url: redemption.payment_proof_url,
      member_comment: redemption.member_comment,
      admin_comment: redemption.admin_comment
    })),
  rewards: (data) =>
    data.rewards.map((reward) => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      reward_type: reward.reward_type,
      points_required: reward.points_required,
      value_mxn: reward.value_mxn,
      is_active: reward.is_active,
      monthly_limit_per_member: reward.monthly_limit_per_member,
      created_at: reward.created_at,
      updated_at: reward.updated_at
    })),
  levels: (data) =>
    data.levels.map((level) => ({
      id: level.id,
      rank: level.rank,
      name: level.name,
      min_points: level.min_points,
      max_points: level.max_points,
      message: level.message,
      base_asset_url: level.base_asset_url
    })),
  complete: (data) => [
    ...exporters.members(data).map((row) => ({ section: "members", ...row })),
    ...exporters.movements(data).map((row) => ({ section: "movements", ...row })),
    ...exporters.point_requests(data).map((row) => ({ section: "point_requests", ...row })),
    ...exporters.redemptions(data).map((row) => ({ section: "redemptions", ...row })),
    ...exporters.rewards(data).map((row) => ({ section: "rewards", ...row })),
    ...exporters.levels(data).map((row) => ({ section: "levels", ...row }))
  ]
};

async function getFullExportData(): Promise<Awaited<ReturnType<typeof getAdminDashboard>>> {
  const supabase = createSupabaseAdmin();
  const [members, requests, movements, redemptions, rewards, levels, projects, audits, settings] = await Promise.all([
    supabase.from("member_profiles").select("*").order("full_name"),
    supabase.from("point_requests").select("*, members(full_name), projects(name)").order("created_at", {
      ascending: false
    }),
    supabase.from("point_movements").select("*, members(full_name), projects(name)").order("occurred_at", {
      ascending: false
    }),
    supabase
      .from("redemption_requests")
      .select("*, members(full_name), rewards(name, reward_type, points_required, value_mxn)")
      .order("created_at", { ascending: false }),
    supabase.from("rewards").select("*").order("points_required"),
    supabase.from("levels").select("*").order("rank"),
    supabase.from("projects").select("*").order("name"),
    supabase.from("admin_audit_logs").select("*, admins(display_name)").order("created_at", {
      ascending: false
    }),
    supabase.from("system_settings").select("*").order("key")
  ]);

  for (const result of [members, requests, movements, redemptions, rewards, levels, projects, audits, settings]) {
    if (result.error) {
      throw result.error;
    }
  }

  return {
    members: members.data || [],
    requests: requests.data || [],
    movements: movements.data || [],
    redemptions: redemptions.data || [],
    rewards: rewards.data || [],
    levels: levels.data || [],
    projects: projects.data || [],
    audits: audits.data || [],
    settings: settings.data || []
  };
}

export async function GET(_: Request, { params }: { params: { type: string } }) {
  requireAdminSession();

  const exporter = exporters[params.type];

  if (!exporter) {
    return NextResponse.json({ error: "Export type not found" }, { status: 404 });
  }

  const data = await getFullExportData();
  const csv = toCsv(exporter(data));

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="nimio-levels-${params.type}.csv"`
    }
  });
}
