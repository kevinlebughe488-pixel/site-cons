import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncContribution } from "@/lib/payments/service";

// État d'une contribution, pour la page de suivi. Ne répond qu'au supporter
// concerné (ou à l'équipe) : la lecture passe par les règles RLS.
export async function GET(_request: Request, ctx: RouteContext<"/api/contributions/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const supabase = await createClient();
  const { data: row } = await supabase.from("contributions").select("id, status").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let status: string = row.status;
  if (status === "initiated" || status === "pending") {
    try {
      status = (await syncContribution(id))?.status ?? status;
    } catch {
      // passerelle momentanément injoignable
    }
  }
  return NextResponse.json({ status, open: status === "initiated" || status === "pending" }, { headers: { "Cache-Control": "no-store" } });
}
