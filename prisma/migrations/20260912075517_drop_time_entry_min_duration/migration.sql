-- Le pointage agent n'a plus qu'un seul geste ("Terminer") : clockInAt
-- devient une recopie de l'heure prévue du shift, jamais une heure
-- d'arrivée réelle. La contrainte ci-dessous supposait clockOutAt réel
-- >= clockInAt réel + 5 min (garde-fou anti double-tap) ; elle se
-- déclencherait en usage tout à fait normal désormais.
ALTER TABLE "TimeEntry" DROP CONSTRAINT IF EXISTS "TimeEntry_min_duration";

-- Nettoyage : cet index ne sert plus, seul l'ancien startTimeEntry
-- (supprimé) produisait des lignes status = 'OPEN'.
DROP INDEX IF EXISTS "uniq_open_time_entry";
