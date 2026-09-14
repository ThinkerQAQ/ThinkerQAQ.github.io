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

function decodeAiSearchKey(key) {
  const match = String(key || "").match(/^blog--(articles|notes)--(.+)\.md$/i);
  if (!match) return null;
  try {
    return { collection: match[1].toLowerCase(), id: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

function sourceFromAiSearchKey(key, blogOrigin) {
  const decoded = decodeAiSearchKey(key);
  if (!decoded || /^h-[a-f0-9]{32}$/i.test(decoded.id)) return null;
  const path = `/${decoded.collection}/${decoded.id.split("/").map(encodeURIComponent).join("/")}/`;
  return new URL(path, `${blogOrigin}/`).href;
}

function sourceFromChunk(chunk, blogOrigin) {
  const metadataUrl = String(chunk?.item?.metadata?.source_url || "").trim();
  if (metadataUrl) {
    try {
      const candidate = new URL(metadataUrl, `${blogOrigin}/`);
      if (candidate.origin === blogOrigin && /^\/(articles|notes)\//.test(candidate.pathname)) {
        return candidate.href;
      }
    } catch {
      // Fall through to legacy key decoding.
    }
  }
  return sourceFromAiSearchKey(chunk?.item?.key, blogOrigin);
}

function metadataFromChunk(chunk, blogOrigin) {
  const metadata = chunk?.item?.metadata || {};
  const title = String(metadata.title || "").trim();
  const collection = String(metadata.collection || "").trim().toLowerCase();
  const url = sourceFromChunk(chunk, blogOrigin);
  if (!title || !ALLOWED_COLLECTIONS.has(collection) || !url) return null;
  return {
    title: title.slice(0, 200),
    collection,
    priority: Number(metadata.priority || 0),
    url,
  };
}

function normalizeAiSearchChunks(chunks, blogOrigin) {
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
    document.content += addition;
    totalContext += addition.length;
    if (totalContext >= MAX_TOTAL_CONTEXT) break;
  }

  return [...documents.values()].filter((source) => source.content);
}

async function searchAiSearch(instance, query) {
  return instance.search({
    query,
    ai_search_options: {
      retrieval: {
        retrieval_type: "hybrid",
        fusion_method: "rrf",
        keyword_match_mode: "or",
        boost_by: [{ field: "priority", direction: "desc" }],
        match_threshold: 0,
        max_num_results: MAX_SEARCH_RESULTS,
        context_expansion: 1,
        return_on_failure: true,
      },
      query_rewrite: { enabled: false },
      reranking: {
        enabled: true,
        model: RERANKER_MODEL,
        match_threshold: 0.1,
      },
    },
  });
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

export async function retrieveAiSearchSources(question, history, env, blogOrigin) {
  if (!env.AI_SEARCH) throw new Error("AI_SEARCH binding is not configured");
  const instanceName = String(env.AI_SEARCH_INSTANCE || DEFAULT_AI_SEARCH_INSTANCE).trim();
  if (!instanceName) throw new Error("AI_SEARCH_INSTANCE is not configured");

  const query = buildRetrievalQuery(question, history);
  const result = await searchAiSearch(env.AI_SEARCH.get(instanceName), query);
  return { query, sources: normalizeAiSearchChunks(result?.chunks, blogOrigin) };
}
