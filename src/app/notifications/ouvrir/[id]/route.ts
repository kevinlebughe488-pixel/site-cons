import { NextResponse } from "next/server";
import { getViewer, safeReturnPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Ouvre une notification : elle est marquée comme lue, puis on va à sa page.
// Le lien vient de la base (interne uniquement) et passe encore par safeReturnPath.
export async function GET(request: Request, ctx: RouteContext<"/notifications/ouvrir/[id]">) {
  const { id } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL("/connexion?suite=/notifications", request.url));
  if (!/^\d{1,18}$/.test(id)) return NextResponse.redirect(new URL("/notifications", request.url));

  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("link").eq("id", id).maybeSingle<{ link: string | null }>();
  if (data) await supabase.rpc("mark_notifications_read", { p_ids: [Number(id)] });
  return NextResponse.redirect(new URL(safeReturnPath(data?.link, "/notifications"), request.url));
}
