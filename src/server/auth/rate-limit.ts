const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export class RateLimitedError extends Error {}

// ponytail: compteur en mémoire par process — repart à zéro au redémarrage
// et n'est pas partagé entre instances. Suffisant pour un déploiement mono-
// instance (16 agents) ; passer à un store partagé (Redis) si multi-instance.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function consumeLoginAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    throw new RateLimitedError("Trop de tentatives, réessayez plus tard.");
  }

  entry.count += 1;
}
