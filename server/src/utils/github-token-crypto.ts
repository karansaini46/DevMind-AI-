import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { env } from "./env";

const algorithm = "aes-256-gcm";

function getEncryptionKey() {
  return createHash("sha256")
    .update(env.GITHUB_TOKEN_ENCRYPTION_KEY)
    .digest();
}

export function encryptGitHubAccessToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptGitHubAccessToken(encryptedToken: string) {
  const [ivValue, authTagValue, ciphertextValue] = encryptedToken.split(".");

  if (!ivValue || !authTagValue || !ciphertextValue) {
    throw new Error("Invalid encrypted token format");
  }

  const decipher = createDecipheriv(
    algorithm,
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
