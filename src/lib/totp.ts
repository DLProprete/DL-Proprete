import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// Codes à usage unique basés sur le temps (TOTP, RFC 6238) : HMAC-SHA1,
// 6 chiffres, pas de 30 secondes — le réglage par défaut de Google
// Authenticator, Authy, Microsoft Authenticator et du trousseau Apple.
const STEP_SECONDS = 30;
const DIGITS = 6;
// Tolérance d'un pas avant/après : horloge du téléphone un peu décalée.
const WINDOW = 1;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Secret base32 invalide.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// 20 octets = 160 bits, la taille recommandée pour HMAC-SHA1.
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function stepAt(date: Date): number {
  return Math.floor(date.getTime() / 1000 / STEP_SECONDS);
}

export function totpCode(secret: string, step: number, digits = DIGITS): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, "0");
}

// Renvoie le pas de temps du code accepté, ou null. lastUsedStep : un code
// déjà accepté (ou plus ancien) est refusé, même encore dans sa fenêtre.
export function verifyTotp(
  secret: string,
  code: string,
  now: Date,
  lastUsedStep: number | null = null,
): number | null {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return null;
  const current = stepAt(now);
  for (let step = current - WINDOW; step <= current + WINDOW; step += 1) {
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    const expected = Buffer.from(totpCode(secret, step));
    if (timingSafeEqual(expected, Buffer.from(normalized))) return step;
  }
  return null;
}

// Lien otpauth:// : ouvert sur un téléphone, il propose d'ajouter le compte
// à l'application d'authentification (trousseau iOS, Google Authenticator).
export function otpauthUri(accountEmail: string, secret: string): string {
  const issuer = "DL Propreté";
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}
