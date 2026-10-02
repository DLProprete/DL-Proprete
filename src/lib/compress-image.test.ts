import { describe, expect, it } from "vitest";
import { fitWithin } from "./compress-image";

describe("fitWithin", () => {
  it("réduit le plus grand côté à la limite en gardant les proportions", () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("n'agrandit jamais une image déjà plus petite", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
