import { describe, expect, it } from "vitest";
import { getMailboxConfig } from "./config";

describe("getMailboxConfig", () => {
  it("retourne null sans identifiants", () => {
    expect(getMailboxConfig({})).toBeNull();
  });

  it("réutilise SMTP_USER et SMTP_PASSWORD", () => {
    expect(
      getMailboxConfig({
        SMTP_USER: "contact@dlproprete.fr",
        SMTP_PASSWORD: "secret",
      }),
    ).toEqual({
      host: "imap.mail.ovh.net",
      port: 993,
      user: "contact@dlproprete.fr",
      password: "secret",
    });
  });
});
