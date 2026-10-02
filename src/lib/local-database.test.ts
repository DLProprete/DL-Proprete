import { describe, expect, it } from "vitest";
import { assertLocalDatabase, isLocalDatabaseUrl } from "./local-database";

describe("isLocalDatabaseUrl", () => {
  it("accepte une base locale, refuse une base distante", () => {
    expect(isLocalDatabaseUrl("postgresql://pierrenez@localhost:5432/dl_proprete")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://u:p@127.0.0.1/db?schema=public")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://u@[::1]:5432/db")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql:///db?host=/tmp")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://u:p@aws-0-eu-west-3.pooler.supabase.com:6543/postgres")).toBe(false);
    expect(isLocalDatabaseUrl("postgresql://u:p@localhost.evil.com/db")).toBe(false);
    expect(isLocalDatabaseUrl("postgresql://u@db/db?host=db.example.com")).toBe(false);
    expect(isLocalDatabaseUrl("pas une url")).toBe(false);
    expect(isLocalDatabaseUrl("postgresql://u@localhost/db?host=/tmp&host=db.example.com")).toBe(false);
  });

  it("hôte vide : dépend de PGHOST", () => {
    const saved = process.env.PGHOST;
    process.env.PGHOST = "db.example.com";
    expect(isLocalDatabaseUrl("postgresql:///db")).toBe(false);
    delete process.env.PGHOST;
    expect(isLocalDatabaseUrl("postgresql:///db")).toBe(true);
    if (saved !== undefined) process.env.PGHOST = saved;
  });

  it("assertLocalDatabase lève une erreur claire sans URL locale", () => {
    expect(() => assertLocalDatabase(undefined, "npm test")).toThrow(/npm test refusé/);
    expect(() => assertLocalDatabase("postgresql://u@db.supabase.co/postgres", "Seed")).toThrow(/base locale/);
    expect(() => assertLocalDatabase("postgresql://u@localhost/db", "Seed")).not.toThrow();
  });
});
