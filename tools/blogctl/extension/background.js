import { PLATFORM_AUTH, PLATFORM_SESSIONS } from "./platforms.js";
import { collectBrowserSessionCookieBatches, cookieHeaderFromRequest, cookieQueryDiagnostic, selectBrowserSessionCookies } from "./session.js";
import { toError } from "./errors.js";

const NATIVE_HOST = "com.thinkerqaq.blogctl";
const AUTH_TIMEOUT_MS = 7000;
const BRIDGE_CACHE_MS = 30000;
let bridgeSession = null;
const pendingCNBlogsCookieCaptures = new Map();
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
        id: definition.id, label: definition.label, known: true, loggedIn: true, inferred: true,
        warning: "Login probe did not match, but browser session cookies are available.",
      };
    }
    return { id: definition.id, label: definition.label, known: true, loggedIn: false, inferred: false };
  } catch (error) {
    if (definition.id !== "cnblogs" && await platformHasSessionCookies(definition.id)) {
      return {
        id: definition.id, label: definition.label, known: true, loggedIn: true, inferred: true,
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
    const response = await fetch(`${bridge.baseUrl}${pathname}`, options);
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

async function bridgeStatus() {
  try {
    const bridge = await ensureBridge(false);
    const health = await fetchJSON("/v1/health");
    if (!health?.ok) throw new Error("Bridge health check failed.");
    try {
      const result = await fetchJSON("/v1/config");
      return { running: true, pid: bridge.pid || 0, configKnown: true, config: result?.config ?? {}, networkMode: result?.networkMode || "" };
    } catch (error) {
      return { running: true, pid: bridge.pid || 0, configKnown: false, config: {}, configError: errorMessage(error) };
    }
  } catch (error) {
    bridgeSession = null;
    return { running: false, configKnown: false, config: {}, error: errorMessage(error) };
  }
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

async function selectedPlatformCookies(platform, diagnostics) {
  const definition = PLATFORM_SESSIONS[platform];
  if (!definition) throw new Error(`${platform}: browser session sync is not supported.`);
  const batches = await collectPlatformCookieBatches(definition, diagnostics);
  return selectBrowserSessionCookies(definition, batches);
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
  const requestCookieHeader = platform === "cnblogs" ? await captureCNBlogsRequestCookieHeader() : "";
  try {
    selected = await selectedPlatformCookies(platform, platform === "cnblogs" ? cookieQueries : undefined);
  } catch (error) {
    if (platform === "cnblogs" && errorMessage(error) === "no browser cookies were available") selected = [];
    else throw new Error(`${platform}: ${errorMessage(error)}. Sign in first.`);
  }

  return fetchJSON(
    `/v1/sessions/${encodeURIComponent(platform)}`,
    jsonOptions("POST", { cookies: selected, userAgent: navigator.userAgent, cookieQueries, cookieStores, requestCookieHeader }),
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
    if (!PLATFORM_SESSIONS[platform]) continue;
    await syncPlatformSession(platform);
  }
}

async function prepareJobSessions(job) {
  await syncSessionsForPlatforms(job?.platforms ?? []);
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
      if (platform === "devto") {
        const result = await fetchJSON(`/v1/devto/articles/search?article=${article}`, { method: "POST" });
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `远端找到 ${candidates.length} 篇候选文章${result.truncated ? "；仅检索了前 500 篇" : ""}。DEV.to 当前仅支持查找，尚不支持手动绑定。`
            : result.truncated ? "前 500 篇中未找到候选文章，结果尚不完整。DEV.to 暂不支持手动绑定。" : "远端未找到候选文章。DEV.to 暂不支持手动绑定。",
          items: candidates.map((post) => ({ title: post.title, id: post.id, published: post.published, url: post.url || "" })),
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
    case "blogctl.cnblogs.update": {
      const article = encodeURIComponent(String(message.article || ""));
      await syncPlatformSession("cnblogs");
      return { ok: true, ...(await fetchJSON(`/v1/cnblogs/binding/update?article=${article}`, { method: "POST" })) };
    }
    case "blogctl.tools": {
      const result = await fetchJSON("/v1/tools");
      return { ok: true, tools: result?.tools ?? [] };
    }
    case "blogctl.tool.save": {
      const name = String(message.name || "").trim();
      if (!name) throw new Error("tool name is required");
      const result = await fetchJSON(`/v1/tools/${encodeURIComponent(name)}`, jsonOptions("PUT", { config: message.config ?? {} }));
      return { ok: true, tools: result?.tools ?? [] };
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
      const result = await fetchJSON("/v1/sync/jobs", jsonOptions("POST", request));
      return { ok: true, job: result?.job };
    }
    case "blogctl.job.get": {
      const id = String(message.id || "").trim();
      if (!id) throw new Error("job id is required");
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
      const result = await fetchJSON(`/v1/sync/jobs/${encodeURIComponent(id)}/retry`, { method: "POST" });
      return { ok: true, job: result?.job };
    }
    case "blogctl.job.publish": {
      const id = String(message.id || "").trim();
      if (!id) throw new Error("job id is required");
      const current = await fetchJSON(`/v1/sync/jobs/${encodeURIComponent(id)}`);
      await prepareJobSessions(current?.job);
      const result = await fetchJSON(`/v1/sync/jobs/${encodeURIComponent(id)}/publish`, { method: "POST" });
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
