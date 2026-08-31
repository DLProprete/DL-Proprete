import { beforeEach, describe, expect, it } from "vitest";
import { clearPending, readPending, writePending } from "./clock-queue";

// vitest.config.ts tourne en environment "node" (pas de DOM) : mock minimal
// de localStorage, suffisant pour ce module qui n'utilise que get/set/remove.
function installLocalStorageMock() {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe("clock-queue", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it("aucune action en attente au départ", () => {
    expect(readPending()).toBeNull();
  });

  it("écrit puis relit une action", () => {
    writePending({ kind: "start", targetId: "shift-1", queuedAt: "2026-08-31T06:00:00Z" });
    expect(readPending()).toEqual({
      kind: "start",
      targetId: "shift-1",
      queuedAt: "2026-08-31T06:00:00Z",
    });
  });

  it("clearPending vide la file", () => {
    writePending({ kind: "end", targetId: "entry-1", queuedAt: "2026-08-31T08:00:00Z" });
    clearPending();
    expect(readPending()).toBeNull();
  });

  it("une nouvelle action remplace la précédente (capacité 1)", () => {
    writePending({ kind: "start", targetId: "shift-1", queuedAt: "2026-08-31T06:00:00Z" });
    writePending({ kind: "start", targetId: "shift-2", queuedAt: "2026-08-31T06:05:00Z" });
    expect(readPending()?.targetId).toBe("shift-2");
  });
});
