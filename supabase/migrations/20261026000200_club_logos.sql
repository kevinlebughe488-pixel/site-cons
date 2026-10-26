-- Logos des clubs : fichiers stockés dans Supabase Storage (bucket public « club-logos »).
-- L'envoi d'un logo passe par le serveur de l'application, qui vérifie que
-- l'utilisateur gère bien le club (ou fait partie de l'administration).

alter table public.clubs add column logo_path text check (char_length(logo_path) <= 200);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-logos', 'club-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
