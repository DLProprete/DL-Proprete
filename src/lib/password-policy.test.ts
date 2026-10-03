import { describe, expect, it } from "vitest";
import { passwordSchema } from "./password-policy";

describe("passwordSchema", () => {
  it("refuse moins de 12 caractères", () => {
    expect(passwordSchema.safeParse("changeme123").success).toBe(false);
  });

  it("accepte un mot de passe généré par un trousseau", () => {
    expect(passwordSchema.safeParse("vupdoz-7rykqe-Sefgob").success).toBe(true);
  });

  it("refuse plus de 128 caractères", () => {
    expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});
