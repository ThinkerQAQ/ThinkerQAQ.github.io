export function selectBrowserSessionCookies(definition, cookieBatches = []) {
  const allowed = Array.isArray(definition?.cookieNames) ? new Set(definition.cookieNames) : null;
  const deduped = new Map();

  for (const cookie of cookieBatches.flat()) {
    if (!cookie || !cookie.name || !cookie.value) continue;
    if (allowed && !allowed.has(cookie.name)) continue;
    const key = [cookie.name, cookie.domain || "", cookie.path || "/", cookie.storeId || ""].join("\u0000");
    deduped.set(key, {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || "",
      path: cookie.path || "/",
      secure: Boolean(cookie.secure),
      httpOnly: Boolean(cookie.httpOnly),
      hostOnly: Boolean(cookie.hostOnly),
      sameSite: cookie.sameSite || "unspecified",
      expirationDate: Number.isFinite(cookie.expirationDate) ? cookie.expirationDate : null,
    });
  }

  const selected = [...deduped.values()];
  for (const required of definition?.requiredCookieNames ?? []) {
    if (!selected.some((cookie) => cookie.name === required && cookie.value)) {
      throw new Error(`required cookie ${required} not found`);
    }
  }
  if (selected.length === 0) {
    throw new Error("no browser cookies were available");
  }
  return selected;
}
