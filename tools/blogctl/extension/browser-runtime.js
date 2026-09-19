const ALLOWED = Object.freeze({
  auth: { method: "GET", host: "i.cnblogs.com", path: "/api/user" },
  "prime-xsrf": { method: "GET", host: "i.cnblogs.com", path: "/posts/edit" },
  "get-post": { method: "GET", host: "i.cnblogs.com", prefix: "/api/posts/" },
  "save-post": { method: "POST", host: "i.cnblogs.com", path: "/api/posts" },
  "upload-image": { method: "POST", host: "upload.cnblogs.com", path: "/v2/images/cors-upload" },
});

function checkTask(task) {
  const rule = ALLOWED[task?.operation];
  if (!rule || task.method !== rule.method || !task.id || !task.url) throw new Error("browser request is not allowed");
  const target = new URL(task.url);
  if (target.protocol !== "https:" || target.hostname !== rule.host || target.search || target.hash) {
    throw new Error("browser request target is not allowed");
  }
  if (rule.path ? target.pathname !== rule.path : !/^\/api\/posts\/[0-9]+$/.test(target.pathname)) {
    throw new Error("browser request path is not allowed");
  }
  if (task.expiresAt && Date.now() >= task.expiresAt) throw new Error("browser request expired");
  return target;
}

function decodeBody(encoded) {
  if (!encoded) return undefined;
  const binary = atob(encoded);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i);
  return result;
}

function encodeBody(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(binary);
}

async function xsrfToken(fetchImpl, cookiesAPI, signal) {
  const response = await fetchImpl("https://i.cnblogs.com/posts/edit", { credentials: "include", redirect: "follow", signal });
  if (!response.ok || new URL(response.url).hostname !== "i.cnblogs.com") throw new Error(`CNBlogs XSRF preflight HTTP ${response.status}`);
  const cookies = await cookiesAPI.getAll({ url: "https://i.cnblogs.com/api/posts" });
  const value = cookies.find((cookie) => cookie.name === "XSRF-TOKEN")?.value;
  if (!value) throw new Error("CNBlogs XSRF cookie is missing");
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function executeBrowserRequest(task, deps = {}) {
  const fetchImpl = deps.fetch ?? fetch;
  const cookiesAPI = deps.cookies ?? globalThis.chrome?.cookies;
  const timeoutMs = deps.timeoutMs ?? 60000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const target = checkTask(task);
    const headers = new Headers();
    if (task.contentType) headers.set("content-type", task.contentType);
    if (task.operation === "save-post" || task.operation === "upload-image") {
      headers.set("x-xsrf-token", await xsrfToken(fetchImpl, cookiesAPI, controller.signal));
    }
    const body = decodeBody(task.body);
    if (task.operation === "save-post") {
      let payload;
      try { payload = JSON.parse(new TextDecoder().decode(body)); }
      catch { throw new Error("invalid draft payload"); }
      if (payload.isPublished !== false || payload.isDraft !== true || payload.displayOnHomePage !== false) {
        throw new Error("browser runtime only permits private draft saves");
      }
    }
    const response = await fetchImpl(target.href, {
      method: task.method,
      credentials: "include",
      redirect: "follow",
      headers,
      body,
      signal: controller.signal,
    });
    const finalURL = new URL(response.url);
    if (finalURL.protocol !== "https:" || finalURL.hostname !== target.hostname) throw new Error("CNBlogs redirected outside allowed host");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 12 << 20) throw new Error("CNBlogs response too large");
    return { id: task.id, status: response.status, contentType: response.headers.get("content-type") || "", body: encodeBody(bytes) };
  } catch (error) {
    const safeMessage = String(error?.message || "");
    const detail = error?.name === "AbortError" ? "timeout"
      : /^(browser request |CNBlogs |invalid draft payload)/.test(safeMessage) ? safeMessage
      : "browser request failed";
    return { id: task.id, status: 0, error: detail.slice(0, 300) };
  } finally {
    clearTimeout(timer);
  }
}
