import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeLoginAttempt, RateLimitedError } from "./rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("consumeLoginAttempt", () => {
  it("autorise jusqu'à 5 tentatives puis bloque la 6e", () => {
    const key = "1.2.3.4";
    for (let i = 0; i < 5; i += 1) {
      expect(() => consumeLoginAttempt(key)).not.toThrow();
    }
    expect(() => consumeLoginAttempt(key)).toThrow(RateLimitedError);
  });

  it("réautorise une fois la fenêtre de 15 minutes écoulée", () => {
    const key = "5.6.7.8";
    for (let i = 0; i < 5; i += 1) {
      consumeLoginAttempt(key);
    }
    expect(() => consumeLoginAttempt(key)).toThrow(RateLimitedError);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    expect(() => consumeLoginAttempt(key)).not.toThrow();
  });

  it("ne mélange pas les compteurs de deux clés différentes", () => {
    for (let i = 0; i < 5; i += 1) {
      consumeLoginAttempt("a");
    }
    expect(() => consumeLoginAttempt("a")).toThrow(RateLimitedError);
    expect(() => consumeLoginAttempt("b")).not.toThrow();
  });
});
