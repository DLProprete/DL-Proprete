import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seal, unseal } from "./secret-box";

let previous: string | undefined;
beforeEach(() => {
  previous = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "secret-de-test-assez-long";
});
afterEach(() => {
  process.env.BETTER_AUTH_SECRET = previous;
});

describe("seal / unseal", () => {
  it("aller-retour, sans le clair dans le résultat", () => {
    const sealed = seal("JBSWY3DPEHPK3PXP", "totp");
    expect(sealed).not.toContain("JBSWY3DPEHPK3PXP");
    expect(unseal(sealed, "totp")).toBe("JBSWY3DPEHPK3PXP");
  });

  it("refuse un autre usage ou une autre clé", () => {
    const sealed = seal("JBSWY3DPEHPK3PXP", "totp");
    expect(() => unseal(sealed, "autre")).toThrow();
    process.env.BETTER_AUTH_SECRET = "une-autre-cle";
    expect(() => unseal(sealed, "totp")).toThrow();
  });
});
