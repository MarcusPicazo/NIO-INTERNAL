"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMemberDashboard } from "@/lib/data";
import { fingerprintRequest } from "@/lib/security";
import { requireMemberSession } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { uploadOptionalFile } from "@/lib/storage";

const pointRequestSchema = z.object({
  project_id: z.string().uuid().optional().or(z.literal("")),
  project_name: z.string().max(160).optional(),
  activity: z.string().min(4).max(240),
  achievement_type: z.string().min(2).max(120),
  suggested_points: z.coerce.number().int().positive().max(10000),
  evidence_url: z.string().url().optional().or(z.literal("")),
  comment: z.string().max(1000).optional()
});

export async function submitPointRequestAction(formData: FormData) {
  const session = requireMemberSession();
  const parsedResult = pointRequestSchema.safeParse({
    project_id: formData.get("project_id"),
    project_name: formData.get("project_name"),
    activity: formData.get("activity"),
    achievement_type: formData.get("achievement_type"),
    suggested_points: formData.get("suggested_points"),
    evidence_url: formData.get("evidence_url"),
    comment: formData.get("comment")
  });

  if (!parsedResult.success) {
    redirect("/member?error=request-invalid#point-request");
  }

  const parsed = parsedResult.data;

  const file = formData.get("evidence_file");
  let fileUrl: string | null = null;

  try {
    fileUrl = file instanceof File ? await uploadOptionalFile(file, "evidence", session.memberId) : null;
  } catch {
    redirect("/member?error=evidence-upload-failed#point-request");
  }

  const hasEvidence = Boolean(parsed.evidence_url || fileUrl || parsed.comment);

  if (!hasEvidence) {
    redirect("/member?error=evidence-required#point-request");
  }

  const supabase = createSupabaseAdmin();
  const fingerprint = fingerprintRequest([
    session.memberId,
    parsed.project_id,
    parsed.project_name,
    parsed.activity,
    parsed.evidence_url || fileUrl
  ]);

  const { error } = await supabase.from("point_requests").insert({
    member_id: session.memberId,
    project_id: parsed.project_id || null,
    project_name: parsed.project_name || null,
    activity: parsed.activity,
    achievement_type: parsed.achievement_type,
    suggested_points: parsed.suggested_points,
    evidence_url: parsed.evidence_url || fileUrl,
    comment: parsed.comment || null,
    request_fingerprint: fingerprint,
    status: "pending_review"
  });

  if (error) {
    redirect(`/member?error=${error.code === "23505" ? "duplicate-request" : "request-failed"}#point-request`);
  }

  revalidatePath("/member");
  redirect("/member?notice=points-requested#point-request");
}

export async function requestRedemptionAction(formData: FormData) {
  const session = requireMemberSession();
  const rewardId = String(formData.get("reward_id") || "");

  if (!rewardId) {
    redirect("/member?error=missing-reward");
  }

  const dashboard = await getMemberDashboard(session.memberId);
  const reward = dashboard.rewards.find((item) => item.id === rewardId);

  if (!reward) {
    redirect("/member?error=reward-unavailable");
  }

  if (Number(reward.points_required) > Number(dashboard.profile.available_points)) {
    redirect("/member?error=reward-unavailable");
  }

  const supabase = createSupabaseAdmin();

  if (reward.monthly_limit_per_member) {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const { count, error: monthlyLimitError } = await supabase
      .from("redemption_requests")
      .select("id", { count: "exact", head: true })
      .eq("member_id", session.memberId)
      .eq("reward_id", rewardId)
      .in("status", ["pending", "approved", "paid"])
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", nextMonthStart.toISOString());

    if (monthlyLimitError) {
      redirect("/member?error=redemption-failed");
    }

    if ((count || 0) >= reward.monthly_limit_per_member) {
      redirect("/member?error=redemption-monthly-limit");
    }
  }

  const { data: existingRedemption, error: existingError } = await supabase
    .from("redemption_requests")
    .select("id")
    .eq("member_id", session.memberId)
    .eq("reward_id", rewardId)
    .in("status", ["pending", "approved"])
    .limit(1)
    .maybeSingle();

  if (existingError) {
    redirect("/member?error=redemption-failed");
  }

  if (existingRedemption) {
    redirect("/member?error=redemption-already-open");
  }

  const { error } = await supabase.from("redemption_requests").insert({
    member_id: session.memberId,
    reward_id: rewardId,
    points_snapshot: reward.points_required,
    value_mxn_snapshot: reward.value_mxn,
    status: "pending",
    member_comment: String(formData.get("member_comment") || "") || null
  });

  if (error) {
    redirect("/member?error=redemption-failed");
  }

  revalidatePath("/member");
  redirect("/member?notice=redemption-requested");
}
