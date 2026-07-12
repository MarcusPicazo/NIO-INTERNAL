import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_: Request, { params }: { params: { bucket: string; path: string[] } }) {
  const session = getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const objectPath = params.path.join("/");

  if (params.bucket === "evidence" && session.role === "member" && !objectPath.startsWith(`${session.memberId}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["evidence", "avatars", "reward-images"].includes(params.bucket)) {
    return NextResponse.json({ error: "Bucket not allowed" }, { status: 404 });
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage.from(params.bucket).createSignedUrl(objectPath, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  redirect(data.signedUrl);
}
