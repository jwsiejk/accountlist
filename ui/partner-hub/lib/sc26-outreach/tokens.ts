import crypto from "crypto";

/**
 * Opaque, unguessable tracking tokens embedded in the pixel/click URLs.
 * Not reversible -- the token itself is just a random id; we look up the
 * OutreachMessage row by this value. HMAC-signed so a stray guess can't be
 * used to probe for valid tokens (belt-and-braces on top of the id being
 * random in the first place).
 */

function getSecret(): string {
  const secret = process.env.TRACKING_TOKEN_SECRET;
  if (!secret) {
    throw new Error("Missing required env var: TRACKING_TOKEN_SECRET");
  }
  return secret;
}

export function generateTrackingToken(): string {
  const id = crypto.randomBytes(16).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(id).digest("base64url").slice(0, 16);
  return `${id}.${sig}`;
}

export function verifyTrackingToken(token: string): boolean {
  const [id, sig] = token.split(".");
  if (!id || !sig) return false;
  const expected = crypto.createHmac("sha256", getSecret()).update(id).digest("base64url").slice(0, 16);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
