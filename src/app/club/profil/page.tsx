import type { Metadata } from "next";
import { requireClubSpace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClubDocument, ClubPrivate } from "@/lib/types";
import { ClubProfileView } from "./ClubProfileView";

export const metadata: Metadata = { title: "Profil du club" };

export default async function ClubProfilePage() {
  const { club } = await requireClubSpace("/club/profil");
  const supabase = await createClient();
  const [{ data: privData }, { data: docData }] = await Promise.all([
    supabase.from("club_private").select("*").eq("club_id", club.id).maybeSingle<ClubPrivate>(),
    supabase.from("club_documents").select("id, club_id, kind, file_name, mime_type, size_bytes, created_at").eq("club_id", club.id).order("created_at"),
  ]);
  const priv = privData ?? null;
  const docs = (docData ?? []) as ClubDocument[];
  return <ClubProfileView club={club} priv={priv} docs={docs} />;
}
