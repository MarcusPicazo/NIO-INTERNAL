"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { clearAdminSession, clearMemberSession, setAdminSession, setMemberSession } from "@/lib/session";
import { isValidAdminToken, normalizeAccessCode } from "@/lib/security";

export async function memberLoginAction(formData: FormData) {
  const code = normalizeAccessCode(String(formData.get("code") || ""));

  if (!code) {
    redirect("/login?error=missing");
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("verify_member_access_code", {
    raw_code: code
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    redirect("/login?error=invalid");
  }

  const result = data[0] as {
    member_id: string;
    member_status: string;
    code_status: string;
  };

  if (result.code_status !== "active" || result.member_status !== "active") {
    redirect("/login?error=blocked");
  }

  setMemberSession(result.member_id);
  redirect("/member");
}

export async function adminLoginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/admin/login?error=invalid");
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("verify_admin_credentials", {
    p_email: email,
    p_password: password
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    redirect("/admin/login?error=invalid");
  }

  setAdminSession((data[0] as { admin_id: string }).admin_id);
  redirect("/admin");
}

export async function adminTokenFallbackAction(formData: FormData) {
  const token = String(formData.get("token") || "");

  if (!isValidAdminToken(token)) {
    redirect("/admin/login?error=invalid-token");
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("admins")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    redirect("/admin/setup");
  }

  setAdminSession(data.id);
  redirect("/admin");
}

const setupAdminSchema = z
  .object({
    display_name: z.string().min(2).max(160),
    email: z.string().email().max(220),
    password: z.string().min(10).max(200),
    confirm_password: z.string().min(10).max(200)
  })
  .refine((value) => value.password === value.confirm_password, {
    message: "Las contrasenas no coinciden.",
    path: ["confirm_password"]
  });

export async function setupInitialAdminAction(formData: FormData) {
  const parsed = setupAdminSchema.safeParse({
    display_name: formData.get("display_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password")
  });

  if (!parsed.success) {
    redirect("/admin/setup?error=invalid");
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("create_initial_owner_admin", {
    p_display_name: parsed.data.display_name,
    p_email: parsed.data.email.toLowerCase(),
    p_password: parsed.data.password
  });

  if (error || !data) {
    redirect("/admin/login?notice=setup-locked");
  }

  setAdminSession(data as string);
  redirect("/admin?notice=owner-created");
}

export async function logoutAction() {
  clearMemberSession();
  redirect("/login");
}

export async function adminLogoutAction() {
  clearAdminSession();
  redirect("/admin/login");
}
