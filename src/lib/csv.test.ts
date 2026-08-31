import { describe, expect, it } from "vitest";
import { csvField } from "./csv";

describe("csvField", () => {
  it("échappe guillemets, point-virgule et retour à la ligne (RFC 4180)", () => {
    expect(csvField('a"b')).toBe('"a""b"');
    expect(csvField("a;b")).toBe('"a;b"');
    expect(csvField("a\nb")).toBe('"a\nb"');
    expect(csvField("simple")).toBe("simple");
  });

  it("neutralise un champ commençant par = + - @ (injection de formule Excel)", () => {
    expect(csvField("=cmd|'/c calc'!A1")).toBe("'=cmd|'/c calc'!A1");
    expect(csvField("+1")).toBe("'+1");
    expect(csvField("-1")).toBe("'-1");
    expect(csvField("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvField("Client normal")).toBe("Client normal");
  });
});
