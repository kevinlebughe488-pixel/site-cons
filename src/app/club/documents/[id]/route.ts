import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Document du dossier d'un club. Le fichier est dans un bucket privé : il n'est
// servi qu'aux membres du club et à l'équipe Tribune (la lecture de la ligne
// passe par les règles RLS), jamais mis en cache, et toujours avec son type
// vérifié à l'envoi.
export async function GET(_request: Request, ctx: RouteContext<"/club/documents/[id]">) {
  const { id } = await ctx.params;
  const viewer = await getViewer();
  // Après la connexion, on revient sur ce document (lien ouvert depuis le back-office ou l'espace club).
  if (!viewer) return NextResponse.redirect(new URL(`/connexion?suite=${encodeURIComponent(`/club/documents/${id}`)}`, _request.url));
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Document introuvable.", { status: 404 });

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("club_documents")
    .select("file_path, file_name, mime_type")
    .eq("id", id)
    .maybeSingle<{ file_path: string; file_name: string; mime_type: string }>();
  if (!doc) return new NextResponse("Document introuvable.", { status: 404 });

  const { data: file, error } = await createAdminClient().storage.from("club-documents").download(doc.file_path);
  if (error || !file) return new NextResponse("Document indisponible pour le moment.", { status: 502 });

  const ascii = doc.file_name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new NextResponse(file.stream(), {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
