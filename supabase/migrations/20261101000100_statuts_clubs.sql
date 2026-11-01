-- =====================================================================
-- Procédure de vérification des clubs : deux nouveaux statuts.
--
--   draft             : dossier en préparation (le club complète ses
--                       informations et dépose ses documents) ;
--   changes_requested : l'équipe Tribune a demandé des compléments.
--
-- L'inscription d'un club ne donne plus de droit tout de suite : elle ouvre
-- un dossier, que le club envoie ensuite en vérification.
--
-- Fichier séparé : une nouvelle valeur d'énumération ne peut pas servir
-- dans la transaction qui la crée.
-- =====================================================================
alter type public.club_status add value if not exists 'draft' before 'pending';
alter type public.club_status add value if not exists 'changes_requested' after 'pending';
