// Garde-fou : les tests (qui créent, modifient et suppriment des données,
// consomment des numéros de facture) et le seed (qui réinitialise le mot de
// passe admin) ne doivent jamais tourner contre la base de production.
// Seule une base sur cette machine est acceptée. Volontairement sans
// variable de contournement.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLocalDatabaseUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  // Paramètre host (socket Unix) : pg retient le dernier, on les exige tous locaux.
  const socketHosts = parsed.searchParams.getAll("host");
  if (socketHosts.length) return socketHosts.every((host) => host.startsWith("/"));
  // Hôte vide : pg se rabat sur PGHOST, qui doit alors être local lui aussi.
  if (parsed.hostname === "") return !process.env.PGHOST || process.env.PGHOST.startsWith("/") || LOCAL_HOSTS.has(process.env.PGHOST);
  return LOCAL_HOSTS.has(parsed.hostname);
}

export function assertLocalDatabase(url: string | undefined, usage: string): void {
  if (url && isLocalDatabaseUrl(url)) return;
  throw new Error(
    `${usage} refusé : DATABASE_URL ne pointe pas sur une base locale (localhost). ` +
      "Les tests et le seed écrivent dans la base : jamais contre la production. " +
      "Voir CLAUDE.md, section « Avant de développer ».",
  );
}
