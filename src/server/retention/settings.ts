import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { RETENTION_MAX_MONTHS, RETENTION_RULES } from "./rules";
import { getRetentionMonths } from "./purge";

// Plancher légal par règle : on ne descend jamais en dessous.
export const retentionSettingsSchema = z.object(
  Object.fromEntries(
    RETENTION_RULES.map((rule) => [
      rule.key,
      // Champ vide refusé : z.coerce le transformerait en 0 et tout partirait la nuit suivante.
      z.preprocess(
        (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
        z.coerce
          .number({ error: `${rule.label} : durée requise.` })
          .int(`${rule.label} : durée en mois entiers.`)
          .min(rule.minMonths, `${rule.label} : ${rule.minMonths} mois minimum.`)
          .max(RETENTION_MAX_MONTHS, `${rule.label} : ${RETENTION_MAX_MONTHS} mois maximum.`),
      ),
    ]),
  ),
);

export async function updateRetentionSettings(user: SessionUser, input: unknown) {
  requireRole(user, ["ADMIN"]);
  const data = retentionSettingsSchema.parse(input) as Record<string, number>;
  const before = await getRetentionMonths();
  const changes = RETENTION_RULES.filter((rule) => before[rule.key] !== data[rule.key]);
  if (changes.length === 0) return;
  await prisma.$transaction(async (tx) => {
    for (const rule of changes) {
      await tx.retentionSetting.upsert({
        where: { key: rule.key },
        update: { months: data[rule.key] },
        create: { key: rule.key, months: data[rule.key] },
      });
    }
    await logAudit(tx, {
      actorUserId: user.id,
      action: "RETENTION_UPDATED",
      entityType: "Retention",
      entityId: "-",
      summary: changes.map((rule) => `${rule.label} : ${before[rule.key]} → ${data[rule.key]} mois`).join(" ; "),
    });
  });
}
