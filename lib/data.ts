import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { AdminData, MemberProfile } from "@/lib/types";

export async function getMemberDashboard(memberId: string) {
  const supabase = createSupabaseAdmin();

  const [
    profileResult,
    levelsResult,
    movementsResult,
    requestsResult,
    rewardsResult,
    redemptionsResult,
    projectsResult
  ] = await Promise.all([
    supabase.from("member_profiles").select("*").eq("id", memberId).single(),
    supabase.from("levels").select("*").order("rank"),
    supabase
      .from("point_movements")
      .select("*, projects(name)")
      .eq("member_id", memberId)
      .order("occurred_at", { ascending: false })
      .limit(12),
    supabase
      .from("point_requests")
      .select("*, projects(name)")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("rewards").select("*").eq("is_active", true).order("points_required"),
    supabase
      .from("redemption_requests")
      .select("*, rewards(name, reward_type, points_required, value_mxn)")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("projects").select("*").eq("is_active", true).order("name")
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  return {
    profile: profileResult.data as MemberProfile,
    levels: levelsResult.data || [],
    movements: movementsResult.data || [],
    requests: requestsResult.data || [],
    rewards: rewardsResult.data || [],
    redemptions: redemptionsResult.data || [],
    projects: projectsResult.data || []
  };
}

export async function getAdminDashboard(): Promise<AdminData> {
  const supabase = createSupabaseAdmin();

  const [members, requests, movements, redemptions, rewards, levels, projects, audits, settings] =
    await Promise.all([
      supabase.from("member_profiles").select("*").order("full_name"),
      supabase
        .from("point_requests")
        .select("*, members(full_name), projects(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("point_movements")
        .select("*, members(full_name), projects(name)")
        .order("occurred_at", { ascending: false })
        .limit(150),
      supabase
        .from("redemption_requests")
        .select("*, members(full_name), rewards(name, reward_type, points_required, value_mxn)")
        .order("created_at", { ascending: false }),
      supabase.from("rewards").select("*").order("points_required"),
      supabase.from("levels").select("*").order("rank"),
      supabase.from("projects").select("*").order("name"),
      supabase
        .from("admin_audit_logs")
        .select("*, admins(display_name)")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase.from("system_settings").select("*").order("key")
    ]);

  for (const result of [members, requests, movements, redemptions, rewards, levels, projects, audits, settings]) {
    if (result.error) {
      throw result.error;
    }
  }

  return {
    members: (members.data || []) as MemberProfile[],
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

export async function getPrintMemberMovements(memberId: string) {
  const supabase = createSupabaseAdmin();
  const [member, movements] = await Promise.all([
    supabase.from("member_profiles").select("*").eq("id", memberId).single(),
    supabase
      .from("point_movements")
      .select("*, projects(name)")
      .eq("member_id", memberId)
      .order("occurred_at", { ascending: false })
  ]);

  if (member.error) {
    throw member.error;
  }

  if (movements.error) {
    throw movements.error;
  }

  return {
    member: member.data as MemberProfile,
    movements: movements.data || []
  };
}
