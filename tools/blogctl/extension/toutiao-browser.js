// Only BlogCTL's narrowly scoped creator-editor publishing endpoint can be
// requested from the page's MAIN world. In the normal page JS environment,
// Toutiao may add its dynamic browser security parameters to this fetch.
export function validateToutiaoBrowserRequest(request) {
  if (!request || typeof request !== "object" ||
      !/^[a-f0-9]{16}$/i.test(String(request.id || ""))) {
    throw new Error("Invalid Toutiao browser request ID");
  }
  if (typeof request.body !== "string" || request.body.length > 2 * 1024 * 1024) {
    throw new Error("Invalid Toutiao browser request body");
  }
  if (typeof request.path !== "string") {
    throw new Error("Invalid Toutiao browser request path");
  }
  const url = new URL(request.path, "https://mp.toutiao.com");
  if (!request.path.startsWith("/mp/agw/article/publish?") ||
      url.origin !== "https://mp.toutiao.com" ||
      url.pathname !== "/mp/agw/article/publish" ||
      [...url.searchParams.keys()].some((key) => !["aid", "source", "type", "mp_publish_ab_val"].includes(key)) ||
      url.searchParams.get("aid") !== "1231" ||
      url.searchParams.get("source") !== "mp" ||
      url.searchParams.get("type") !== "article") {
    throw new Error("Unexpected Toutiao browser request endpoint");
  }
  return { id: request.id, path: url.pathname + url.search, body: request.body };
}

export async function executeToutiaoEditorFetch(path, body) {
  // This function is serialized and runs as-is in the site's MAIN world.
  // No imported modules, extension globals, cookies or DOM state escape.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    if (location.origin !== "https://mp.toutiao.com") {
      return { status: 0, body: "", error: "Toutiao editor tab is not on mp.toutiao.com" };
    }
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    return { status: response.status, body: text.slice(0, 2 * 1024 * 1024), error: "" };
  } catch (error) {
    return { status: 0, body: "", error: String(error?.message || error).slice(0, 350) };
  } finally {
    clearTimeout(timeout);
  }
}
