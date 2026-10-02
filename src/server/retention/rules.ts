// Durées de conservation (RGPD art. 5.1.e). Valeurs par défaut et planchers
// légaux ici ; l'admin peut allonger ou raccourcir (au-dessus du plancher)
// depuis /settings, la valeur modifiée est stockée dans RetentionSetting.
// Sources et procédure : docs/CONSERVATION.md.
//
// Jamais purgé automatiquement : factures émises (10 ans, et « pas de
// suppression »), clients, sites, contrats, archives numérisées, comptes
// salariés (anonymisation à prévoir, 5 ans après le départ).
export const RETENTION_RULES = [
  {
    key: "absenceDocuments",
    label: "Justificatifs d'absence (fichier)",
    detail: "Le fichier est supprimé ; l'absence (type, dates) reste.",
    from: "après la fin de l'absence",
    defaultMonths: 12,
    minMonths: 1,
  },
  {
    key: "absences",
    label: "Absences (type et dates)",
    detail: "Prescription des salaires : 3 ans (C. trav. L3245-1).",
    from: "après la fin de l'absence",
    defaultMonths: 36,
    minMonths: 12,
  },
  {
    key: "timeTracking",
    label: "Planning nominatif et pointages",
    detail: "Minimum légal 1 an (C. trav. D3171-16) ; 3 ans comme les horodatages du contrat RGPD (L3245-1).",
    from: "après la date de la vacation ou du pointage",
    defaultMonths: 36,
    minMonths: 12,
  },
  {
    key: "siteLogPhotos",
    label: "Photos de main courante",
    detail: "La photo est supprimée ; le texte de l'entrée reste.",
    from: "après la prise de vue",
    defaultMonths: 12,
    minMonths: 1,
  },
  {
    key: "siteLogs",
    label: "Main courante et points agents (texte)",
    detail: "Entrées de main courante et points d'échange agent-site.",
    from: "après l'entrée",
    defaultMonths: 36,
    minMonths: 1,
  },
  {
    key: "prospects",
    label: "Prospects non convertis et leurs devis",
    detail: "CNIL : 3 ans après le dernier contact. Un prospect devenu client ou un devis signé n'est jamais purgé.",
    from: "après la dernière mise à jour (prospect ou devis)",
    defaultMonths: 36,
    minMonths: 1,
  },
  {
    key: "activityLogs",
    label: "Journal d'activité (qui a fait quoi)",
    detail: "Historique métier : validations, factures, signatures. 5 ans = prescription commerciale (C. com. L110-4). L'historique des purges et des durées n'est jamais purgé (preuve de conformité).",
    from: "après l'action",
    defaultMonths: 60,
    minMonths: 12,
  },
  {
    key: "errorLogs",
    label: "Journal des erreurs serveur",
    detail: "Trace technique. CNIL (délibération 2021-122) : 6 mois à 1 an.",
    from: "après l'erreur",
    defaultMonths: 12,
    minMonths: 6,
  },
] as const;

// Jamais purgées : preuve de ce qui a été effacé et selon quelles durées (RGPD art. 5.2).
export const KEPT_AUDIT_ACTIONS = ["RETENTION_PURGE", "RETENTION_UPDATED"];

export type RetentionKey = (typeof RETENTION_RULES)[number]["key"];
export type RetentionMonths = Record<RetentionKey, number>;

// Sessions et liens d'accès expirés : purement technique, non réglable.
export const EXPIRED_ACCESS_GRACE_DAYS = 30;
export const RETENTION_MAX_MONTHS = 240;

export function ruleFor(key: string) {
  return RETENTION_RULES.find((rule) => rule.key === key);
}
