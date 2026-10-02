import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mailFromAddress } from "@/lib/email";
import { alertSettingsSchema } from "@/lib/zod/alert-settings";
import { alertRecipient } from "@/server/errors/report";
import { getCompanyProfile } from "./queries";

describe("alertSettingsSchema", () => {
  it("vide = retour à la variable d'environnement, sinon valeurs valides seulement", () => {
    expect(alertSettingsSchema.parse({ errorAlertEmail: " ", mailFromName: "" })).toEqual({ errorAlertEmail: null, mailFromName: null });
    expect(alertSettingsSchema.parse({ errorAlertEmail: "a@b.fr", mailFromName: "DL Propreté" })).toEqual({
      errorAlertEmail: "a@b.fr",
      mailFromName: "DL Propreté",
    });
    expect(alertSettingsSchema.safeParse({ errorAlertEmail: "pas-une-adresse", mailFromName: "" }).success).toBe(false);
    expect(alertSettingsSchema.safeParse({ errorAlertEmail: "", mailFromName: 'X" <pirate@x.fr>' }).success).toBe(false);
    expect(alertSettingsSchema.safeParse({ errorAlertEmail: "", mailFromName: "DL\r\nBcc: x@y.fr" }).success).toBe(false);
  });
});

// Intégration : la fiche entreprise locale est modifiée puis restaurée.
describe("réglages lus en base, variable d'environnement en secours", () => {
  let saved: { errorAlertEmail: string | null; mailFromName: string | null };
  const envAlert = process.env.ERROR_ALERT_EMAIL;
  const envUser = process.env.SMTP_USER;

  beforeAll(async () => {
    const profile = await getCompanyProfile();
    saved = { errorAlertEmail: profile.errorAlertEmail, mailFromName: profile.mailFromName };
    process.env.ERROR_ALERT_EMAIL = "env@example.test";
    process.env.SMTP_USER = "contact@dlproprete.fr";
  });
  afterAll(async () => {
    await prisma.companyProfile.update({ where: { id: "default" }, data: saved });
    if (envAlert === undefined) delete process.env.ERROR_ALERT_EMAIL;
    else process.env.ERROR_ALERT_EMAIL = envAlert;
    if (envUser === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = envUser;
  });

  it("la valeur réglée dans l'app l'emporte, la vider rend la main à la variable", async () => {
    await prisma.companyProfile.update({ where: { id: "default" }, data: { errorAlertEmail: "app@example.test", mailFromName: "DL Propreté Caen" } });
    expect(await alertRecipient()).toBe("app@example.test");
    expect(await mailFromAddress()).toBe('"DL Propreté Caen" <contact@dlproprete.fr>');

    await prisma.companyProfile.update({ where: { id: "default" }, data: { errorAlertEmail: null, mailFromName: null } });
    expect(await alertRecipient()).toBe("env@example.test");
    expect(await mailFromAddress()).not.toContain("DL Propreté Caen");
  });
});
