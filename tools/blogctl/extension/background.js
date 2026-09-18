import { PLATFORM_AUTH, PLATFORM_SESSIONS } from "./platforms.js";
import { selectBrowserSessionCookies } from "./session.js";
import { toError } from "./errors.js";

const NATIVE_HOST = "com.thinkerqaq.blogctl";
const AUTH_TIMEOUT_MS = 7000;
const BRIDGE_CACHE_MS = 30000;
let bridgeSession = null;

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
    return { id: definition.id, label: definition.label, known: true, loggedIn: Boolean(loggedIn) };
  } catch (error) {
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
  const sessionEntries = await Promise.all(
    Object.keys(PLATFORM_SESSIONS).map(async (platform) => [
      platform,
      await platformSessionStatus(platform, bridge),
    ]),
  );
  return { bridge, platforms, sessions: Object.fromEntries(sessionEntries) };
}

async function saveBridgeConfig(config) {
  return fetchJSON("/v1/config", jsonOptions("PUT", {
    proxyEnabled: Boolean(config?.proxyEnabled),
    proxyHost: String(config?.proxyHost || "").trim(),
    proxyPort: Number(config?.proxyPort || 0),
  }));
}

async function syncPlatformSession(platform) {
  const definition = PLATFORM_SESSIONS[platform];
  if (!definition) throw new Error(`${platform}: browser session sync is not supported.`);

  const cookieUrls = definition.cookieUrls ?? (definition.cookieUrl ? [definition.cookieUrl] : []);
  const batches = await Promise.all(cookieUrls.map((url) => chrome.cookies.getAll({ url })));
  let selected;
  try {
    selected = selectBrowserSessionCookies(definition, batches);
  } catch (error) {
    throw new Error(`${platform}: ${errorMessage(error)}. Sign in first.`);
  }

  return fetchJSON(
    `/v1/sessions/${encodeURIComponent(platform)}`,
    jsonOptions("POST", { cookies: selected, userAgent: navigator.userAgent }),
  );
}

async function syncBrowserSession(platform) {
  await setBadge("…", "#666666");
  const result = await syncPlatformSession(platform);
  await setBadge("✓", "#1a8917");
  clearBadgeLater();
  return result;
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
      return { ok: true, platforms: result?.platforms ?? [] };
    }
    case "blogctl.publishing.save": {
      const result = await fetchJSON("/v1/publishing", jsonOptions("PUT", { platforms: message.platforms ?? [] }));
      return { ok: true, platforms: result?.platforms ?? [] };
    }
    case "blogctl.jobs": {
      const result = await fetchJSON("/v1/sync/jobs");
      return { ok: true, jobs: result?.jobs ?? [] };
    }
    case "blogctl.job.start": {
      const result = await fetchJSON("/v1/sync/jobs", jsonOptions("POST", message.request ?? {}));
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
      const result = await fetchJSON(`/v1/sync/jobs/${encodeURIComponent(id)}/retry`, { method: "POST" });
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
