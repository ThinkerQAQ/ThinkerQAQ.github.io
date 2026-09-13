const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const apiToken = String(process.env.CLOUDFLARE_AI_SEARCH_TOKEN || "").trim();
const instanceName = String(process.env.CLOUDFLARE_AI_SEARCH_INSTANCE || "thinkerqaq-blog").trim();
const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-search/instances/${encodeURIComponent(instanceName)}`;

const cases = [
  {
    query: "Go CAS 为什么可以无锁？",
    expectedAny: [
      "/articles/concurrency-series-05-atomic-cas/",
      "/articles/concurrency-series-06-atomic-implementation/",
    ],
  },
  {
    query: "Go CAS 在 amd64 上如何实现？",
    expectedAny: ["/articles/concurrency-series-06-atomic-implementation/"],
  },
  {
    query: "AtomicInteger 底层如何实现？",
    expectedAny: ["/articles/concurrency-series-06-atomic-implementation/"],
  },
  {
    query: "Java synchronized 底层怎么实现？",
    expectedAny: ["/articles/concurrency-series-04-mutex-implementation/"],
  },
  {
    query: "volatile 能保证原子性吗？",
    expectedAny: ["/articles/concurrency-series-07-volatile/"],
  },
  {
    query: "Go Mutex 竞争失败以后发生什么？",
    expectedAny: ["/articles/concurrency-series-04-mutex-implementation/"],
  },
];

function fail(message) {
  throw new Error(message);
}

async function search(query) {
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
      collection: String(metadata.collection || ""),
      sourceUrl: String(metadata.source_url || ""),
      score: chunk?.score ?? null,
      vectorScore: chunk?.scoring_details?.vector_score ?? null,
      keywordScore: chunk?.scoring_details?.keyword_score ?? null,
      rerankingScore: chunk?.scoring_details?.reranking_score ?? null,
    });
  }
  return documents;
}

if (!accountId || !apiToken) {
  fail("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_SEARCH_TOKEN are required for retrieval evaluation");
}

let failed = 0;
for (const testCase of cases) {
  const result = await search(testCase.query);
  const documents = uniqueDocuments(result.chunks);
  const topFive = documents.slice(0, 5);
  const matchedRank = topFive.findIndex((document) =>
    testCase.expectedAny.some((expected) => document.sourceUrl.includes(expected)),
  );

  const diagnostic = {
    query: testCase.query,
    status: matchedRank >= 0 ? "pass" : "fail",
    expectedAny: testCase.expectedAny,
    matchedRank: matchedRank >= 0 ? matchedRank + 1 : null,
    topFive: topFive.map((document, index) => ({ rank: index + 1, ...document })),
  };
  console.log(JSON.stringify(diagnostic));

  if (matchedRank < 0) failed += 1;
}

if (failed > 0) {
  fail(`${failed} AI Search retrieval regression case(s) failed`);
}

console.log(JSON.stringify({ operation: "eval-ai-search", status: "passed", cases: cases.length }));
