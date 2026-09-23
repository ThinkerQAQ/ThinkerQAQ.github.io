import { PLATFORM_AUTH, PLATFORM_SESSIONS } from "./platforms.js";
import { collectBrowserSessionCookieBatches, cookieHeaderFromRequest, cookieQueryDiagnostic, selectBrowserSessionCookies } from "./session.js";
import { toError } from "./errors.js";

const NATIVE_HOST = "com.thinkerqaq.blogctl";
const AUTH_TIMEOUT_MS = 7000;
const BRIDGE_CACHE_MS = 30000;
let bridgeSession = null;
const pendingCNBlogsCookieCaptures = new Map();
const pendingPlatformCookieCaptures = new Map();
const recentZhihuSignedRequests = new Map();
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

chrome.webRequest.onSendHeaders.addListener((details) => {
  const url = String(details.url || "");
  const kind = url.includes("/api/v4/articles/my_drafts") ? "drafts"
    : (/\/api\/v4\/members\/[^/]+\/articles/.test(url) ? "published" : "");
  if (!kind || Number(details.tabId) < 0) return;
  const headers = {};
  for (const header of details.requestHeaders ?? []) {
    const name = String(header.name || "").toLowerCase();
    if (name === "x-zse-93" || name === "x-zse-96" || name === "x-requested-with") {
      headers[name] = String(header.value || "");
    }
  }
  if (!headers["x-zse-96"]) return;
  recentZhihuSignedRequests.set(Number(details.tabId), {
    kind, url, headers, capturedAt: Date.now(),
  });
}, {
  urls: [
    "https://www.zhihu.com/api/v4/articles/my_drafts*",
    "https://www.zhihu.com/api/v4/members/*/articles*",
  ],
}, ["requestHeaders", "extraHeaders"]);

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

function csdnArticleID(reference) {
  try {
    const parsed = new URL(String(reference || ""));
    const articleId = parsed.searchParams.get("articleId");
    if (/^\d+$/.test(articleId || "")) return articleId;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = parts.at(-1) || "";
    return /^\d+$/.test(last) ? last : "";
  } catch {
    return /^\d+$/.test(String(reference || "").trim()) ? String(reference).trim() : "";
  }
}

async function waitForTabReady(tabId, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) throw new Error("浏览器检测标签页已关闭");
    if (tab.status === "complete") return tab;
    await delay(100);
  }
  throw new Error("浏览器检测页面加载超时");
}

async function runFirstPartyFetch(pageURL, requestURL) {
  const existingTabs = await chrome.tabs.query({ url: [new URL(pageURL).origin + "/*"] });
  const existing = existingTabs.find((tab) => Number(tab.id) >= 0);
  let tabId = Number(existing?.id ?? -1);
  let created = false;
  try {
    if (tabId < 0) {
      const tab = await chrome.tabs.create({ url: pageURL, active: false });
      tabId = Number(tab?.id ?? -1);
      created = true;
    }
    if (tabId < 0) throw new Error("无法创建平台检测标签页");
    await waitForTabReady(tabId);
    if (created) await delay(500);

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [requestURL],
      func: async (rawURL) => {
        try {
          const response = await fetch(rawURL, {
            credentials: "include",
            cache: "no-store",
            headers: { accept: "application/json, text/plain, */*" },
          });
          return { ok: response.ok, status: response.status, url: response.url, text: await response.text() };
        } catch (error) {
          return { ok: false, status: 0, url: rawURL, error: error?.message || String(error), text: "" };
        }
      },
    });
    const value = results?.[0]?.result;
    if (!value) throw new Error("平台页面没有返回检测结果");
    return value;
  } finally {
    if (created && tabId >= 0) {
      await chrome.tabs.remove(tabId).catch(() => {});
    }
  }
}

async function csdnBrowserMatch(article) {
  const context = await fetchJSON(`/v1/csdn/lookup-context?article=${article}`, { method: "POST" });
  const query = new URLSearchParams({
    page: "1",
    size: "100",
    businessType: "lately",
    noMore: "false",
    username: String(context.account || ""),
  });
  const pageURL = `https://blog.csdn.net/${encodeURIComponent(String(context.account || ""))}`;
  const requestURL = `https://blog.csdn.net/community/home-api/v1/get-business-list?${query.toString()}`;
  const response = await runFirstPartyFetch(pageURL, requestURL);
  const raw = String(response.text || "");
  if (!response.ok || /Security Verification|请进行安全验证/i.test(raw)) {
    throw new Error(`CSDN 页面上下文仍被安全验证拦截（HTTP ${response.status || 0}）`);
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("CSDN 页面上下文返回了非 JSON 文章列表");
  }
  if (Number(payload?.code) !== 200) {
    throw new Error(payload?.message || payload?.msg || "CSDN 浏览器文章列表请求失败");
  }
  const bindings = context.bindings ?? [];
  const matched = [];
  const seen = new Set();
  for (const value of payload?.data?.list ?? []) {
    const id = csdnArticleID(value?.url);
    const title = normalizedRemoteTitle(value?.title);
    if (!id || !title || !remoteTitleMatches(context.title, title)) continue;
    const post = { id, title, url: String(value?.url || ""), published: true };
    Object.assign(post, bindingForPost(bindings, post));
    matched.push(post);
    seen.add(id);
  }
  for (const post of context.boundPosts ?? []) {
    if (seen.has(String(post.id))) continue;
    matched.push({
      title: post.title,
      id: post.id,
      published: Boolean(post.published),
      url: post.url || "",
      bound: Boolean(post.bound),
      bindingState: post.bindingState || "",
    });
  }
  return { candidates: matched, bindings };
}

async function fetchZhihuSignedPage(kind, pageURL) {
  let tabId = -1;
  try {
    const tab = await chrome.tabs.create({ url: pageURL, active: false });
    tabId = Number(tab?.id ?? -1);
    if (tabId < 0) throw new Error("无法创建知乎后台检测标签页");

    const deadline = Date.now() + 10000;
    let captured = null;
    while (Date.now() < deadline) {
      const current = recentZhihuSignedRequests.get(tabId);
      if (current?.kind === kind && Date.now() - current.capturedAt < 10000) {
        captured = current;
        break;
      }
      await delay(100);
    }
    if (!captured) {
      throw new Error(`知乎页面未产生 ${kind === "drafts" ? "草稿" : "已发布文章"}签名列表请求`);
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [captured.url, captured.headers],
      func: async (rawURL, requestHeaders) => {
        try {
          const response = await fetch(rawURL, {
            credentials: "include",
            cache: "no-store",
            headers: requestHeaders,
          });
          return {
            ok: response.ok,
            status: response.status,
            text: await response.text(),
          };
        } catch (error) {
          return { ok: false, status: 0, text: "", error: error?.message || String(error) };
        }
      },
    });
    const value = results?.[0]?.result;
    if (!value) throw new Error("知乎页面没有返回列表检测结果");
    if (!value.ok) {
      throw new Error(`知乎页面列表请求失败（HTTP ${value.status || 0}）${value.error ? ` · ${value.error}` : ""}`);
    }
    try {
      return JSON.parse(value.text);
    } catch {
      throw new Error("知乎页面列表返回了非 JSON 响应");
    }
  } finally {
    if (tabId >= 0) {
      recentZhihuSignedRequests.delete(tabId);
      await chrome.tabs.remove(tabId).catch(() => {});
    }
  }
}

async function zhihuBrowserMatch(article) {
  const context = await fetchJSON(`/v1/zhihu/lookup-context?article=${article}`, { method: "POST" });
  const draftPage = "https://www.zhihu.com/creator/manage/creation/draft?type=article";
  const profilePage = `https://www.zhihu.com/people/${encodeURIComponent(context.account)}/posts`;

  const [draftPayload, publishedPayload] = await Promise.all([
    fetchZhihuSignedPage("drafts", draftPage),
    fetchZhihuSignedPage("published", profilePage),
  ]);

  const bindings = context.bindings ?? [];
  const candidates = [];
  const seen = new Set();
  const append = (value, published) => {
    const id = String(value?.url_token || value?.id || "").trim();
    const title = normalizedRemoteTitle(value?.title);
    if (!id || !title || !remoteTitleMatches(context.title, title) || seen.has(id)) return;
    seen.add(id);
    const rawURL = String(value?.url || "");
    const url = published
      ? (rawURL ? rawURL.replace(/^http:\/\//, "https://") : `https://zhuanlan.zhihu.com/p/${encodeURIComponent(id)}`)
      : `https://zhuanlan.zhihu.com/p/${encodeURIComponent(id)}/edit`;
    const post = { id, title, url, published };
    Object.assign(post, bindingForPost(bindings, post));
    candidates.push(post);
  };
  for (const value of draftPayload?.data ?? []) append(value, false);
  for (const value of publishedPayload?.data ?? []) append(value, true);
  return { candidates, bindings };
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

async function capturePlatformNavigationCookieHeader(platform) {
  const definition = PLATFORM_SESSIONS[platform];
  const rawURL = String(definition?.sessionProbeUrl || "").trim();
  if (!rawURL || !chrome.tabs?.create || !chrome.tabs?.remove) return "";

  const url = new URL(rawURL);
  url.searchParams.set("blogctl_cookie_probe", crypto.randomUUID());
  const expectedURL = url.toString();
  let resolveCapture;
  const captured = new Promise((resolve) => { resolveCapture = resolve; });
  pendingPlatformCookieCaptures.set(expectedURL, { url: expectedURL, resolve: resolveCapture });
  let tabId = null;
  try {
    const tab = await chrome.tabs.create({ url: expectedURL, active: false });
    tabId = tab?.id ?? null;
    const header = await Promise.race([
      captured,
      delay(2500).then(() => ""),
    ]);
    return String(header || "");
  } catch {
    return "";
  } finally {
    pendingPlatformCookieCaptures.delete(expectedURL);
    if (tabId !== null) {
      await chrome.tabs.remove(tabId).catch(() => {});
    }
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
  let requestCookieHeader = platform === "cnblogs"
    ? await captureCNBlogsRequestCookieHeader()
    : await capturePlatformRequestCookieHeader(platform);
  if (platform !== "cnblogs" && !requestCookieHeader) {
    requestCookieHeader = await capturePlatformNavigationCookieHeader(platform);
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
        const result = await zhihuBrowserMatch(article);
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `通过知乎浏览器真实签名请求匹配到 ${candidates.length} 条候选。`
            : "已读取知乎浏览器草稿列表和已发布文章列表，本地未匹配到同名文章。",
          items: candidates,
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
      if (platform === "medium") {
        await syncPlatformSession("medium");
        const result = await fetchJSON(`/v1/medium/articles/list?article=${article}`, { method: "POST" });
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `从 Medium 草稿和已发布文章列表本地匹配到 ${candidates.length} 条候选。`
            : "已读取 Medium 草稿和已发布文章列表，本地未匹配到同名文章。",
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
        const result = await csdnBrowserMatch(article);
        const candidates = result.candidates ?? [];
        return { ok: true, match: {
          text: candidates.length
            ? `通过浏览器读取 CSDN 文章列表并匹配到 ${candidates.length} 条候选；已绑定草稿仍按 ID 单独核验。`
            : "已通过浏览器读取 CSDN 已发布文章列表；未匹配到同名文章。历史草稿可用文章 ID／编辑链接手动绑定。",
          items: candidates,
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
      return { ok: true, ...(await fetchJSON(`/v1/medium/binding?article=${article}`, jsonOptions("POST", {
        postId: message.postId ?? "",
        state: message.state ?? "",
        replace: message.replace === true,
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
