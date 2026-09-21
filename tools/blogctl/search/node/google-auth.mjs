import { createSign } from "node:crypto";

export const GOOGLE_WEBMASTERS_SCOPE = "https://www.googleapis.com/auth/webmasters";
export const GOOGLE_DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";

function base64url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export function parseServiceAccountCredentials(raw) {
  let credentials;
  try {
    credentials = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (error) {
    throw new Error(`Invalid Google service-account JSON: ${error.message}`);
  }
  const clientEmail = String(credentials?.client_email || "").trim();
  const privateKey = String(credentials?.private_key || "").trim();
  const tokenUri = String(credentials?.token_uri || GOOGLE_DEFAULT_TOKEN_URI).trim();
  if (!clientEmail || !privateKey) {
    throw new Error("Google service-account credentials require client_email and private_key");
  }
  const parsedTokenUri = new URL(tokenUri);
  if (parsedTokenUri.protocol !== "https:") {
    throw new Error("Google token_uri must use HTTPS");
  }
  return {
    clientEmail,
    privateKey,
    tokenUri: parsedTokenUri.toString(),
  };
}

export function createServiceAccountAssertion(credentials, {
  scope = GOOGLE_WEBMASTERS_SCOPE,
  now = Math.floor(Date.now() / 1000),
  lifetimeSeconds = 3600,
} = {}) {
  if (lifetimeSeconds <= 0 || lifetimeSeconds > 3600) {
    throw new Error("Google OAuth assertion lifetime must be between 1 and 3600 seconds");
  }
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: credentials.clientEmail,
    scope,
    aud: credentials.tokenUri,
    iat: now,
    exp: now + lifetimeSeconds,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(credentials.privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

export async function fetchGoogleAccessToken(credentials, {
  scope = GOOGLE_WEBMASTERS_SCOPE,
  fetchImpl = fetch,
  now,
} = {}) {
  const assertion = createServiceAccountAssertion(credentials, { scope, now });
  const response = await fetchImpl(credentials.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Google OAuth token exchange failed with HTTP ${response.status}: ${text.slice(0, 500)}`,
    );
  }
  return {
    accessToken: String(payload.access_token),
    tokenType: String(payload.token_type || "Bearer"),
    expiresIn: Number(payload.expires_in || 0),
  };
}

export async function accessTokenFromEnvironment(env = process.env, options = {}) {
  const raw = String(env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON || "").trim();
  if (!raw) return null;
  const credentials = parseServiceAccountCredentials(raw);
  return fetchGoogleAccessToken(credentials, options);
}
