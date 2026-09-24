import { PLATFORM_AUTH, PLATFORM_SESSIONS } from "./platforms.js";
import { collectBrowserSessionCookieBatches, cookieHeaderFromRequest, cookieQueryDiagnostic, selectBrowserSessionCookies } from "./session.js";
import { toError } from "./errors.js";

const NATIVE_HOST = "com.thinkerqaq.blogctl";
const AUTH_TIMEOUT_MS = 7000;
const BRIDGE_CACHE_MS = 30000;
let bridgeSession = null;
const pendingCNBlogsCookieCaptures = new Map();
const pendingPlatformCookieCaptures = new Map();
const extensionOrigin = chrome.runtime.getURL("").replace(/\/$/, "");
const openControlTab = () => chrome.tabs.create({ url: chrome.runtime.getURL("popup/popup.html") });

if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    console.error("BlogCTL side panel setup failed:", errorMessage(error));
    chrome.action.onClicked.addListener(openControlTab);
  });
} else {
  console.warn("BlogCTL side panel API is unavailable in this browser");
  chrome.action.onClicked.addListener(openControlTab);
}

chrome.webRequest.onSendHeaders.addListener((details) => {
  const pending = pendingCNBlogsCookieCaptures.get(details.url);
  if (!pending) return;
  const header = cookieHeaderFromRequest(details, extensionOrigin, pending.url);
  if (header !== null) pending.resolve(header);
}, { urls: ["https://i.cnblogs.com/api/user*"] }, ["requestHeaders", "extraHeaders"]);

const platformSessionRequestPatterns = [...new Set(
  Object.values(PLATFORM_SESSIONS).flatMap((definition) =>
    (definition.cookieDomains ?? []).flatMap((domain) => [
      `https://${domain}/*`,
      `https://*.${domain}/*`,
    ]),
  ),
)];

chrome.webRequest.onSendHeaders.addListener((details) => {
  const pending = pendingPlatformCookieCaptures.get(details.url);
  if (!pending) return;
  const header = cookieHeaderFromRequest(details, extensionOrigin, pending.url);
  if (header !== null) pending.resolve(header);
}, { urls: platformSessionRequestPatterns }, ["requestHeaders", "extraHeaders"]);

async function setBadge(text, color) {
  await chrome.action.setBadgeText({ text });
  if (color) await chrome.action.setBadgeBackgroundColor({ color });
}

function clearBadgeLater() {
  setTimeout(() => chrome.action.setBadgeText({ text: "" }).catch(() => {}), 5000);
}

function errorMessage(error) {
  return error?.message || String(error);
}

function readPath(value, path) {
  return String(path || "").split(".").filter(Boolean).reduce((current, key) => current?.[key], value);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    return await fetch(url, { credentials: "include", redirect: "follow", ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function requestNativeBridge() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST, { command: "ensure_bridge" }, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(`无法连接 BlogCTL Native Host：${error.message}`));
        return;
      }
      if (!response?.ok || !response.baseUrl || !response.token) {
        reject(new Error(response?.error || "BlogCTL Native Host 返回无效结果"));
        return;
      }
      resolve(response);
    });
  });
}

async function ensureBridge(force = false) {
  if (!force && bridgeSession && Date.now() - bridgeSession.checkedAt < BRIDGE_CACHE_MS) return bridgeSession;
  const response = await requestNativeBridge();
  bridgeSession = { ...response, checkedAt: Date.now() };
  return bridgeSession;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function restartBridge() {
  const current = await ensureBridge(false);
  const previousPID = Number(current?.pid || 0);
  await fetchJSON("/v1/restart", { method: "POST" }, false);
  bridgeSession = null;
  await delay(300);

  const deadline = Date.now() + 10000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await requestNativeBridge();
      if (!previousPID || Number(response?.pid || 0) !== previousPID) {
        bridgeSession = { ...response, checkedAt: Date.now() };
        return bridgeSession;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(lastError?.message || "Bridge 重启超时");
}

async function probeCookies(probe) {
  const cookies = await chrome.cookies.getAll({ url: probe.cookieUrl });
  const byName = new Map(cookies.map((cookie) => [cookie.name, cookie]));
  return (probe.requiredCookieNames ?? []).every((name) => Boolean(byName.get(name)?.value));
}

async function probeJSON(probe) {
  const response = await fetchWithTimeout(probe.url, { headers: probe.headers ?? {} });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const value = readPath(payload, probe.path);
  return Object.prototype.hasOwnProperty.call(probe, "equals") ? value === probe.equals : Boolean(value);
}

async function probeHTML(probe) {
  const response = await fetchWithTimeout(probe.url, { headers: probe.headers ?? {} });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return new RegExp(probe.match, "i").test(await response.text());
}

async function probeFinalURL(probe) {
  const response = await fetchWithTimeout(probe.url, { headers: probe.headers ?? {} });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const pathname = new URL(response.url).pathname;
  return !(probe.loggedOutPathPatterns ?? []).some((pattern) => pathname.startsWith(pattern));
}

async function platformLoginStatus(definition) {
  const probe = definition.probe ?? {};
  try {
    let loggedIn;
    switch (probe.kind) {
      case "cookies": loggedIn = await probeCookies(probe); break;
      case "json": loggedIn = await probeJSON(probe); break;
      case "html": loggedIn = await probeHTML(probe); break;
      case "final-url": loggedIn = await probeFinalURL(probe); break;
      default: throw new Error(`Unsupported auth probe: ${probe.kind || "missing"}`);
    }
    if (loggedIn) {
      return { id: definition.id, label: definition.label, known: true, loggedIn: true, inferred: false };
    }
    if (definition.id !== "cnblogs" && await platformHasSessionCookies(definition.id)) {
      return {
        id: definition.id, label: definition.label, known: false, loggedIn: false, inferred: true,
        warning: "Browser cookies exist, but the login probe did not verify the session.",
      };
    }
    return { id: definition.id, label: definition.label, known: true, loggedIn: false, inferred: false };
  } catch (error) {
    if (definition.id !== "cnblogs" && await platformHasSessionCookies(definition.id)) {
      return {
        id: definition.id, label: definition.label, known: false, loggedIn: false, inferred: true,
        warning: `Login probe failed: ${errorMessage(error)}`,
      };
    }
    return { id: definition.id, label: definition.label, known: false, loggedIn: false, error: errorMessage(error) };
  }
}

async function allPlatformLoginStatuses() {
  return Promise.all(PLATFORM_AUTH.map((definition) => platformLoginStatus(definition)));
}

async function fetchJSON(pathname, options = {}, retry = true) {
  const bridge = await ensureBridge(false);
  try {
    const headers = new Headers(options.headers ?? {});
    headers.set("x-thinkerqaq-token", bridge.token);
    const response = await fetch(`${bridge.baseUrl}${pathname}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw toError(payload, response.status);
    return payload;
  } catch (error) {
    if (retry) {
      bridgeSession = null;
      await ensureBridge(true);
      return fetchJSON(pathname, options, false);
    }
    throw error;
  }
}

function jsonOptions(method, body) {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

function normalizedRemoteTitle(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function remoteTitleMatches(local, remote) {
  const localTitle = normalizedRemoteTitle(local);
  const remoteTitle = normalizedRemoteTitle(remote);
  if (!localTitle || !remoteTitle) return false;
  if (localTitle === remoteTitle) return true;
  return [" · ", " - ", " — "].some((separator) => remoteTitle.startsWith(localTitle + separator));
}

function bindingForPost(bindings, post) {
  const state = post.published ? "published" : "draft";
  const binding = (bindings ?? []).find((item) =>
    item.state === state && String(item.postId) === String(post.id));
  return binding ? { bound: true, bindingState: binding.state } : { bound: false, bindingState: "" };
}

function stripMediumXSSI(value) {
  const text = String(value || "").trim();
  if (!text.startsWith("])}") && !text.startsWith(")]}")) return text;
  const newline = text.indexOf("\n");
  if (newline >= 0) return text.slice(newline + 1).trim();
  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[", 3);
  const starts = [objectStart, arrayStart].filter((index) => index >= 0);
  return starts.length ? text.slice(Math.min(...starts)).trim() : "";
}

async function mediumGraphQL(operation, query, variables, frontendPath) {
  const startedAt = Date.now();
  const response = await fetchWithTimeout("https://medium.com/_/graphql", {
    method: "POST",
    headers: {
      accept: "*/*",
      "content-type": "application/json",
      "graphql-operation": operation,
      "medium-frontend-path": frontendPath,
      "medium-frontend-route": frontendPath.startsWith("/@") ? "profile" : "stories",
      "x-obvious-cid": "web",
      "x-client-date": String(Date.now()),
    },
    body: JSON.stringify([{ operationName: operation, variables, query }]),
  });
  const raw = await response.text();
  if (!response.ok) {
    console.warn("[BlogCTL][medium-detect] GraphQL request failed", {
      operation, status: response.status, durationMs: Date.now() - startedAt,
    });
    throw new Error(`Medium ${operation} failed (${response.status})`);
  }
  let decoded;
  try {
    decoded = JSON.parse(stripMediumXSSI(raw));
  } catch {
    throw new Error(`Medium ${operation} returned invalid JSON`);
  }
  const envelope = Array.isArray(decoded) ? decoded[0] : decoded;
  if (envelope?.errors?.length) {
    const detail = envelope.errors.map((item) => item?.message).filter(Boolean).join("；");
    throw new Error(detail || `Medium ${operation} returned GraphQL errors`);
  }
  console.info("[BlogCTL][medium-detect] GraphQL request completed", {
    operation, status: response.status, durationMs: Date.now() - startedAt,
  });
  return envelope?.data ?? {};
}

async function mediumViewer() {
  const operation = "BlogCTLMediumViewerQuery";
  const query = `query ${operation} { viewer { id username name __typename } }`;
  const data = await mediumGraphQL(operation, query, {}, "/");
  const viewer = data?.viewer;
  if (!viewer?.id) throw new Error("Medium 浏览器会话未登录");
  return viewer;
}

function mediumPostCandidate(post, published, fallbackUsername = "") {
  const id = String(post?.id || "").trim();
  const title = normalizedRemoteTitle(post?.title);
  if (!id || !title) return null;
  const username = String(post?.creator?.username || fallbackUsername || "").trim();
  const uniqueSlug = String(post?.uniqueSlug || "").trim();
  let url = String(post?.mediumUrl || "").trim();
  if (!url && published && username && uniqueSlug) {
    url = `https://medium.com/@${encodeURIComponent(username)}/${uniqueSlug}`;
  }
  if (!url) url = published ? `https://medium.com/p/${id}` : `https://medium.com/p/${id}/edit`;
  return { id, title, url, published };
}

async function mediumLatestPosts(postType, operation, frontendPath, published) {
  const query = `query ${operation}($pagingOptions: PagingOptions) {
    viewer {
      id
      latestPostsConnection(
        type: ${postType}
        includeResponses: false
        includeSuspended: true
        includeDeleted: false
        paging: $pagingOptions
      ) {
        pagingInfo { next { limit to __typename } __typename }
        postPreviews {
          postId
          post {
            id title mediumUrl uniqueSlug isPublished visibility
            creator { id username __typename }
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }`;
  const posts = [];
  let to = "";
  for (let page = 0; page < 10; page += 1) {
    const data = await mediumGraphQL(operation, query, {
      pagingOptions: { to, limit: 25, order: "DESC" },
    }, frontendPath);
    const connection = data?.viewer?.latestPostsConnection;
    for (const preview of connection?.postPreviews ?? []) {
      const candidate = mediumPostCandidate(preview?.post, published);
      if (candidate) posts.push(candidate);
    }
    const next = String(connection?.pagingInfo?.next?.to || "").trim();
    if (!next || next === to) break;
    to = next;
  }
  return posts;
}

async function mediumPublishedPosts(username) {
  const operation = "BlogCTLMediumProfilePostsQuery";
  const query = `query ${operation}($username: ID!, $limit: PaginationLimit, $from: String) {
    userResult(username: $username) {
      __typename
      ... on User {
        id username
        homepagePostsConnection(
          paging: {limit: $limit, from: $from}
          includeDistributedResponses: true
        ) {
          posts {
            id title mediumUrl uniqueSlug isPublished visibility
            creator { id username __typename }
            __typename
          }
          pagingInfo { next { from limit __typename } __typename }
          __typename
        }
        __typename
      }
    }
  }`;
  const posts = [];
  let from = null;
  for (let page = 0; page < 10; page += 1) {
    const data = await mediumGraphQL(operation, query, {
      username, limit: 25, from,
    }, `/@${encodeURIComponent(username)}`);
    const connection = data?.userResult?.homepagePostsConnection;
    for (const post of connection?.posts ?? []) {
      const candidate = mediumPostCandidate(post, true, username);
      if (candidate) posts.push(candidate);
    }
    const next = String(connection?.pagingInfo?.next?.from || "").trim();
    if (!next || next === from) break;
    from = next;
  }
  return posts;
}

async function mediumBrowserMatch(article) {
  const startedAt = Date.now();
  console.info("[BlogCTL][medium-detect] detection started", { article });
  const context = await fetchJSON(`/v1/medium/lookup-context?article=${article}`, { method: "POST" });
  const viewer = await mediumViewer();
  const username = String(viewer.username || viewer.id || "").trim();
  const [draftResult, publishedResult, unlistedResult] = await Promise.allSettled([
    mediumLatestPosts("POST_TYPE_DRAFT", "BlogCTLMediumDraftPostsQuery", "/me/stories", false),
    mediumPublishedPosts(username),
    mediumLatestPosts("POST_TYPE_UNLISTED", "BlogCTLMediumUnlistedPostsQuery", "/me/stories?tab=posts-unlisted", true),
  ]);

  const warnings = [];
  if (draftResult.status === "rejected") warnings.push(`草稿列表失败：${errorMessage(draftResult.reason)}`);
  if (publishedResult.status === "rejected") warnings.push(`已发布列表失败：${errorMessage(publishedResult.reason)}`);
  if (unlistedResult.status === "rejected") warnings.push(`未列出文章失败：${errorMessage(unlistedResult.reason)}`);
  if (draftResult.status === "rejected" && publishedResult.status === "rejected" && unlistedResult.status === "rejected") {
    throw new Error(`Medium 文章列表检测失败：${warnings.join("；")}`);
  }

  const bindings = context.bindings ?? [];
  const candidates = [];
  const seen = new Set();
  const append = (post) => {
    if (!post?.id || seen.has(String(post.id)) || !remoteTitleMatches(context.title, post.title)) return;
    seen.add(String(post.id));
    Object.assign(post, bindingForPost(bindings, post));
    candidates.push(post);
  };
  for (const result of [draftResult, publishedResult, unlistedResult]) {
    if (result.status === "fulfilled") result.value.forEach(append);
  }
  for (const binding of bindings) {
    const id = String(binding?.postId || "").trim();
    if (!id || seen.has(id)) continue;
    const published = binding.state === "published";
    candidates.push({
      id,
      title: context.title,
      url: binding.url || (published ? `https://medium.com/p/${id}` : `https://medium.com/p/${id}/edit`),
      published,
      bound: true,
      bindingState: binding.state || (published ? "published" : "draft"),
    });
  }
  console.info("[BlogCTL][medium-detect] detection completed", {
    article, candidates: candidates.length, warnings: warnings.length, durationMs: Date.now() - startedAt,
  });
  return { candidates, bindings, warnings };
}

async function mediumManualCandidate(postID, state) {
  const id = String(postID || "").trim();
  const normalizedState = String(state || "").trim();
  if (!id || !["draft", "published"].includes(normalizedState)) {
    throw new Error("Medium article id and state are required");
  }
  const viewer = await mediumViewer();
  const username = String(viewer.username || viewer.id || "").trim();
  const lookups = normalizedState === "draft"
    ? [mediumLatestPosts("POST_TYPE_DRAFT", "BlogCTLMediumDraftPostsQuery", "/me/stories", false)]
    : [
        mediumPublishedPosts(username),
        mediumLatestPosts("POST_TYPE_UNLISTED", "BlogCTLMediumUnlistedPostsQuery", "/me/stories?tab=posts-unlisted", true),
      ];
  const results = await Promise.allSettled(lookups);
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const candidate = result.value.find((post) => String(post?.id || "") === id);
    if (candidate) return candidate;
  }
  const errors = results.filter((result) => result.status === "rejected").map((result) => errorMessage(result.reason));
  throw new Error(errors.length ? "Medium 文章核验失败：" + errors.join("；") : "未在当前 Medium 账号中找到该文章 ID");
}

async function bridgeStatus() {
  const extensionVersion = chrome.runtime.getManifest().version;
  try {
    const bridge = await ensureBridge(false);
    const health = await fetchJSON("/v1/health");
    if (!health?.ok) throw new Error("Bridge health check failed.");
    const nativeHostVersion = String(bridge.nativeHostVersion || "");
    const bridgeVersion = String(health.version || "");
    const compatible = nativeHostVersion === extensionVersion && bridgeVersion === extensionVersion;
    const runtime = {
      extensionVersion,
      nativeHostVersion,
      bridgeVersion,
      nativeHostExecutable: String(bridge.executablePath || ""),
      compatible,
    };
    try {
      const result = await fetchJSON("/v1/config");
      return {
        running: true, pid: bridge.pid || 0, configKnown: true, config: result?.config ?? {},
        networkMode: result?.networkMode || "", ...runtime,
      };
    } catch (error) {
      return {
        running: true, pid: bridge.pid || 0, configKnown: false, config: {},
        configError: errorMessage(error), ...runtime,
      };
    }
  } catch (error) {
    bridgeSession = null;
    return {
      running: false, configKnown: false, config: {}, error: errorMessage(error),
      extensionVersion, nativeHostVersion: "", bridgeVersion: "", nativeHostExecutable: "", compatible: false,
    };
  }
}

function runtimeVersionHealth(version, expectedVersion, healthySummary, detail = "", path = "") {
  const normalized = String(version || "").trim();
  if (!normalized) {
    return {
      ok: false, status: "error", summary: "版本未知", version: "",
      detail: ["当前组件未提供版本握手；需要更新本机 BlogCTL runtime。", detail].filter(Boolean).join(" · "),
      path,
    };
  }
  if (normalized !== expectedVersion) {
    return {
      ok: false, status: "error", summary: "版本不一致", version: normalized,
      detail: [`期望 v${expectedVersion}`, detail].filter(Boolean).join(" · "),
      path,
    };
  }
  return { ok: true, status: "ok", summary: healthySummary, version: normalized, detail, path };
}

async function environmentTools(serverTools = []) {
  const bridge = await bridgeStatus();
  const expectedVersion = bridge.extensionVersion || chrome.runtime.getManifest().version;
  const extensionTool = {
    name: "extension",
    displayName: "BlogCTL Extension",
    kind: "runtime",
    description: "浏览器侧控制面、登录态检测与本地 Bridge 调度。",
    required: true,
    health: runtimeVersionHealth(expectedVersion, expectedVersion, "已加载", `Extension ID ${chrome.runtime.id}`),
    config: { scope: "extension", values: {}, defaultExpanded: true },
  };
  const nativeHostTool = {
    name: "native-host",
    displayName: "BlogCTL Native Host",
    kind: "runtime",
    description: "浏览器 Native Messaging 入口；负责定位并启动本机 BlogCTL Bridge。",
    required: true,
    health: bridge.running
      ? runtimeVersionHealth(
          bridge.nativeHostVersion, expectedVersion, "已连接",
          "Native Messaging Host", bridge.nativeHostExecutable,
        )
      : {
          ok: false, status: "error", summary: "未连接", version: bridge.nativeHostVersion || "",
          detail: bridge.error || "Native Host unavailable", path: bridge.nativeHostExecutable || "",
        },
    config: { scope: "native-host", values: {}, defaultExpanded: true },
  };
  const tools = serverTools.map((tool) => {
    if (tool?.name !== "bridge") return tool;
    const current = tool.health ?? {};
    const versionHealth = bridge.running
      ? runtimeVersionHealth(bridge.bridgeVersion || current.version, expectedVersion, "运行中", current.detail || "")
      : {
          ok: false, status: "error", summary: "未运行", version: bridge.bridgeVersion || current.version || "",
          detail: bridge.error || current.detail || "Bridge unavailable",
        };
    return { ...tool, health: { ...current, ...versionHealth } };
  });
  const bridgeTool = tools.find((tool) => tool?.name === "bridge");
  const remainingTools = tools.filter((tool) => tool?.name !== "bridge");
  return [extensionTool, ...(bridgeTool ? [bridgeTool] : []), nativeHostTool, ...remainingTools];
}

async function platformSessionStatus(platform, bridge) {
  if (!bridge.running) return { known: false, synced: false, unavailable: true, expiresInSeconds: 0, error: bridge.error || "BlogCTL Bridge 未运行" };
  try {
    const session = await fetchJSON(`/v1/sessions/${encodeURIComponent(platform)}/status`);
    return { known: true, synced: Boolean(session?.authenticated), expiresInSeconds: Number(session?.expiresInSeconds || 0) };
  } catch (error) {
    return { known: false, synced: false, unavailable: false, expiresInSeconds: 0, error: errorMessage(error) };
  }
}

async function getStatus() {
  const [bridge, platforms] = await Promise.all([bridgeStatus(), allPlatformLoginStatuses()]);
  let publishingPlatforms = [];
  if (bridge.running) {
    try {
      const publishing = await fetchJSON("/v1/publishing");
      publishingPlatforms = publishing?.platforms ?? [];
    } catch (error) {
      console.warn("BlogCTL platform capabilities unavailable:", errorMessage(error));
    }
  }
  const publishingByID = new Map(publishingPlatforms.map((item) => [item.id, item]));
  const enrichedPlatforms = platforms.map((platform) => ({
    ...platform,
    capabilities: publishingByID.get(platform.id)?.capabilities ?? {},
  }));
  const sessionEntries = await Promise.all(
    Object.keys(PLATFORM_SESSIONS).map(async (platform) => [
      platform,
      await platformSessionStatus(platform, bridge),
    ]),
  );
  return { bridge, platforms: enrichedPlatforms, sessions: Object.fromEntries(sessionEntries) };
}

async function saveBridgeConfig(config) {
  return fetchJSON("/v1/config", jsonOptions("PUT", {
    proxyEnabled: Boolean(config?.proxyEnabled),
    proxyHost: String(config?.proxyHost || "").trim(),
    proxyPort: Number(config?.proxyPort || 0),
  }));
}

async function collectPlatformCookieBatches(definition, diagnostics) {
  return collectBrowserSessionCookieBatches(definition, (filter) => chrome.cookies.getAll(filter), (filter, cookies) => {
    if (!diagnostics) return;
    diagnostics.push(cookieQueryDiagnostic(filter, cookies));
  });
}

async function cnBlogsCookieStores() {
  try {
    const stores = await chrome.cookies.getAllCookieStores();
    const tabs = await chrome.tabs.query({ url: ["https://*.cnblogs.com/*", "https://cnblogs.com/*"] });
    const cnBlogsTabIds = new Set(tabs.map((tab) => tab.id));
    return stores.map((store) => ({
      storeId: store.id,
      cnBlogsTabCount: store.tabIds.filter((id) => cnBlogsTabIds.has(id)).length,
    }));
  } catch (error) {
    return [{ error: errorMessage(error) }];
  }
}

async function captureCNBlogsRequestCookieHeader() {
  const url = `https://i.cnblogs.com/api/user?blogctl_cookie_probe=${crypto.randomUUID()}`;
  let resolveCapture;
  const captured = new Promise((resolve) => { resolveCapture = resolve; });
  pendingCNBlogsCookieCaptures.set(url, { url, resolve: resolveCapture });
  try {
    const response = await fetchWithTimeout(url, { cache: "no-store" });
    const header = await Promise.race([captured, delay(1500).then(() => "")]);
    if (!response.ok) throw new Error(`CNBlogs browser auth HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload?.loginName) throw new Error("CNBlogs browser auth has no loginName");
    if (!header) throw new Error("CNBlogs browser request Cookie header was not captured");
    return header;
  } finally {
    pendingCNBlogsCookieCaptures.delete(url);
  }
}

async function capturePlatformRequestCookieHeader(platform) {
  const definition = PLATFORM_SESSIONS[platform];
  const rawURL = String(definition?.sessionProbeUrl || "").trim();
  if (!rawURL) return "";

  const url = new URL(rawURL);
  url.searchParams.set("blogctl_cookie_probe", crypto.randomUUID());
  const expectedURL = url.toString();
  let resolveCapture;
  const captured = new Promise((resolve) => { resolveCapture = resolve; });
  pendingPlatformCookieCaptures.set(expectedURL, { url: expectedURL, resolve: resolveCapture });
  try {
    void fetchWithTimeout(expectedURL, { cache: "no-store" }).catch(() => null);
    const header = await Promise.race([
      captured,
      delay(1500).then(() => ""),
    ]);
    return String(header || "");
  } finally {
    pendingPlatformCookieCaptures.delete(expectedURL);
  }
}

async function captureRequestCookieHeaderForURL(rawURL) {
  const url = new URL(rawURL);
  url.searchParams.set("blogctl_cookie_probe", crypto.randomUUID());
  const expectedURL = url.toString();
  let resolveCapture;
  const captured = new Promise((resolve) => { resolveCapture = resolve; });
  pendingPlatformCookieCaptures.set(expectedURL, { url: expectedURL, resolve: resolveCapture });
  try {
    void fetchWithTimeout(expectedURL, { cache: "no-store" }).catch(() => null);
    const header = await Promise.race([
      captured,
      delay(1500).then(() => ""),
    ]);
    return String(header || "");
  } finally {
    pendingPlatformCookieCaptures.delete(expectedURL);
  }
}

async function selectedPlatformCookies(platform, diagnostics) {
  const definition = PLATFORM_SESSIONS[platform];
  if (!definition) throw new Error(`${platform}: browser session sync is not supported.`);
  const batches = await collectPlatformCookieBatches(definition, diagnostics);
  return selectBrowserSessionCookies(definition, batches);
}

function cookieQuerySummary(diagnostics = []) {
  return diagnostics
    .filter((item) => item && item.target)
    .map((item) => {
      const names = Array.isArray(item.names) && item.names.length ? item.names.join(",") : "none";
      return `${item.target}[${names}]`;
    })
    .join("; ");
}

async function platformHasSessionCookies(platform) {
  if (!PLATFORM_SESSIONS[platform]) return false;
  try {
    return (await selectedPlatformCookies(platform)).length > 0;
  } catch {
    return false;
  }
}

async function syncPlatformSession(platform) {
  const definition = PLATFORM_SESSIONS[platform];
  if (!definition) throw new Error(`${platform}: browser session sync is not supported.`);

  let selected;
  const cookieQueries = [];
  const cookieStores = platform === "cnblogs" ? await cnBlogsCookieStores() : [];
  const requestCookieHeaders = {};
  let requestCookieHeader = platform === "cnblogs"
    ? await captureCNBlogsRequestCookieHeader()
    : await capturePlatformRequestCookieHeader(platform);
  if (platform === "cnblogs") {
    const uploadCookieHeader = await captureRequestCookieHeaderForURL("https://upload.cnblogs.com/v2/images/cors-upload");
    if (uploadCookieHeader) requestCookieHeaders["upload.cnblogs.com"] = uploadCookieHeader;
  }
  try {
    selected = await selectedPlatformCookies(platform, cookieQueries);
  } catch (error) {
    if (requestCookieHeader) {
      selected = [];
    } else {
      const summary = cookieQuerySummary(cookieQueries);
      const detail = summary ? ` Cookie keys seen: ${summary}.` : "";
      throw new Error(`${platform}: ${errorMessage(error)}.${detail} Sign in first.`);
    }
  }

  return fetchJSON(
    `/v1/sessions/${encodeURIComponent(platform)}`,
    jsonOptions("POST", {
      cookies: selected,
      userAgent: navigator.userAgent,
      cookieQueries,
      cookieStores,
      requestCookieHeader,
      requestCookieHeaders,
    }),
  );
}

async function syncBrowserSession(platform) {
  await setBadge("…", "#666666");
  const result = await syncPlatformSession(platform);
  await setBadge("✓", "#1a8917");
  clearBadgeLater();
  return result;
}

async function syncSessionsForPlatforms(platforms = []) {
  const unique = [...new Set(platforms.map((platform) => String(platform || "").trim()).filter(Boolean))];
  for (const platform of unique) {
    const definition = PLATFORM_SESSIONS[platform];
    if (!definition) continue;
    try {
      await syncPlatformSession(platform);
    } catch (error) {
      if (definition.optional === true) {
        console.warn(`${platform}: optional browser session unavailable; platform-native image upload may fall back.`, errorMessage(error));
        continue;
      }
      throw error;
    }
  }
}

async function prepareJobSessions(job) {
  await syncSessionsForPlatforms(job?.platforms ?? []);
}

let browserOperationPumpPromise = null;

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + chunk)));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function browserFetchHeaders(rawHeaders) {
  const headers = new Headers();
  const blocked = new Set(["cookie", "user-agent", "host", "content-length", "origin", "referer"]);
  for (const [name, values] of Object.entries(rawHeaders ?? {})) {
    if (blocked.has(String(name).toLowerCase())) continue;
    for (const value of Array.isArray(values) ? values : [values]) {
      if (value !== undefined && value !== null) headers.append(name, String(value));
    }
  }
  return headers;
}

let mediumBrowserFetchTabId = null;
let mediumBrowserFetchTabOwned = false;

async function ensureMediumBrowserFetchTab() {
  if (mediumBrowserFetchTabId !== null) {
    try {
      const tab = await chrome.tabs.get(mediumBrowserFetchTabId);
      const parsed = new URL(String(tab?.url || ""));
      if (parsed.hostname === "medium.com") {
        if (tab.status !== "complete") await waitForTabLoaded(tab.id);
        return tab.id;
      }
    } catch {}
    mediumBrowserFetchTabId = null;
    mediumBrowserFetchTabOwned = false;
  }

  const existing = await chrome.tabs.query({ url: ["https://medium.com/*"] }).catch(() => []);
  const reusable = existing.find((tab) => tab.id && tab.status === "complete") || existing.find((tab) => tab.id);
  if (reusable?.id) {
    mediumBrowserFetchTabId = reusable.id;
    mediumBrowserFetchTabOwned = false;
    if (reusable.status !== "complete") await waitForTabLoaded(reusable.id, 25000);
    return reusable.id;
  }

  const tab = await chrome.tabs.create({ url: "https://medium.com/me/stories", active: false });
  mediumBrowserFetchTabId = tab.id;
  mediumBrowserFetchTabOwned = true;
  await waitForTabLoaded(tab.id, 25000);
  return tab.id;
}

async function closeBrowserOperationTabs() {
  const tabId = mediumBrowserFetchTabId;
  const owned = mediumBrowserFetchTabOwned;
  mediumBrowserFetchTabId = null;
  mediumBrowserFetchTabOwned = false;
  if (owned && tabId !== null) {
    try { await chrome.tabs.remove(tabId); } catch {}
  }
}

async function executeMediumPageHTTP(payload) {
  const tabId = await ensureMediumBrowserFetchTab();
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async (input) => {
      const rawURL = String(input?.url || "").trim();
      const parsed = new URL(rawURL);
      if (parsed.hostname !== "medium.com") throw new Error("Medium browser proxy only accepts medium.com");
      const blocked = new Set(["cookie", "user-agent", "host", "content-length", "origin", "referer"]);
      const headers = new Headers();
      for (const [name, values] of Object.entries(input?.headers ?? {})) {
        if (blocked.has(String(name).toLowerCase())) continue;
        for (const value of Array.isArray(values) ? values : [values]) {
          if (value !== undefined && value !== null) headers.append(name, String(value));
        }
      }
      const method = String(input?.method || "GET").toUpperCase();
      const options = { method, headers, credentials: "include", redirect: "follow" };
      if (!["GET", "HEAD"].includes(method) && input?.bodyBase64) {
        const binary = atob(String(input.bodyBase64));
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        options.body = bytes;
      }
      const response = await fetch(rawURL, options);
      const responseHeaders = {};
      response.headers.forEach((value, name) => {
        if (!responseHeaders[name]) responseHeaders[name] = [];
        responseHeaders[name].push(value);
      });
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      const chunk = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunk) {
        binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + chunk)));
      }
      return {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: responseHeaders,
        bodyBase64: btoa(binary),
      };
    },
    args: [payload ?? {}],
  });
  const response = result?.[0]?.result;
  if (!response) throw new Error("Medium browser request returned no response");
  try {
    const xsrf = await chrome.cookies.get({ url: "https://medium.com/", name: "xsrf" });
    if (xsrf?.value) {
      response.headers = response.headers ?? {};
      response.headers["set-cookie"] = [`xsrf=${xsrf.value}; Path=/; Secure`];
    }
  } catch {}
  return response;
}

async function executeBrowserHTTP(payload) {
  const rawURL = String(payload?.url || "").trim();
  const target = new URL(rawURL);
  if (!["http:", "https:"].includes(target.protocol)) throw new Error("browser HTTP only supports http(s) URLs");
  if (target.hostname === "medium.com") return executeMediumPageHTTP(payload);

  const method = String(payload?.method || "GET").toUpperCase();
  const options = {
    method,
    headers: browserFetchHeaders(payload?.headers),
    credentials: "include",
    redirect: "follow",
  };
  if (!["GET", "HEAD"].includes(method) && payload?.bodyBase64) {
    options.body = base64ToBytes(payload.bodyBase64);
  }
  const response = await fetch(rawURL, options);
  const responseHeaders = {};
  response.headers.forEach((value, name) => {
    if (!responseHeaders[name]) responseHeaders[name] = [];
    responseHeaders[name].push(value);
  });
  const body = new Uint8Array(await response.arrayBuffer());
  return {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    headers: responseHeaders,
    bodyBase64: bytesToBase64(body),
  };
}

async function waitForTabLoaded(tabId, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.status === "complete") return tab;
    await delay(150);
  }
  throw new Error("browser publish page load timed out");
}

async function waitForPublishedURL(tabId, platform, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let tab;
    try {
      tab = await chrome.tabs.get(tabId);
    } catch {
      break;
    }
    const rawURL = String(tab?.url || "");
    try {
      const parsed = new URL(rawURL);
      if (platform === "segmentfault") {
        const match = parsed.pathname.match(/^\/a\/(\d+)\/?$/);
        if (parsed.hostname === "segmentfault.com" && match) return { id: match[1], url: rawURL };
      }
      if (platform === "51cto") {
        const match = parsed.pathname.match(/^\/([^/]+)\/(\d+)\/?$/);
        if (parsed.hostname === "blog.51cto.com" && match && match[1] !== "blogger") {
          return { id: match[2], url: rawURL };
        }
      }
    } catch {}
    await delay(250);
  }

  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (platformName) => {
        const links = [...document.querySelectorAll("a[href]")].map((item) => item.href);
        if (platformName === "segmentfault") {
          const target = links.find((href) => /^https:\/\/segmentfault\.com\/a\/\d+\/?(?:[?#].*)?$/.test(href));
          if (target) return target;
        }
        if (platformName === "51cto") {
          const target = links.find((href) => {
            try {
              const parsed = new URL(href);
              return parsed.hostname === "blog.51cto.com" &&
                /^\/[^/]+\/\d+\/?$/.test(parsed.pathname) &&
                !parsed.pathname.startsWith("/blogger/");
            } catch {
              return false;
            }
          });
          if (target) return target;
        }
        return "";
      },
      args: [platform],
    });
    const rawURL = String(result?.[0]?.result || "");
    if (rawURL) {
      const parsed = new URL(rawURL);
      const match = platform === "segmentfault"
        ? parsed.pathname.match(/^\/a\/(\d+)\/?$/)
        : parsed.pathname.match(/^\/[^/]+\/(\d+)\/?$/);
      if (match) return { id: match[1], url: rawURL };
    }
  } catch {}
  throw new Error(`${platform} browser publish did not reach a public article URL`);
}

async function segmentFaultPublishInBrowser(payload) {
  const draftId = String(payload?.draftId || "").trim();
  if (!draftId) throw new Error("SegmentFault draft id is required");
  const tab = await chrome.tabs.create({
    url: `https://segmentfault.com/write?draftId=${encodeURIComponent(draftId)}`,
    active: false,
  });
  try {
    await waitForTabLoaded(tab.id);
    let scriptError = null;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (input) => {
          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const waitFor = async (selector, timeout = 12000) => {
            const deadline = Date.now() + timeout;
            while (Date.now() < deadline) {
              const node = document.querySelector(selector);
              if (node) return node;
              await sleep(100);
            }
            throw new Error("SegmentFault editor element missing: " + selector);
          };
          await waitFor("#title");

          const toggle = document.querySelector("#tags-toggle");
          if (toggle) {
            toggle.click();
            await sleep(250);
          }
          const tagInput = document.querySelector('input[placeholder="搜索标签"]');
          if (tagInput) {
            const candidates = [...new Set([
              ...(Array.isArray(input?.tags) ? input.tags : []),
              ...(String(input?.title || "").match(/Go|Java|Python|Redis|Linux|Kubernetes|Docker|并发|后端/gi) || []),
              "后端",
            ].map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 6);
            let added = 0;
            for (const candidate of candidates) {
              tagInput.focus();
              tagInput.value = candidate;
              tagInput.dispatchEvent(new Event("input", { bubbles: true }));
              tagInput.dispatchEvent(new Event("change", { bubbles: true }));
              await sleep(450);
              const options = [...document.querySelectorAll('[role="option"], li, .dropdown-menu a, .search-result-item')]
                .filter((node) => {
                  const text = String(node.textContent || "").trim().toLowerCase();
                  return text && text.includes(candidate.toLowerCase()) && node.offsetParent !== null;
                });
              if (options[0]) {
                options[0].click();
                added += 1;
                await sleep(250);
              }
              if (added >= 2) break;
            }
          }

          const publishToggle = document.querySelector("#publish-toggle");
          if (publishToggle) {
            publishToggle.click();
            await sleep(300);
          }
          const confirm = await waitFor("#sureSubmitBtn", 8000);
          confirm.click();
          return { clicked: true };
        },
        args: [payload ?? {}],
      });
    } catch (error) {
      scriptError = error;
    }
    try {
      return await waitForPublishedURL(tab.id, "segmentfault");
    } catch (publishError) {
      if (scriptError) throw scriptError;
      throw publishError;
    }
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function cto51PublishInBrowser(payload) {
  const draftId = String(payload?.draftId || "").trim();
  if (!draftId) throw new Error("51CTO draft id is required");
  const tab = await chrome.tabs.create({
    url: `https://blog.51cto.com/blogger/draft/${encodeURIComponent(draftId)}`,
    active: false,
  });
  try {
    await waitForTabLoaded(tab.id);
    let scriptError = null;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (input) => {
          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const waitForAny = async (selectors, timeout = 12000) => {
            const deadline = Date.now() + timeout;
            while (Date.now() < deadline) {
              for (const selector of selectors) {
                const node = document.querySelector(selector);
                if (node) return node;
              }
              await sleep(100);
            }
            throw new Error("51CTO editor controls did not appear");
          };

          await waitForAny(["#title", 'textarea[placeholder="请输入正文"]', ".edit-submit"]);
          const publishEntry = document.querySelector(".edit-submit") ||
            [...document.querySelectorAll("button, a")].find((node) => String(node.textContent || "").includes("发布文章"));
          if (!publishEntry) throw new Error("51CTO publish entry button was not found");
          publishEntry.click();
          await sleep(400);

          const title = String(input?.title || "");
          const tags = Array.isArray(input?.tags) ? input.tags.map(String) : [];
          const corpus = (title + " " + tags.join(" ")).toLowerCase();
          let preferredCategory = "后端开发";
          if (/ai|人工智能|llm|agent/.test(corpus)) preferredCategory = "人工智能";
          else if (/mysql|redis|database|数据库|elasticsearch/.test(corpus)) preferredCategory = "数据库";
          else if (/frontend|javascript|typescript|react|vue|前端/.test(corpus)) preferredCategory = "前端开发";
          else if (/kubernetes|docker|linux|服务器|运维/.test(corpus)) preferredCategory = "服务器";

          const categoryNodes = [...document.querySelectorAll(".types-select-box span")].filter((node) => node.offsetParent !== null);
          if (categoryNodes.length) {
            const current = categoryNodes.find((node) => /active|selected|checked/.test(String(node.className || "")));
            if (!current) {
              const preferred = categoryNodes.find((node) => String(node.textContent || "").trim() === preferredCategory) || categoryNodes[0];
              preferred.click();
              await sleep(200);
            }
          }

          const tagInput = document.querySelector("#tag-input");
          if (tagInput && !String(tagInput.value || "").trim()) {
            const candidates = [...new Set([
              ...tags,
              ...(title.match(/Go|Java|Python|Redis|Linux|Kubernetes|Docker|并发编程|后端/gi) || []),
            ].map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 4);
            for (const candidate of candidates) {
              tagInput.focus();
              tagInput.value = candidate;
              tagInput.dispatchEvent(new Event("input", { bubbles: true }));
              tagInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
              tagInput.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
              await sleep(150);
            }
          }

          const abstractInput = document.querySelector("#abstractData");
          if (abstractInput && !String(abstractInput.value || "").trim() && input?.description) {
            abstractInput.value = String(input.description).slice(0, 200);
            abstractInput.dispatchEvent(new Event("input", { bubbles: true }));
            abstractInput.dispatchEvent(new Event("change", { bubbles: true }));
          }

          const confirm = await waitForAny(["#submitForm"], 8000);
          confirm.click();
          return { clicked: true };
        },
        args: [payload ?? {}],
      });
    } catch (error) {
      scriptError = error;
    }
    try {
      return await waitForPublishedURL(tab.id, "51cto");
    } catch (publishError) {
      if (scriptError) throw scriptError;
      throw publishError;
    }
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function executeBrowserOperation(operation) {
  switch (operation?.action) {
    case "http.fetch":
      return executeBrowserHTTP(operation.payload ?? {});
    case "segmentfault.publish":
      return segmentFaultPublishInBrowser(operation.payload ?? {});
    case "51cto.publish":
      return cto51PublishInBrowser(operation.payload ?? {});
    default:
      throw new Error(`unsupported browser operation: ${operation?.action || "unknown"}`);
  }
}

async function pumpBrowserOperations() {
  let lastWorkAt = Date.now();
  const inFlight = new Set();

  const startOperation = (operation) => {
    let task;
    task = (async () => {
      let result = null;
      let error = "";
      try {
        result = await executeBrowserOperation(operation);
      } catch (operationError) {
        error = errorMessage(operationError);
      }
      await fetchJSON(
        `/v1/browser-ops/${encodeURIComponent(operation.id)}`,
        jsonOptions("POST", { result, error }),
      );
    })().finally(() => inFlight.delete(task));
    inFlight.add(task);
  };

  while (Date.now() - lastWorkAt < 5000 || inFlight.size > 0) {
    const pending = await fetchJSON("/v1/browser-ops");
    const operation = pending?.operation;
    if (operation?.id) {
      lastWorkAt = Date.now();
      startOperation(operation);
      continue;
    }
    if (inFlight.size > 0) {
      await Promise.race([...inFlight]);
      lastWorkAt = Date.now();
      continue;
    }
    await delay(100);
  }
  await Promise.allSettled([...inFlight]);
}

function kickBrowserOperationPump() {
  if (browserOperationPumpPromise) return browserOperationPumpPromise;
  browserOperationPumpPromise = pumpBrowserOperations()
    .catch((error) => console.warn("[BlogCTL][browser-op] pump failed", errorMessage(error)))
    .finally(async () => {
      await closeBrowserOperationTabs();
      browserOperationPumpPromise = null;
    });
  return browserOperationPumpPromise;
}

async function handleMessage(message) {
  switch (message.type) {
    case "blogctl.status": return { ok: true, status: await getStatus() };
    case "blogctl.config.save": await saveBridgeConfig(message.config); return { ok: true, status: await getStatus() };
    case "blogctl.sync":
    case "blogctl.session.sync": {
      const platform = message.platform || "medium";
      await syncBrowserSession(platform);
      return { ok: true, status: await getStatus() };
    }
    case "blogctl.articles": {
      const result = await fetchJSON("/v1/articles");
      return { ok: true, articles: result?.articles ?? [] };
    }
    case "blogctl.publications": {
      const result = await fetchJSON("/v1/publications");
      return { ok: true, records: result?.records ?? [] };
    }
    case "blogctl.publication.reconcile": {
      const article = String(message.article || "").trim();
      const platform = String(message.platform || "").trim();
      if (!article || !platform) throw new Error("article and platform are required");
      const publishing = await fetchJSON("/v1/publishing");
      const profile = (publishing?.platforms ?? []).find((item) => item.id === platform);
      if (profile?.capabilities?.browserSession === true) {
        await syncPlatformSession(platform);
      }
      const query = new URLSearchParams({ article, platform });
      const result = await fetchJSON(`/v1/publications/reconcile?${query.toString()}`, { method: "POST" });
      return { ok: true, reconciliation: result?.reconciliation ?? null };
    }
    case "blogctl.publication.pending.resolve": {
      const article = String(message.article || "").trim();
      const platform = String(message.platform || "").trim();
      if (!article || !platform) throw new Error("article and platform are required");
      const query = new URLSearchParams({ article, platform });
      const result = await fetchJSON(`/v1/publications/pending/resolve?${query.toString()}`, jsonOptions("POST", {
        fields: Array.isArray(message.fields) ? message.fields : [],
      }));
      return { ok: true, pendingFields: result?.pendingFields ?? [] };
    }
    case "blogctl.article.match": {
      const article = encodeURIComponent(String(message.article || ""));
      const platform = String(message.platform || "");
      if (!article || !platform) throw new Error("article and platform are required");
      if (platform === "cnblogs") {
        const current = await fetchJSON(`/v1/cnblogs/binding?article=${article}`);
        await syncPlatformSession("cnblogs");
        const result = await fetchJSON(`/v1/cnblogs/binding/search?article=${article}`, { method: "POST" });
        const candidates = result.candidates ?? [];
        const bindings = current.bindings ?? [];
        const items = candidates.map((post) => ({
          title: String(post.title || "").replace(/<\/?strong>/gi, ""),
          id: post.id, published: post.published, url: post.url || (post.published ? "" : `https://i.cnblogs.com/articles/edit;postId=${post.id}`),
          bound: bindings.some((binding) => binding.postId === post.id),
          bindingState: bindings.find((binding) => binding.postId === post.id)?.state || "",
        }));
        const warnings = [];
        for (const binding of bindings) {
          try {
            const verified = await fetchJSON(`/v1/cnblogs/binding/verify?article=${article}&state=${binding.state}`, { method: "POST" });
            const post = verified.post;
            const existing = items.find((item) => item.id === post.id);
            if (existing) { existing.bound = true; existing.published = post.published; existing.bindingState = binding.state; }
            else items.unshift({ title: post.title, id: post.id, published: post.published, url: post.url || (post.published ? "" : `https://i.cnblogs.com/articles/edit;postId=${post.id}`), bound: true, bindingState: binding.state });
          } catch (error) {
            warnings.push(`${binding.state === "published" ? "已发布" : "草稿"} ID ${binding.postId} 核验失败：${errorMessage(error)}`);
            if (!items.some((item) => item.id === binding.postId)) items.unshift({ title: `已绑定 ID ${binding.postId}（核验失败）`, id: binding.postId, published: binding.state === "published", bound: true, bindingState: binding.state, unverified: true });
          }
        }
        return { ok: true, match: { text: `远端找到 ${candidates.length} 篇候选。${warnings.join("；")}`, items, bindings } };
      }
      if (platform === "segmentfault") {
        await syncPlatformSession("segmentfault");
        const result = await fetchJSON(`/v1/segmentfault/articles/list?article=${article}`, { method: "POST" });
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `从草稿列表和文章列表本地匹配到 ${candidates.length} 条候选。`
            : "已读取思否草稿列表和文章列表，本地未匹配到同名文章。",
          items: candidates.map((post) => ({
            title: post.title,
            id: post.id,
            published: post.published,
            url: post.url || "",
            bound: Boolean(post.bound),
            bindingState: post.bindingState || "",
          })),
          bindings: result.bindings ?? [],
        } };
      }
      if (platform === "zhihu") {
        await syncPlatformSession("zhihu");
        const result = await fetchJSON(`/v1/zhihu/articles/list?article=${article}`, { method: "POST" });
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `从知乎草稿列表和已发布文章列表本地匹配到 ${candidates.length} 条候选。`
            : "已读取知乎草稿列表和已发布文章列表，本地未匹配到同名文章。",
          items: candidates.map((post) => ({
            title: post.title,
            id: post.id,
            published: post.published,
            url: post.url || "",
            bound: Boolean(post.bound),
            bindingState: post.bindingState || "",
          })),
          bindings: result.bindings ?? [],
        } };
      }
      if (platform === "oschina") {
        await syncPlatformSession("oschina");
        const result = await fetchJSON(`/v1/oschina/articles/list?article=${article}`, { method: "POST" });
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `从开源中国草稿列表和已发布文章列表本地匹配到 ${candidates.length} 条候选。`
            : "已读取开源中国草稿列表和已发布文章列表，本地未匹配到同名文章。",
          items: candidates.map((post) => ({
            title: post.title,
            id: post.id,
            published: post.published,
            url: post.url || "",
            bound: Boolean(post.bound),
            bindingState: post.bindingState || "",
          })),
          bindings: result.bindings ?? [],
        } };
      }
      if (platform === "juejin") {
        await syncPlatformSession("juejin");
        const result = await fetchJSON(`/v1/juejin/articles/list?article=${article}`, { method: "POST" });
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `已核验掘金本地草稿 ID，并通过搜索匹配到 ${candidates.length} 条候选。`
            : "已检索掘金草稿与已发布文章，本地未匹配到同名文章。",
          items: candidates.map((post) => ({
            title: post.title,
            id: post.id,
            published: post.published,
            url: post.url || "",
            bound: Boolean(post.bound),
            bindingState: post.bindingState || "",
          })),
          bindings: result.bindings ?? [],
        } };
      }
      if (platform === "51cto") {
        await syncPlatformSession("51cto");
        const result = await fetchJSON(`/v1/51cto/articles/list?article=${article}`, { method: "POST" });
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `从 51CTO 草稿列表本地匹配到 ${candidates.length} 条候选。`
            : "已读取 51CTO 草稿列表，本地未匹配到同名草稿。",
          items: candidates.map((post) => ({
            title: post.title,
            id: post.id,
            published: post.published,
            url: post.url || "",
            bound: Boolean(post.bound),
            bindingState: post.bindingState || "",
          })),
          bindings: result.bindings ?? [],
        } };
      }
      if (platform === "medium") {
        await syncPlatformSession("medium");
        const result = await mediumBrowserMatch(article);
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: (candidates.length
            ? `从 Medium 草稿和已发布文章列表本地匹配到 ${candidates.length} 条候选。`
            : "已通过 Medium GraphQL 读取文章列表，本地未匹配到同名文章。") +
            (result.warnings?.length ? ` 部分检测异常：${result.warnings.join("；")}` : ""),
          items: candidates.map((post) => ({
            title: post.title,
            id: post.id,
            published: post.published,
            url: post.url || "",
            bound: Boolean(post.bound),
            bindingState: post.bindingState || "",
          })),
          bindings: result.bindings ?? [],
        } };
      }
      if (platform === "devto") {
        const result = await fetchJSON(`/v1/devto/articles/search?article=${article}`, { method: "POST" });
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `从 DEV.to 全部文章列表本地匹配到 ${candidates.length} 条候选${result.truncated ? "；仅检索了前 500 篇" : ""}。`
            : result.truncated ? "前 500 篇中未匹配到候选，结果尚不完整。" : "已读取 DEV.to 全部文章列表，本地未匹配到对应文章。",
          items: candidates.map((post) => ({
            title: post.title,
            id: post.id,
            published: post.published,
            url: post.url || "",
            bound: Boolean(post.bound),
            bindingState: post.bindingState || "",
          })),
          bindings: result.bindings ?? [],
        } };
      }
      if (platform === "csdn") {
        await syncPlatformSession("csdn");
        const result = await fetchJSON(`/v1/csdn/articles/list?article=${article}`, { method: "POST" });
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `从 CSDN 草稿列表和已发布文章列表本地匹配到 ${candidates.length} 条候选。`
            : "已读取 CSDN 草稿列表和已发布文章列表，本地未匹配到同名文章。",
          items: candidates.map((post) => ({
            title: post.title,
            id: post.id,
            published: post.published,
            url: post.url || "",
            bound: Boolean(post.bound),
            bindingState: post.bindingState || "",
          })),
          bindings: result.bindings ?? [],
        } };
      }
      const result = await fetchJSON(`/v1/article-links?article=${article}`);
      const link = result.links?.[platform];
      const reference = link?.remoteId || link?.publishedUrl || link?.draftUrl;
      return { ok: true, match: { text: reference
        ? `本地记录：${reference} · 尚未远端验证（当前平台不支持在线查找）`
        : "当前平台尚不支持在线查找；本地没有文章关联记录。",
        items: reference ? [{ title: "本地历史记录（未远端验证）", id: link.remoteId || "未知", published: Boolean(link.publishedUrl), url: link.publishedUrl || link.draftUrl || "", localOnly: true }] : [] } };
    }
    case "blogctl.cnblogs.binding": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/cnblogs/binding?article=${article}`)) };
    }
    case "blogctl.cnblogs.search": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("cnblogs");
      return { ok: true, ...(await fetchJSON(`/v1/cnblogs/binding/search?article=${article}`, { method: "POST" })) };
    }
    case "blogctl.cnblogs.bind": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("cnblogs");
      return { ok: true, ...(await fetchJSON(`/v1/cnblogs/binding?article=${article}`, jsonOptions("POST", { reference: message.reference ?? "", replace: message.replace === true }))) };
    }
    case "blogctl.cnblogs.unbind": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/cnblogs/binding?article=${article}`, jsonOptions("DELETE", { state: message.state, postId: message.postId }))) };
    }
    case "blogctl.segmentfault.bind": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("segmentfault");
      return { ok: true, ...(await fetchJSON(`/v1/segmentfault/binding?article=${article}`, jsonOptions("POST", {
        postId: message.postId ?? "",
        state: message.state ?? "",
        replace: message.replace === true,
      }))) };
    }
    case "blogctl.segmentfault.unbind": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/segmentfault/binding?article=${article}`, jsonOptions("DELETE", {
        state: message.state,
        postId: message.postId,
      }))) };
    }
    case "blogctl.zhihu.bind": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("zhihu");
      return { ok: true, ...(await fetchJSON(`/v1/zhihu/binding?article=${article}`, jsonOptions("POST", {
        postId: message.postId ?? "",
        state: message.state ?? "",
        replace: message.replace === true,
        candidate: message.candidate ?? null,
      }))) };
    }
    case "blogctl.zhihu.unbind": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/zhihu/binding?article=${article}`, jsonOptions("DELETE", {
        state: message.state,
        postId: message.postId,
      }))) };
    }
    case "blogctl.oschina.bind": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("oschina");
      return { ok: true, ...(await fetchJSON(`/v1/oschina/binding?article=${article}`, jsonOptions("POST", {
        postId: message.postId ?? "",
        state: message.state ?? "",
        replace: message.replace === true,
      }))) };
    }
    case "blogctl.oschina.unbind": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/oschina/binding?article=${article}`, jsonOptions("DELETE", {
        state: message.state,
        postId: message.postId,
      }))) };
    }
    case "blogctl.juejin.bind": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("juejin");
      return { ok: true, ...(await fetchJSON(`/v1/juejin/binding?article=${article}`, jsonOptions("POST", {
        postId: message.postId ?? "",
        state: message.state ?? "",
        replace: message.replace === true,
      }))) };
    }
    case "blogctl.juejin.unbind": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/juejin/binding?article=${article}`, jsonOptions("DELETE", {
        state: message.state,
        postId: message.postId,
      }))) };
    }
    case "blogctl.51cto.bind": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("51cto");
      return { ok: true, ...(await fetchJSON(`/v1/51cto/binding?article=${article}`, jsonOptions("POST", {
        postId: message.postId ?? "",
        state: message.state ?? "",
        replace: message.replace === true,
      }))) };
    }
    case "blogctl.51cto.unbind": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/51cto/binding?article=${article}`, jsonOptions("DELETE", {
        state: message.state,
        postId: message.postId,
      }))) };
    }
    case "blogctl.devto.bind": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/devto/binding?article=${article}`, jsonOptions("POST", {
        postId: message.postId ?? "",
        state: message.state ?? "",
        replace: message.replace === true,
      }))) };
    }
    case "blogctl.devto.unbind": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/devto/binding?article=${article}`, jsonOptions("DELETE", {
        state: message.state,
        postId: message.postId,
      }))) };
    }
    case "blogctl.csdn.bind": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("csdn");
      return { ok: true, ...(await fetchJSON(`/v1/csdn/binding?article=${article}`, jsonOptions("POST", {
        postId: message.postId ?? "",
        state: message.state ?? "",
        replace: message.replace === true,
      }))) };
    }
    case "blogctl.csdn.unbind": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/csdn/binding?article=${article}`, jsonOptions("DELETE", {
        state: message.state,
        postId: message.postId,
      }))) };
    }
    case "blogctl.medium.bind": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("medium");
      let candidate = message.candidate ?? null;
      if (!candidate && message.manual === true) candidate = await mediumManualCandidate(message.postId, message.state);
      return { ok: true, ...(await fetchJSON(`/v1/medium/binding?article=${article}`, jsonOptions("POST", {
        postId: message.postId ?? "",
        state: message.state ?? "",
        replace: message.replace === true,
        candidate,
        manual: message.manual === true,
      }))) };
    }
    case "blogctl.medium.unbind": {
      const article = encodeURIComponent(String(message.article || ""));
      return { ok: true, ...(await fetchJSON(`/v1/medium/binding?article=${article}`, jsonOptions("DELETE", {
        state: message.state,
        postId: message.postId,
      }))) };
    }
    case "blogctl.cnblogs.update": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("cnblogs");
      return { ok: true, ...(await fetchJSON(`/v1/cnblogs/binding/update?article=${article}`, { method: "POST" })) };
    }
    case "blogctl.tools": {
      const result = await fetchJSON("/v1/tools");
      return { ok: true, tools: await environmentTools(result?.tools ?? []) };
    }
    case "blogctl.tool.save": {
      const name = String(message.name || "").trim();
      if (!name) throw new Error("tool name is required");
      const result = await fetchJSON(`/v1/tools/${encodeURIComponent(name)}`, jsonOptions("PUT", { config: message.config ?? {} }));
      return { ok: true, tools: await environmentTools(result?.tools ?? []) };
    }
    case "blogctl.tool.action": {
      const name = String(message.name || "").trim();
      const action = String(message.action || "").trim();
      if (name === "bridge" && action === "restart") {
        const bridge = await restartBridge();
        return { ok: true, bridge };
      }
      throw new Error(`unsupported tool action: ${name}/${action}`);
    }
    case "blogctl.publishing": {
      const result = await fetchJSON("/v1/publishing");
      return {
        ok: true,
        platforms: result?.platforms ?? [],
        compiler: result?.compiler ?? {},
        assets: result?.assets ?? {},
        assetStatus: result?.assetStatus ?? {},
      };
    }
    case "blogctl.publishing.save": {
      const result = await fetchJSON("/v1/publishing", jsonOptions("PUT", {
        platforms: message.platforms ?? [],
        compiler: message.compiler,
        assets: message.assets,
      }));
      return {
        ok: true,
        platforms: result?.platforms ?? [],
        compiler: result?.compiler ?? {},
        assets: result?.assets ?? {},
        assetStatus: result?.assetStatus ?? {},
      };
    }
    case "blogctl.jobs": {
      const result = await fetchJSON("/v1/sync/jobs");
      return { ok: true, jobs: result?.jobs ?? [] };
    }
    case "blogctl.job.start": {
      const request = message.request ?? {};
      await syncSessionsForPlatforms(request.platforms ?? []);
      await fetchJSON("/v1/browser-ops/enable", { method: "POST" });
      const result = await fetchJSON("/v1/sync/jobs", jsonOptions("POST", request));
      void kickBrowserOperationPump();
      return { ok: true, job: result?.job };
    }
    case "blogctl.job.get": {
      const id = String(message.id || "").trim();
      if (!id) throw new Error("job id is required");
      void kickBrowserOperationPump();
      const result = await fetchJSON(`/v1/sync/jobs/${encodeURIComponent(id)}`);
      return { ok: true, job: result?.job };
    }
    case "blogctl.job.delete": {
      const id = String(message.id || "").trim();
      if (!id) throw new Error("job id is required");
      await fetchJSON(`/v1/sync/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
      return { ok: true };
    }
    case "blogctl.jobs.clear": {
      const result = await fetchJSON("/v1/sync/jobs", { method: "DELETE" });
      return { ok: true, jobs: result?.jobs ?? [], removed: Number(result?.removed || 0) };
    }
    case "blogctl.job.retry": {
      const id = String(message.id || "").trim();
      if (!id) throw new Error("job id is required");
      const current = await fetchJSON(`/v1/sync/jobs/${encodeURIComponent(id)}`);
      await syncSessionsForPlatforms(current?.job?.platforms ?? []);
      await fetchJSON("/v1/browser-ops/enable", { method: "POST" });
      const result = await fetchJSON(`/v1/sync/jobs/${encodeURIComponent(id)}/retry`, { method: "POST" });
      void kickBrowserOperationPump();
      return { ok: true, job: result?.job };
    }
    case "blogctl.job.publish": {
      const id = String(message.id || "").trim();
      if (!id) throw new Error("job id is required");
      const current = await fetchJSON(`/v1/sync/jobs/${encodeURIComponent(id)}`);
      await prepareJobSessions(current?.job);
      await fetchJSON("/v1/browser-ops/enable", { method: "POST" });
      const result = await fetchJSON(`/v1/sync/jobs/${encodeURIComponent(id)}/publish`, { method: "POST" });
      void kickBrowserOperationPump();
      return { ok: true, job: result?.job };
    }
    default: return null;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;
  const task = handleMessage(message);
  if (!task) return false;
  task.then(sendResponse).catch(async (error) => {
    console.error("BlogCTL extension request failed:", message.type, errorMessage(error));
    if (message.type === "blogctl.sync" || message.type === "blogctl.session.sync") {
      await setBadge("!", "#b42318");
      clearBadgeLater();
    }
    sendResponse({ ok: false, error: errorMessage(error), code: error?.code || "", status: error?.status || 0, details: error?.details || null });
  });
  return true;
});
