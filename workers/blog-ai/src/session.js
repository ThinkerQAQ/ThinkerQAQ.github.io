const SESSION_VERSION = 1;
const SESSION_TTL_SECONDS = 20 * 60;
const MAX_SESSION_TOKEN_LENGTH = 4096;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret) {
  const value = String(secret || "").trim();
  if (!value) return null;
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(value),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function issueAskSession(secret, origin) {
  const key = await signingKey(secret);
  if (!key) throw new Error("ASK_SESSION_SECRET is not configured");

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({
    v: SESSION_VERSION,
    exp: Math.floor(expiresAt / 1000),
    origin,
  })));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));

  return {
    token: `${payload}.${bytesToBase64Url(signature)}`,
    expiresAt,
  };
}

export async function verifyAskSession(token, secret, origin) {
  if (!token || typeof token !== "string" || token.length > MAX_SESSION_TOKEN_LENGTH) {
    return { ok: false, reason: "missing-or-invalid" };
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };

  const key = await signingKey(secret);
  if (!key) return { ok: false, reason: "unavailable" };

  let signature;
  let payload;
  try {
    signature = base64UrlToBytes(parts[1]);
    payload = JSON.parse(decoder.decode(base64UrlToBytes(parts[0])));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const validSignature = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(parts[0]));
  if (!validSignature) return { ok: false, reason: "signature" };

  const expiresAt = Number(payload?.exp || 0) * 1000;
  if (payload?.v !== SESSION_VERSION || payload?.origin !== origin || !Number.isFinite(expiresAt)) {
    return { ok: false, reason: "claims" };
  }
  if (expiresAt <= Date.now()) return { ok: false, reason: "expired" };
  if (expiresAt > Date.now() + (SESSION_TTL_SECONDS + 60) * 1000) return { ok: false, reason: "expiry" };

  return { ok: true, expiresAt };
}

export const ASK_SESSION_TTL_SECONDS = SESSION_TTL_SECONDS;
