import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Chiffrement symétrique (AES-256-GCM) des secrets stockés en base, comme
// le secret de double authentification : une copie de la base seule ne
// suffit pas à générer les codes. Clé dérivée de BETTER_AUTH_SECRET ; si
// celui-ci change, les secrets ne se déchiffrent plus et l'ADMIN réactive
// sa double authentification (npm run password:reset).
function key(purpose: string): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET absente : impossible de chiffrer.");
  return createHash("sha256").update(`${purpose}:${secret}`).digest();
}

export function seal(plaintext: string, purpose: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(purpose), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function unseal(sealed: string, purpose: string): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Secret chiffré illisible.");
  const decipher = createDecipheriv("aes-256-gcm", key(purpose), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
