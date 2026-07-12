"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateAccessCode, normalizeAccessCode } from "@/lib/security";
import { requireAdminSession } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { uploadOptionalFile } from "@/lib/storage";

async function audit(adminId: string, action: string, entityType: string, entityId: string | null, details: any) {
  const supabase = createSupabaseAdmin();
  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details
  });
}

const memberSchema = z.object({
  full_name: z.string().min(2).max(160),
  area: z.string().max(120).optional(),
  role_title: z.string().max(120).optional(),
  email: z.string().email().optional().or(z.literal("")),
  access_code: z.string().min(6).max(40),
  private_notes: z.string().max(1000).optional()
});

export async function createMemberAction(formData: FormData) {
  const session = requireAdminSession();
  const parsedResult = memberSchema.safeParse({
    full_name: formData.get("full_name"),
    area: formData.get("area"),
    role_title: formData.get("role_title"),
    email: formData.get("email"),
    access_code: formData.get("access_code"),
    private_notes: formData.get("private_notes")
  });

  if (!parsedResult.success) {
    redirect("/admin?error=member-invalid#members");
  }

  const parsed = parsedResult.data;
  const supabase = createSupabaseAdmin();
  const { data: member, error } = await supabase
    .from("members")
    .insert({
      full_name: parsed.full_name,
      area: parsed.area || null,
      role_title: parsed.role_title || null,
      email: parsed.email || null,
      private_notes: parsed.private_notes || null,
      status: "active"
    })
    .select("id")
    .single();

  if (error || !member) {
    redirect("/admin?error=member-create-failed#members");
  }

  const code = normalizeAccessCode(parsed.access_code || generateAccessCode(parsed.full_name));
  const { error: codeError } = await supabase.rpc("admin_issue_access_code", {
    p_member_id: member.id,
    p_raw_code: code,
    p_admin_id: session.adminId
  });

  if (codeError) {
    await supabase.from("members").delete().eq("id", member.id);
    redirect("/admin?error=code-create-failed#members");
  }

  await audit(session.adminId, "member_created", "member", member.id, { full_name: parsed.full_name });
  revalidatePath("/admin");
  redirect("/admin?notice=member-created#members");
}

export async function updateMemberStatusAction(formData: FormData) {
  const session = requireAdminSession();
  const memberId = String(formData.get("member_id") || "");
  const status = String(formData.get("status") || "");
  const confirmText = String(formData.get("confirm_text") || "");

  if (!["active", "inactive", "blocked", "deleted"].includes(status)) {
    redirect("/admin?error=invalid-status#members");
  }

  if (status === "deleted" && confirmText !== "ELIMINAR") {
    redirect("/admin?error=delete-confirmation-required#members");
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("members").update({ status }).eq("id", memberId);

  if (error) {
    redirect("/admin?error=member-status-failed#members");
  }

  await audit(session.adminId, "member_status_updated", "member", memberId, { status });
  revalidatePath("/admin");
  redirect("/admin?notice=member-updated#members");
}

export async function regenerateAccessCodeAction(formData: FormData) {
  const session = requireAdminSession();
  const memberId = String(formData.get("member_id") || "");
  const rawCode = normalizeAccessCode(String(formData.get("access_code") || ""));

  if (!rawCode) {
    redirect("/admin?error=missing-code#members");
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.rpc("admin_issue_access_code", {
    p_member_id: memberId,
    p_raw_code: rawCode,
    p_admin_id: session.adminId
  });

  if (error) {
    redirect("/admin?error=code-regenerate-failed#members");
  }

  await audit(session.adminId, "access_code_regenerated", "member", memberId, {});
  revalidatePath("/admin");
  redirect("/admin?notice=code-regenerated#members");
}

const movementSchema = z.object({
  member_id: z.string().uuid(),
  project_id: z.string().uuid().optional().or(z.literal("")),
  movement_type: z.string().min(2),
  points: z.coerce.number().int(),
  reason: z.string().min(3).max(600),
  evidence_url: z.string().url().optional().or(z.literal("")),
  comment: z.string().max(1000).optional()
});

export async function createManualMovementAction(formData: FormData) {
  const session = requireAdminSession();
  const parsedResult = movementSchema.safeParse({
    member_id: formData.get("member_id"),
    project_id: formData.get("project_id"),
    movement_type: formData.get("movement_type"),
    points: formData.get("points"),
    reason: formData.get("reason"),
    evidence_url: formData.get("evidence_url"),
    comment: formData.get("comment")
  });

  if (!parsedResult.success) {
    redirect("/admin?error=movement-invalid#movements");
  }

  const parsed = parsedResult.data;

  if (parsed.points === 0 || (parsed.points < 0 && parsed.reason.trim().length < 3)) {
    redirect("/admin?error=movement-reason-required#movements");
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("point_movements")
    .insert({
      member_id: parsed.member_id,
      project_id: parsed.project_id || null,
      movement_type: parsed.points < 0 ? "points_deducted" : parsed.movement_type,
      points: parsed.points,
      reason: parsed.reason,
      evidence_url: parsed.evidence_url || null,
      status: "approved",
      approved_by_admin_id: session.adminId,
      comment: parsed.comment || null
    })
    .select("id")
    .single();

  if (error) {
    redirect("/admin?error=movement-create-failed#movements");
  }

  await audit(session.adminId, "manual_movement_created", "point_movement", data?.id || null, parsed);
  revalidatePath("/admin");
  redirect("/admin?notice=movement-created#movements");
}

export async function reviewPointRequestAction(formData: FormData) {
  const session = requireAdminSession();
  const requestId = String(formData.get("request_id") || "");
  const decision = String(formData.get("decision") || "");
  const approvedPoints = Number(formData.get("approved_points") || 0);
  const comment = String(formData.get("admin_comment") || "");

  const supabase = createSupabaseAdmin();
  const { data: currentRequest, error: currentRequestError } = await supabase
    .from("point_requests")
    .select("status")
    .eq("id", requestId)
    .single();

  if (currentRequestError || !currentRequest) {
    redirect("/admin?error=request-not-found#point-requests");
  }

  if (["approved", "approved_adjusted", "rejected"].includes(currentRequest.status)) {
    redirect("/admin?notice=request-already-resolved#point-requests");
  }

  if (decision === "approve") {
    if (!Number.isFinite(approvedPoints) || approvedPoints <= 0) {
      redirect("/admin?error=request-invalid-points#point-requests");
    }

    const { error } = await supabase.rpc("admin_resolve_point_request", {
      p_request_id: requestId,
      p_admin_id: session.adminId,
      p_status: "approved",
      p_approved_points: approvedPoints,
      p_admin_comment: comment || null
    });

    if (error) {
      console.error("Point request approval failed", error);
      redirect("/admin?error=request-approve-failed#point-requests");
    }
  } else {
    const statusMap: Record<string, string> = {
      review: "in_review",
      reject: "rejected",
      evidence: "needs_more_evidence"
    };
    const status = statusMap[decision];

    if (!status) {
      redirect("/admin?error=request-invalid-decision#point-requests");
    }

    const { error } = await supabase
      .from("point_requests")
      .update({
        status,
        admin_comment: comment || null,
        reviewed_by_admin_id: session.adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (error) {
      redirect("/admin?error=request-review-failed#point-requests");
    }
  }

  await audit(session.adminId, "point_request_reviewed", "point_request", requestId, {
    decision,
    approved_points: approvedPoints
  });
  revalidatePath("/admin");
  redirect("/admin?notice=request-reviewed#point-requests");
}

const rewardSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  reward_type: z.string().min(2).max(80),
  points_required: z.coerce.number().int().positive(),
  value_mxn: z.coerce.number().nonnegative(),
  monthly_limit_per_member: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().positive().optional()
  )
});

export async function createRewardAction(formData: FormData) {
  const session = requireAdminSession();
  const parsedResult = rewardSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    reward_type: formData.get("reward_type"),
    points_required: formData.get("points_required"),
    value_mxn: formData.get("value_mxn"),
    monthly_limit_per_member: formData.get("monthly_limit_per_member")
  });

  if (!parsedResult.success) {
    redirect("/admin?error=reward-invalid#rewards");
  }

  const parsed = parsedResult.data;
  const image = formData.get("image");
  let imageUrl: string | null = null;

  try {
    imageUrl = image instanceof File ? await uploadOptionalFile(image, "reward-images", "rewards") : null;
  } catch {
    redirect("/admin?error=reward-image-failed#rewards");
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("rewards")
    .insert({
      ...parsed,
      monthly_limit_per_member: parsed.monthly_limit_per_member || null,
      image_url: imageUrl,
      is_active: true
    })
    .select("id")
    .single();

  if (error) {
    redirect("/admin?error=reward-create-failed#rewards");
  }

  await audit(session.adminId, "reward_created", "reward", data?.id || null, parsed);
  revalidatePath("/admin");
  redirect("/admin?notice=reward-created#rewards");
}

export async function toggleRewardAction(formData: FormData) {
  const session = requireAdminSession();
  const rewardId = String(formData.get("reward_id") || "");
  const isActive = String(formData.get("is_active") || "") === "true";
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("rewards").update({ is_active: !isActive }).eq("id", rewardId);

  if (error) {
    redirect("/admin?error=reward-toggle-failed#rewards");
  }

  await audit(session.adminId, "reward_toggled", "reward", rewardId, { is_active: !isActive });
  revalidatePath("/admin");
  redirect("/admin?notice=reward-updated#rewards");
}

const levelSchema = z.object({
  name: z.string().min(2).max(120),
  rank: z.coerce.number().int().positive(),
  min_points: z.coerce.number().int().nonnegative(),
  max_points: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().int().nonnegative().optional()),
  message: z.string().max(500).optional()
});

export async function createLevelAction(formData: FormData) {
  const session = requireAdminSession();
  const parsedResult = levelSchema.safeParse({
    name: formData.get("name"),
    rank: formData.get("rank"),
    min_points: formData.get("min_points"),
    max_points: formData.get("max_points"),
    message: formData.get("message")
  });

  if (!parsedResult.success) {
    redirect("/admin?error=level-invalid#levels");
  }

  const parsed = parsedResult.data;
  const asset = formData.get("base_asset");
  let assetUrl: string | null = null;

  try {
    assetUrl = asset instanceof File ? await uploadOptionalFile(asset, "avatars", "levels") : null;
  } catch {
    redirect("/admin?error=level-asset-failed#levels");
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("levels")
    .insert({
      ...parsed,
      max_points: parsed.max_points || null,
      message: parsed.message || null,
      base_asset_url: assetUrl
    })
    .select("id")
    .single();

  if (error) {
    redirect("/admin?error=level-create-failed#levels");
  }

  await audit(session.adminId, "level_created", "level", data?.id || null, parsed);
  revalidatePath("/admin");
  redirect("/admin?notice=level-created#levels");
}

export async function uploadMemberAvatarAction(formData: FormData) {
  const session = requireAdminSession();
  const memberId = String(formData.get("member_id") || "");
  const file = formData.get("avatar");
  let avatarUrl: string | null = null;

  try {
    avatarUrl = file instanceof File ? await uploadOptionalFile(file, "avatars", `members/${memberId}`) : null;
  } catch {
    redirect("/admin?error=avatar-upload-failed#members");
  }

  if (!avatarUrl) {
    redirect("/admin?error=avatar-missing#members");
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("members").update({ custom_avatar_url: avatarUrl }).eq("id", memberId);

  if (error) {
    redirect("/admin?error=avatar-upload-failed#members");
  }

  await audit(session.adminId, "member_avatar_uploaded", "member", memberId, {});
  revalidatePath("/admin");
  redirect("/admin?notice=avatar-uploaded#members");
}

export async function uploadMemberLevelAssetAction(formData: FormData) {
  const session = requireAdminSession();
  const memberId = String(formData.get("member_id") || "");
  const levelId = String(formData.get("level_id") || "");
  const file = formData.get("asset");
  let assetUrl: string | null = null;

  try {
    assetUrl = file instanceof File ? await uploadOptionalFile(file, "avatars", `member-levels/${memberId}`) : null;
  } catch {
    redirect("/admin?error=asset-upload-failed#levels");
  }

  if (!assetUrl) {
    redirect("/admin?error=asset-missing#levels");
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("member_level_assets").upsert(
    {
      member_id: memberId,
      level_id: levelId,
      asset_url: assetUrl
    },
    { onConflict: "member_id,level_id" }
  );

  if (error) {
    redirect("/admin?error=asset-upload-failed#levels");
  }

  await audit(session.adminId, "member_level_asset_uploaded", "member_level_asset", memberId, { level_id: levelId });
  revalidatePath("/admin");
  redirect("/admin?notice=asset-uploaded#levels");
}

export async function reviewRedemptionAction(formData: FormData) {
  const session = requireAdminSession();
  const redemptionId = String(formData.get("redemption_id") || "");
  const decision = String(formData.get("decision") || "");
  const comment = String(formData.get("admin_comment") || "");
  const supabase = createSupabaseAdmin();
  const { data: currentRedemption, error: currentRedemptionError } = await supabase
    .from("redemption_requests")
    .select("status")
    .eq("id", redemptionId)
    .single();

  if (currentRedemptionError || !currentRedemption) {
    redirect("/admin?error=redemption-not-found#redemptions");
  }

  if (currentRedemption.status !== "pending") {
    redirect("/admin?notice=redemption-already-resolved#redemptions");
  }

  if (decision === "approve") {
    const { error } = await supabase.rpc("admin_approve_redemption", {
      p_redemption_id: redemptionId,
      p_admin_id: session.adminId,
      p_admin_comment: comment || null
    });

    if (error) {
      console.error("Redemption approval failed", error);
      redirect("/admin?error=redemption-approve-failed#redemptions");
    }
  } else {
    const status = decision === "reject" ? "rejected" : "cancelled";
    const { error } = await supabase
      .from("redemption_requests")
      .update({
        status,
        admin_comment: comment || null,
        reviewed_by_admin_id: session.adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", redemptionId);

    if (error) {
      redirect("/admin?error=redemption-review-failed#redemptions");
    }
  }

  await audit(session.adminId, "redemption_reviewed", "redemption_request", redemptionId, { decision });
  revalidatePath("/admin");
  redirect("/admin?notice=redemption-reviewed#redemptions");
}

export async function markRedemptionPaidAction(formData: FormData) {
  const session = requireAdminSession();
  const redemptionId = String(formData.get("redemption_id") || "");
  const paymentProofUrl = String(formData.get("payment_proof_url") || "");
  const adminComment = String(formData.get("admin_comment") || "");
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("redemption_requests")
    .update({
      status: "paid",
      payment_proof_url: paymentProofUrl || null,
      admin_comment: adminComment || null,
      paid_at: new Date().toISOString()
    })
    .eq("id", redemptionId)
    .eq("status", "approved")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/admin?error=redemption-paid-failed#redemptions");
  }

  await audit(session.adminId, "redemption_paid", "redemption_request", redemptionId, {});
  revalidatePath("/admin");
  redirect("/admin?notice=redemption-paid#redemptions");
}

export async function createProjectAction(formData: FormData) {
  const session = requireAdminSession();
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    redirect("/admin?error=project-name-required#settings");
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("projects").insert({ name }).select("id").single();

  if (error) {
    redirect("/admin?error=project-create-failed#settings");
  }

  await audit(session.adminId, "project_created", "project", data?.id || null, { name });
  revalidatePath("/admin");
  redirect("/admin?notice=project-created#settings");
}

export async function updatePointValueAction(formData: FormData) {
  const session = requireAdminSession();
  const value = Number(formData.get("point_value_mxn") || 0);

  if (!Number.isFinite(value) || value < 0) {
    redirect("/admin?error=invalid-point-value#settings");
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("system_settings").upsert(
    {
      key: "point_value_mxn",
      value: { mxn: value },
      updated_by_admin_id: session.adminId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "key" }
  );

  if (error) {
    redirect("/admin?error=point-value-failed#settings");
  }

  await audit(session.adminId, "point_value_updated", "system_setting", "point_value_mxn", { mxn: value });
  revalidatePath("/admin");
  redirect("/admin?notice=point-value-updated#settings");
}
