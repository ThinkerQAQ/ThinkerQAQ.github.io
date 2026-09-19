function matchesCookieDomain(domain, allowedDomains) {
  const host = String(domain || "").replace(/^\./, "").toLowerCase();
  if (!host) return false;
  return allowedDomains.some((allowed) => {
    const base = String(allowed || "").replace(/^\./, "").toLowerCase();
    return base && (host === base || host.endsWith("." + base));
  });
}

export function selectBrowserSessionCookies(definition, cookieBatches = []) {
  const allowed = Array.isArray(definition?.cookieNames) ? new Set(definition.cookieNames) : null;
  const allowedDomains = (definition?.cookieDomains ?? [])
    .filter(Boolean)
    .map((domain) => String(domain).replace(/^\./, "").toLowerCase());
  const deduped = new Map();

  for (const cookie of cookieBatches.flat()) {
    if (!cookie || !cookie.name || !cookie.value) continue;
    if (allowed && !allowed.has(cookie.name)) continue;
    if (allowedDomains.length > 0 && !matchesCookieDomain(cookie.domain, allowedDomains)) continue;
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
