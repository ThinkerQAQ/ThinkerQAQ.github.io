const BRIDGE_URL = "http://127.0.0.1:32145/v1/session";
const COOKIE_NAMES = new Set(["sid", "uid", "xsrf", "cf_clearance"]);

async function setBadge(text, color) {
  await chrome.action.setBadgeText({ text });
  if (color) await chrome.action.setBadgeBackgroundColor({ color });
}

async function clearBadgeLater() {
  setTimeout(() => chrome.action.setBadgeText({ text: "" }).catch(() => {}), 5000);
}

async function syncMediumSession() {
  await setBadge("…", "#666666");
  const cookies = await chrome.cookies.getAll({ url: "https://medium.com/" });
  const selected = cookies
    .filter((cookie) => COOKIE_NAMES.has(cookie.name))
    .map((cookie) => ({ name: cookie.name, value: cookie.value }));

  if (!selected.some((cookie) => cookie.name === "sid")) {
    throw new Error("Medium sid cookie not found. Sign in to medium.com first.");
  }

  const response = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cookies: selected,
      userAgent: navigator.userAgent,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Bridge HTTP ${response.status}`);
  await setBadge("✓", "#1a8917");
  await clearBadgeLater();
}

chrome.action.onClicked.addListener(() => {
  syncMediumSession().catch(async (error) => {
    console.error("Medium session sync failed:", error.message);
    await setBadge("!", "#b42318");
    await clearBadgeLater();
  });
});
