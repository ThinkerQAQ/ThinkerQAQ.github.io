import { issueAskSession, verifyAskSession } from "./session.js";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_ACTION = "ask_blog";
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

function logRequest(level, message, context) {
  console[level](message, {
    timestamp: new Date().toISOString(),
    severity: level,
    ...context,
  });
}

async function verifyTurnstile(token, request, env, origin, traceId) {
  const startedAt = Date.now();
  const logFailure = (message, status, error) => {
    logRequest("warn", message, {
      traceId,
      node: "turnstile-siteverify",
      operation: "verify-token",
      status,
      durationMs: Date.now() - startedAt,
      ...(error ? { error } : {}),
    });
  };

  if (!env.TURNSTILE_SECRET_KEY) {
    logFailure("TURNSTILE_SECRET_KEY is not configured", 503);
    return { ok: false, status: 503, error: "Security verification is temporarily unavailable." };
  }
  if (!token || typeof token !== "string" || token.length > MAX_TURNSTILE_TOKEN_LENGTH) {
    return { ok: false, status: 400, error: "Security verification is required." };
  }

  let response;
  try {
    response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: request.headers.get("cf-connecting-ip") || undefined,
      }),
    });
  } catch (error) {
    logFailure("Turnstile Siteverify request failed", 503, error instanceof Error ? error.message : String(error));
    return { ok: false, status: 503, error: "Security verification is temporarily unavailable." };
  }

  if (!response.ok) {
    logFailure("Turnstile Siteverify returned an unsuccessful HTTP status", 503, `HTTP ${response.status}`);
    return { ok: false, status: 503, error: "Security verification is temporarily unavailable." };
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    logFailure("Turnstile Siteverify returned invalid JSON", 503, error instanceof Error ? error.message : String(error));
    return { ok: false, status: 503, error: "Security verification is temporarily unavailable." };
  }

  if (!result?.success) {
    logFailure("Turnstile verification rejected", 403, String(result?.["error-codes"] || []));
    return { ok: false, status: 403, error: "Security verification failed. Please retry." };
  }

  if (result.hostname !== new URL(origin).hostname) {
    logFailure("Turnstile hostname mismatch", 403);
    return { ok: false, status: 403, error: "Security verification failed. Please retry." };
  }

  const expectedAction = env.TURNSTILE_ACTION || TURNSTILE_ACTION;
  if (result.action !== expectedAction) {
    logFailure("Turnstile action mismatch", 403);
    return { ok: false, status: 403, error: "Security verification failed. Please retry." };
  }

  return { ok: true };
}

export async function authorizeAskRequest(body, request, env, origin, traceId) {
  const currentSession = String(body?.sessionToken || "").trim();
  if (currentSession) {
    const verified = await verifyAskSession(currentSession, env.ASK_SESSION_SECRET, origin);
    if (verified.ok) return { ok: true, method: "session" };
  }

  const turnstileToken = String(body?.turnstileToken || "").trim();
  if (!turnstileToken) {
    return {
      ok: false,
      status: 401,
      error: "需要重新进行安全验证。",
      requiresTurnstile: true,
    };
  }

  const verified = await verifyTurnstile(turnstileToken, request, env, origin, traceId);
  if (!verified.ok) return verified;

  let session = null;
  if (body?.requestSession === true && env.ASK_SESSION_SECRET) {
    try {
      session = await issueAskSession(env.ASK_SESSION_SECRET, origin);
    } catch (error) {
      logRequest("warn", "Ask session issuance failed", {
        traceId,
        node: "ask-session",
        operation: "issue-session",
        status: 200,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { ok: true, method: "turnstile", session };
}

export function sessionFields(auth) {
  if (!auth?.session) return {};
  return {
    sessionToken: auth.session.token,
    sessionExpiresAt: auth.session.expiresAt,
  };
}
