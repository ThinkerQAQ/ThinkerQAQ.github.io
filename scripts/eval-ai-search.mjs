const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const apiToken = String(process.env.CLOUDFLARE_AI_SEARCH_TOKEN || "").trim();
const instanceName = String(process.env.CLOUDFLARE_AI_SEARCH_INSTANCE || "thinkerqaq-blog").trim();
const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-search/instances/${encodeURIComponent(instanceName)}`;
const timeoutMs = Number(process.env.AI_SEARCH_EVAL_TIMEOUT_MS || 180_000);
const retryMs = Number(process.env.AI_SEARCH_EVAL_RETRY_MS || 10_000);

const cases = [
  {
    language: "zh",
    query: "Go CAS 为什么可以无锁？",
    expectedAny: [
      "/articles/concurrency-series-05-atomic-cas/",
      "/articles/concurrency-series-06-atomic-implementation/",
    ],
  },
  {
    language: "zh",
    query: "Go CAS 在 amd64 上如何实现？",
    expectedAny: ["/articles/concurrency-series-06-atomic-implementation/"],
  },
  {
    language: "zh",
    query: "AtomicInteger 底层如何实现？",
    expectedAny: ["/articles/concurrency-series-06-atomic-implementation/"],
  },
  {
    language: "zh",
    query: "Java synchronized 底层怎么实现？",
    expectedAny: ["/articles/concurrency-series-04-mutex-implementation/"],
  },
  {
    language: "zh",
    query: "volatile 能保证原子性吗？",
    expectedAny: ["/articles/concurrency-series-07-volatile/"],
  },
  {
    language: "zh",
    query: "Go Mutex 竞争失败以后发生什么？",
    expectedAny: ["/articles/concurrency-series-04-mutex-implementation/"],
  },
  {
    language: "en",
    query: "How is CAS implemented on amd64?",
    expectedAny: ["/en/articles/concurrency-series-06-atomic-implementation/"],
  },
  {
    language: "en",
    query: "What does volatile guarantee?",
    expectedAny: ["/en/articles/concurrency-series-07-volatile/"],
  },
];

function fail(message) {
  throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function search(query, language) {
  const response = await fetch(`${apiBase}/search`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      ai_search_options: {
        retrieval: {
          retrieval_type: "hybrid",
          fusion_method: "rrf",
          keyword_match_mode: "or",
          boost_by: [{ field: "priority", direction: "desc" }],
          filters: { language },
          match_threshold: 0,
          max_num_results: 20,
          context_expansion: 1,
          return_on_failure: false,
        },
        query_rewrite: { enabled: false },
        reranking: {
          enabled: true,
          model: "@cf/baai/bge-reranker-base",
          match_threshold: 0.1,
        },
      },
    }),
  });

  const text = await response.text();
  if (!response.ok) fail(`AI Search ${response.status} for ${query}: ${text.slice(0, 1000)}`);

  const payload = JSON.parse(text);
  if (payload?.success === false) {
    fail(`AI Search returned success=false for ${query}: ${JSON.stringify(payload.errors || [])}`);
  }
  return payload?.result || payload || {};
}

function collectionFromKey(key) {
  return String(key || "").match(/^blog--(articles|notes)--/)?.[1] || "";
}

function uniqueDocuments(chunks) {
  const seen = new Set();
  const documents = [];

  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    const key = String(chunk?.item?.key || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const metadata = chunk?.item?.metadata || {};
    documents.push({
      key,
      title: String(metadata.title || ""),
      collection: collectionFromKey(key),
      language: String(metadata.language || ""),
      sourceUrl: String(metadata.source_url || ""),
      schemaVersion: Number(metadata.schema_version || 0),
      score: chunk?.score ?? null,
      vectorScore: chunk?.scoring_details?.vector_score ?? null,
      keywordScore: chunk?.scoring_details?.keyword_score ?? null,
      rerankingScore: chunk?.scoring_details?.reranking_score ?? null,
    });
  }
  return documents;
}

async function evaluateCase(testCase) {
  const result = await search(testCase.query, testCase.language);
  const documents = uniqueDocuments(result.chunks);
  const topFive = documents.slice(0, 5);
  const matchedRank = topFive.findIndex((document) =>
    document.language === testCase.language
    && testCase.expectedAny.some((expected) => document.sourceUrl.includes(expected)),
  );

  return {
    language: testCase.language,
    query: testCase.query,
    status: matchedRank >= 0 ? "pass" : "fail",
    expectedAny: testCase.expectedAny,
    matchedRank: matchedRank >= 0 ? matchedRank + 1 : null,
    topFive: topFive.map((document, index) => ({ rank: index + 1, ...document })),
  };
}

if (!accountId || !apiToken) {
  fail("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_SEARCH_TOKEN are required for retrieval evaluation");
}

const deadline = Date.now() + timeoutMs;
let pending = [...cases];
let lastDiagnostics = [];

while (pending.length > 0) {
  lastDiagnostics = [];
  const failedCases = [];

  for (const testCase of pending) {
    const diagnostic = await evaluateCase(testCase);
    lastDiagnostics.push(diagnostic);
    console.log(JSON.stringify(diagnostic));
    if (diagnostic.status !== "pass") failedCases.push(testCase);
  }

  if (failedCases.length === 0) break;
  if (Date.now() >= deadline) {
    fail(`${failedCases.length} AI Search retrieval regression case(s) failed after ${timeoutMs}ms`);
  }

  console.log(JSON.stringify({
    operation: "eval-ai-search",
    status: "retrying",
    failedCases: failedCases.map((entry) => `${entry.language}:${entry.query}`),
    retryInMs: retryMs,
  }));
  pending = failedCases;
  await sleep(retryMs);
}

console.log(JSON.stringify({
  operation: "eval-ai-search",
  status: "passed",
  cases: cases.length,
  diagnostics: lastDiagnostics,
}));
