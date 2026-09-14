const DEFAULT_AI_SEARCH_INSTANCE = "thinkerqaq-blog";
const RERANKER_MODEL = "@cf/baai/bge-reranker-base";
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_MESSAGE_LENGTH = 3000;
const MAX_HISTORY_TOTAL_LENGTH = 9000;
const MAX_SEARCH_RESULTS = 20;
const MAX_SOURCES = 5;
const MAX_SOURCE_LENGTH = 5000;
const MAX_TOTAL_CONTEXT = 20000;
const ALLOWED_COLLECTIONS = new Set(["articles", "notes"]);
const SUPPORTED_LANGUAGES = new Set(["zh", "en"]);

export function decodeAiSearchKey(key) {
  const match = String(key || "").match(/^blog--(articles|notes)--(.+)\.md$/i);
  if (!match) return null;
  try {
    return { collection: match[1].toLowerCase(), id: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

function normalizedLanguage(value, decoded, metadataUrl, blogOrigin) {
  const metadataLanguage = String(value || "").trim().toLowerCase();
  if (SUPPORTED_LANGUAGES.has(metadataLanguage)) return metadataLanguage;

  try {
    const pathname = new URL(String(metadataUrl || ""), `${blogOrigin}/`).pathname;
    if (/^\/en\/(?:articles|notes)\//.test(pathname) || /^\/(?:articles|notes)\/en\//.test(pathname)) {
      return "en";
    }
  } catch {
    // Fall through to the reversible item key when legacy metadata is malformed.
  }

  if (decoded?.id?.startsWith("en/")) return "en";
  return "zh";
}

function sourcePathFromDecoded(decoded) {
  if (!decoded || /^h-[a-f0-9]{32}$/i.test(decoded.id)) return null;

  let routeId = decoded.id;
  let localePrefix = "";
  if (decoded.collection === "articles" && routeId.startsWith("en/")) {
    localePrefix = "/en";
    routeId = routeId.slice(3);
  }
  if (!routeId) return null;

  const encodedId = routeId.split("/").map(encodeURIComponent).join("/");
  return `${localePrefix}/${decoded.collection}/${encodedId}/`;
}

export function sourceFromAiSearchKey(key, blogOrigin) {
  const path = sourcePathFromDecoded(decodeAiSearchKey(key));
  return path ? new URL(path, `${blogOrigin}/`).href : null;
}

function collectionFromPublicPath(pathname) {
  return pathname.match(/^\/(?:en\/)?(articles|notes)\//)?.[1] ?? "";
}

function normalizeLegacyMetadataUrl(candidate, decoded) {
  if (
    decoded.collection === "articles"
    && candidate.pathname.startsWith("/articles/en/")
  ) {
    candidate.pathname = `/en/articles/${candidate.pathname.slice("/articles/en/".length)}`;
  }
  return candidate;
}

export function sourceFromChunk(chunk, blogOrigin) {
  const decoded = decodeAiSearchKey(chunk?.item?.key);
  if (!decoded || !ALLOWED_COLLECTIONS.has(decoded.collection)) return null;

  const metadataUrl = String(chunk?.item?.metadata?.source_url || "").trim();
  if (metadataUrl) {
    try {
      const candidate = normalizeLegacyMetadataUrl(
        new URL(metadataUrl, `${blogOrigin}/`),
        decoded,
      );
      if (
        candidate.origin === blogOrigin
        && collectionFromPublicPath(candidate.pathname) === decoded.collection
      ) {
        return candidate.href;
      }
    } catch {
      // Fall through to stable key decoding for legacy metadata.
    }
  }

  return sourceFromAiSearchKey(chunk?.item?.key, blogOrigin);
}

function metadataFromChunk(chunk, blogOrigin) {
  const key = String(chunk?.item?.key || "");
  const decoded = decodeAiSearchKey(key);
  const metadata = chunk?.item?.metadata || {};
  const title = String(metadata.title || "").trim();
  const collection = decoded?.collection || "";
  const language = normalizedLanguage(metadata.language, decoded, metadata.source_url, blogOrigin);
  const url = sourceFromChunk(chunk, blogOrigin);

  if (!title || !ALLOWED_COLLECTIONS.has(collection) || !url) return null;
  return {
    title: title.slice(0, 200),
    collection,
    language,
    priority: Number(metadata.priority || 0),
    url,
  };
}

export function normalizeAiSearchChunks(chunks, blogOrigin) {
  const documents = new Map();
  let totalContext = 0;

  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    const content = String(chunk?.text || "").trim();
    const key = String(chunk?.item?.key || "");
    const metadata = metadataFromChunk(chunk, blogOrigin);
    if (!content || !key || !metadata) continue;

    let document = documents.get(key);
    if (!document) {
      if (documents.size >= MAX_SOURCES) continue;
      document = { ...metadata, content: "" };
      documents.set(key, document);
    }

    const remaining = Math.min(
      MAX_SOURCE_LENGTH - document.content.length,
      MAX_TOTAL_CONTEXT - totalContext,
    );
    if (remaining <= 0) break;

    const addition = `${document.content ? "\n\n" : ""}${content}`.slice(0, remaining);
    document.content += addition.length > 0 ? addition : "";
    totalContext += addition.length;
    if (totalContext >= MAX_TOTAL_CONTEXT) break;
  }

  return [...documents.values()].filter((source) => source.content);
}

async function searchAiSearch(instance, query, language) {
  const retrieval = {
    retrieval_type: "hybrid",
    fusion_method: "rrf",
    keyword_match_mode: "or",
    boost_by: [{ field: "priority", direction: "desc" }],
    match_threshold: 0,
    max_num_results: MAX_SEARCH_RESULTS,
    context_expansion: 1,
    return_on_failure: true,
  };
  if (language) retrieval.filters = { language };

  return instance.search({
    query,
    ai_search_options: {
      retrieval,
      query_rewrite: { enabled: false },
      reranking: {
        enabled: true,
        model: RERANKER_MODEL,
        match_threshold: 0.1,
      },
    },
  });
}

async function searchSources(instance, query, language, blogOrigin) {
  const result = await searchAiSearch(instance, query, language);
  return normalizeAiSearchChunks(result?.chunks, blogOrigin);
}

function mergeSources(...sourceGroups) {
  const merged = [];
  const seenUrls = new Set();
  let totalContext = 0;

  for (const source of sourceGroups.flat()) {
    if (merged.length >= MAX_SOURCES || seenUrls.has(source.url)) continue;
    const remaining = MAX_TOTAL_CONTEXT - totalContext;
    if (remaining <= 0) break;

    const content = String(source.content || "").slice(0, Math.min(MAX_SOURCE_LENGTH, remaining));
    if (!content) continue;
    merged.push({ ...source, content });
    seenUrls.add(source.url);
    totalContext += content.length;
  }

  return merged;
}

export function normalizeHistory(rawHistory) {
  if (rawHistory == null) return { history: [] };
  if (!Array.isArray(rawHistory) || rawHistory.length > MAX_HISTORY_MESSAGES) {
    return { error: `History must contain at most ${MAX_HISTORY_MESSAGES} messages` };
  }

  const history = [];
  let totalLength = 0;
  for (const entry of rawHistory) {
    const role = String(entry?.role || "").trim();
    const content = String(entry?.content || "").trim();
    if ((role !== "user" && role !== "assistant") || !content || content.length > MAX_HISTORY_MESSAGE_LENGTH) {
      return { error: "History contains an invalid message" };
    }
    totalLength += content.length;
    if (totalLength > MAX_HISTORY_TOTAL_LENGTH) {
      return { error: `History must be at most ${MAX_HISTORY_TOTAL_LENGTH} characters` };
    }
    history.push({ role, content });
  }
  return { history };
}

export function buildRetrievalQuery(question, history) {
  const priorUserQuestions = history
    .filter((entry) => entry.role === "user")
    .slice(-2)
    .map((entry) => entry.content);
  return [...priorUserQuestions, question].join("\n");
}

export async function retrieveAiSearchSources(question, history, env, blogOrigin, locale = "zh") {
  if (!env.AI_SEARCH) throw new Error("AI_SEARCH binding is not configured");
  const instanceName = String(env.AI_SEARCH_INSTANCE || DEFAULT_AI_SEARCH_INSTANCE).trim();
  if (!instanceName) throw new Error("AI_SEARCH_INSTANCE is not configured");

  const preferredLanguage = locale === "en" ? "en" : "zh";
  const fallbackLanguage = preferredLanguage === "en" ? "zh" : "en";
  const query = buildRetrievalQuery(question, history);
  const instance = env.AI_SEARCH.get(instanceName);

  let preferredSources = [];
  let fallbackSources = [];
  let filteredSearchFailed = false;

  try {
    preferredSources = await searchSources(instance, query, preferredLanguage, blogOrigin);
  } catch {
    filteredSearchFailed = true;
  }

  if (preferredSources.length < MAX_SOURCES) {
    try {
      fallbackSources = await searchSources(instance, query, fallbackLanguage, blogOrigin);
    } catch {
      filteredSearchFailed = true;
    }
  }

  let sources = mergeSources(preferredSources, fallbackSources);
  let legacyFallbackUsed = false;

  // During the schema-v2 -> v3 rollout, the newly deployed Worker can briefly
  // run before the index contains the `language` field. Unknown-field filters may
  // return no hits or fail. Fall back to the old unfiltered query only when the
  // locale-aware path produced no usable sources. Once migration finishes, this
  // branch is naturally dormant and normal requests remain two-pass at most.
  if (sources.length === 0 || filteredSearchFailed) {
    const legacySources = await searchSources(instance, query, undefined, blogOrigin);
    const before = sources.length;
    sources = mergeSources(sources, legacySources);
    legacyFallbackUsed = sources.length > before;
  }

  return {
    query,
    sources,
    preferredLanguage,
    fallbackLanguage,
    fallbackUsed: sources.some((source) => source.language === fallbackLanguage),
    legacyFallbackUsed,
  };
}
