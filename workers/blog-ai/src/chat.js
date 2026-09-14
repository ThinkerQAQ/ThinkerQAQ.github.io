import { buildMessages, citedSources, getAnswer } from "./prompt.js";
import { normalizeHistory, retrieveAiSearchSources } from "./retrieval.js";
import { authorizeAskRequest, sessionFields } from "./security.js";

const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_QUESTION_LENGTH = 1000;
const MAX_REQUEST_BODY_BYTES = 24 * 1024;

function logRequest(level, message, context) {
  console[level](message, {
    timestamp: new Date().toISOString(),
    severity: level,
    ...context,
  });
}

function requestLocale(value) {
  return String(value || "").trim().toLowerCase() === "en" ? "en" : "zh";
}

function localizedRetrievalError(locale, kind) {
  if (locale === "en") {
    return kind === "empty"
      ? "No relevant content was found on this site."
      : "Site search is temporarily unavailable.";
  }
  return kind === "empty"
    ? "本站暂未检索到相关内容。"
    : "本站检索服务暂时不可用。";
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    return { tooLarge: true, byteLength: declaredLength };
  }

  const reader = request.body?.getReader();
  if (!reader) return { body: null, byteLength: 0 };

  const chunks = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return { tooLarge: true, byteLength };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { body: JSON.parse(new TextDecoder().decode(bytes)), byteLength };
}

function json(body, status = 200, origin = "") {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function allowedOrigins(env) {
  return new Set(
    String(env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

export default {
  async fetch(request, env) {
    const startedAt = Date.now();
    const traceId = request.headers.get("cf-ray") || crypto.randomUUID();
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";
    const originAllowed = origin && allowedOrigins(env).has(origin);

    logRequest("info", "Ask blog request started", {
      traceId,
      node: "worker-request",
      operation: "chat",
      method: request.method,
      path: url.pathname,
    });

    if (request.method === "OPTIONS") {
      if (!originAllowed) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname !== "/chat") return json({ error: "Not found" }, 404, originAllowed ? origin : "");
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, originAllowed ? origin : "");
    if (!originAllowed) return json({ error: "Origin not allowed" }, 403);

    let parsedBody;
    try {
      parsedBody = await readJsonBody(request);
    } catch (error) {
      logRequest("warn", "Ask blog request body is invalid", {
        traceId,
        node: "request-body",
        status: 400,
        error: error instanceof Error ? error.message : String(error),
      });
      return json({ error: "Invalid JSON" }, 400, origin);
    }

    if (parsedBody.tooLarge) return json({ error: "Request too large" }, 413, origin);
    const body = parsedBody.body;
    const locale = requestLocale(body?.locale);

    const question = String(body?.question || "").trim();
    if (!question || question.length > MAX_QUESTION_LENGTH) {
      return json({ error: `Question must be 1-${MAX_QUESTION_LENGTH} characters` }, 400, origin);
    }

    const normalizedHistory = normalizeHistory(body?.history);
    if (normalizedHistory.error) return json({ error: normalizedHistory.error }, 400, origin);
    const history = normalizedHistory.history;

    let blogOrigin;
    try {
      blogOrigin = new URL(env.BLOG_ORIGIN).origin;
    } catch (error) {
      logRequest("error", "BLOG_ORIGIN is invalid", {
        traceId,
        node: "worker-config",
        status: 500,
        error: error instanceof Error ? error.message : String(error),
      });
      return json({ error: "AI service is temporarily unavailable" }, 500, origin);
    }

    const limiterKey = request.headers.get("cf-connecting-ip") || "anonymous";
    const { success } = await env.AI_RATE_LIMITER.limit({ key: limiterKey });
    if (!success) return json({ error: "Too many questions. Please try again later." }, 429, origin);

    const auth = await authorizeAskRequest(body, request, env, origin, traceId);
    if (!auth.ok) {
      return json({
        error: auth.error,
        ...(auth.requiresTurnstile ? { requiresTurnstile: true } : {}),
      }, auth.status, origin);
    }
    const securitySession = sessionFields(auth);

    let sources = [];
    let retrievalQuery = question;
    let fallbackUsed = false;
    let preferredLanguage = locale;
    let fallbackLanguage = locale === "en" ? "zh" : "en";
    const retrievalStartedAt = Date.now();
    try {
      const retrieved = await retrieveAiSearchSources(question, history, env, blogOrigin, locale);
      sources = retrieved.sources;
      retrievalQuery = retrieved.query;
      fallbackUsed = retrieved.fallbackUsed;
      preferredLanguage = retrieved.preferredLanguage;
      fallbackLanguage = retrieved.fallbackLanguage;
    } catch (error) {
      logRequest("error", "AI Search retrieval failed", {
        traceId,
        node: "ai-search",
        operation: "hybrid-search",
        status: 502,
        locale,
        error: error instanceof Error ? error.message : String(error),
      });
      return json({ error: localizedRetrievalError(locale, "failed"), ...securitySession }, 502, origin);
    }

    if (!sources.length) {
      return json({ error: localizedRetrievalError(locale, "empty"), ...securitySession }, 404, origin);
    }

    logRequest("info", "Ask blog retrieval completed", {
      traceId,
      node: "retrieval",
      operation: "ai-search-hybrid",
      status: "ok",
      locale,
      preferredLanguage,
      fallbackLanguage,
      fallbackUsed,
      sourceLanguages: [...new Set(sources.map((source) => source.language))],
      sourceCount: sources.length,
      historyMessages: history.length,
      retrievalQueryLength: retrievalQuery.length,
      securityMethod: auth.method,
      requestBodyBytes: parsedBody.byteLength,
      durationMs: Date.now() - retrievalStartedAt,
    });

    try {
      const aiStartedAt = Date.now();
      const aiResult = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
        messages: buildMessages(question, sources, history),
        temperature: 0.2,
        max_completion_tokens: 900,
        reasoning_effort: null,
        chat_template_kwargs: { enable_thinking: false },
      });
      const answer = getAnswer(aiResult);
      if (!answer) throw new Error("Workers AI returned an empty response");
      const selectedSources = citedSources(answer, sources);

      logRequest("info", "Ask blog request completed", {
        traceId,
        node: "workers-ai",
        operation: "generate-answer",
        status: 200,
        locale,
        securityMethod: auth.method,
        citedSourceCount: selectedSources.length,
        durationMs: Date.now() - aiStartedAt,
        totalDurationMs: Date.now() - startedAt,
      });

      return json({
        answer,
        retrieval: "ai-search-hybrid",
        sources: selectedSources,
        ...securitySession,
      }, 200, origin);
    } catch (error) {
      logRequest("error", "Workers AI request failed", {
        traceId,
        node: "workers-ai",
        operation: "generate-answer",
        status: 502,
        locale,
        error: error instanceof Error ? error.message : String(error),
      });
      return json({ error: "AI service is temporarily unavailable", ...securitySession }, 502, origin);
    }
  },
};
