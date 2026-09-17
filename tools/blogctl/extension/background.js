import { PLATFORM_AUTH, PLATFORM_SESSIONS } from "./platforms.js";

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
  return String(path || "")
    .split(".")
    .filter(Boolean)
    .reduce((current, key) => current?.[key], value);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      credentials: "include",
      redirect: "follow",
      ...options,
      signal: controller.signal,
    });
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
  if (!force && bridgeSession && Date.now() - bridgeSession.checkedAt < BRIDGE_CACHE_MS) {
    return bridgeSession;
  }
  const response = await requestNativeBridge();
  bridgeSession = { ...response, checkedAt: Date.now() };
  return bridgeSession;
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
  return Object.prototype.hasOwnProperty.call(probe, "equals")
    ? value === probe.equals
    : Boolean(value);
}

async function probeHTML(probe) {
  const response = await fetchWithTimeout(probe.url, { headers: probe.headers ?? {} });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return new RegExp(probe.match, "i").test(html);
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
      case "cookies":
        loggedIn = await probeCookies(probe);
        break;
      case "json":
        loggedIn = await probeJSON(probe);
        break;
      case "html":
        loggedIn = await probeHTML(probe);
        break;
      case "final-url":
        loggedIn = await probeFinalURL(probe);
        break;
      default:
        throw new Error(`Unsupported auth probe: ${probe.kind || "missing"}`);
    }
    return {
      id: definition.id,
      label: definition.label,
      known: true,
      loggedIn: Boolean(loggedIn),
    };
  } catch (error) {
    return {
      id: definition.id,
      label: definition.label,
      known: false,
      loggedIn: false,
      error: errorMessage(error),
    };
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
    if (!response.ok) throw new Error(payload.error || `bridge HTTP ${response.status}`);
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

async function bridgeStatus() {
  try {
    const bridge = await ensureBridge(false);
    const health = await fetchJSON("/v1/health");
    if (!health?.ok) throw new Error("Bridge health check failed.");

    try {
      const result = await fetchJSON("/v1/config");
      return {
        running: true,
        pid: bridge.pid || 0,
        configKnown: true,
        config: result?.config ?? {},
        networkMode: result?.networkMode || "",
      };
    } catch (error) {
      return {
        running: true,
        pid: bridge.pid || 0,
        configKnown: false,
        config: {},
        configError: errorMessage(error),
      };
    }
  } catch (error) {
    bridgeSession = null;
    return {
      running: false,
      configKnown: false,
      config: {},
      error: errorMessage(error),
    };
  }
}

async function platformSessionStatus(platform, bridge) {
  if (!bridge.running) {
    return {
      known: false,
      synced: false,
      unavailable: true,
      expiresInSeconds: 0,
      error: bridge.error || "BlogCTL Bridge 未运行",
    };
  }

  try {
    const session = await fetchJSON(`/v1/sessions/${encodeURIComponent(platform)}/status`);
    return {
      known: true,
      synced: Boolean(session?.authenticated),
      expiresInSeconds: Number(session?.expiresInSeconds || 0),
    };
  } catch (error) {
    return {
      known: false,
      synced: false,
      unavailable: false,
      expiresInSeconds: 0,
      error: errorMessage(error),
    };
  }
}

async function getStatus() {
  const [bridge, platforms] = await Promise.all([bridgeStatus(), allPlatformLoginStatuses()]);
  const mediumSession = await platformSessionStatus("medium", bridge);
  return {
    bridge,
    platforms,
    sessions: { medium: mediumSession },
  };
}

async function saveBridgeConfig(config) {
  const payload = {
    proxyEnabled: Boolean(config?.proxyEnabled),
    proxyHost: String(config?.proxyHost || "").trim(),
    proxyPort: Number(config?.proxyPort || 0),
  };
  return fetchJSON("/v1/config", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function syncPlatformSession(platform) {
  const definition = PLATFORM_SESSIONS[platform];
  if (!definition) throw new Error(`${platform}: browser session sync is not supported.`);

  const cookies = await chrome.cookies.getAll({ url: definition.cookieUrl });
  const allowed = new Set(definition.cookieNames);
  const selected = cookies
    .filter((cookie) => allowed.has(cookie.name))
    .map((cookie) => ({ name: cookie.name, value: cookie.value }));

  for (const required of definition.requiredCookieNames ?? []) {
    if (!selected.some((cookie) => cookie.name === required && cookie.value)) {
      throw new Error(`${platform}: required cookie ${required} not found. Sign in first.`);
    }
  }

  return fetchJSON(`/v1/sessions/${encodeURIComponent(platform)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cookies: selected, userAgent: navigator.userAgent }),
  });
}

async function syncBrowserSession(platform) {
  await setBadge("…", "#666666");
  const result = await syncPlatformSession(platform);
  console.info("BlogCTL browser session synced", platform);
  await setBadge("✓", "#1a8917");
  clearBadgeLater();
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;
  if (message.type === "blogctl.status") {
    getStatus().then((status) => sendResponse({ ok: true, status })).catch((error) => {
      sendResponse({ ok: false, error: errorMessage(error) });
    });
    return true;
  }
  if (message.type === "blogctl.config.save") {
    saveBridgeConfig(message.config).then(async () => {
      sendResponse({ ok: true, status: await getStatus() });
    }).catch(async (error) => {
      sendResponse({ ok: false, error: errorMessage(error), status: await getStatus() });
    });
    return true;
  }
  if (message.type === "blogctl.sync") {
    const platform = message.platform || "medium";
    syncBrowserSession(platform).then(async () => {
      sendResponse({ ok: true, status: await getStatus() });
    }).catch(async (error) => {
      console.error("BlogCTL session sync failed:", errorMessage(error));
      await setBadge("!", "#b42318");
      clearBadgeLater();
      sendResponse({ ok: false, error: errorMessage(error), status: await getStatus() });
    });
    return true;
  }
  return false;
});
