import { PLATFORM_SESSIONS } from "./platforms.js";

const GOOGLE_BROWSER_PROXY_DOMAINS = [
  "search.google.com",
  "accounts.google.com",
  "gstatic.com",
  "googleapis.com",
  "googleusercontent.com",
];

export const BLOGCTL_BROWSER_PROXY_DOMAINS = Object.freeze([
  ...new Set([
    ...Object.values(PLATFORM_SESSIONS).flatMap((definition) => definition.cookieDomains ?? []),
    ...GOOGLE_BROWSER_PROXY_DOMAINS,
  ].map((domain) => String(domain || "").trim().toLowerCase()).filter(Boolean)),
]);

export function buildBrowserProxyPAC(host, port) {
  const proxy = `PROXY ${host}:${port}`;
  const rules = BLOGCTL_BROWSER_PROXY_DOMAINS.map((domain) => {
    const exact = JSON.stringify(domain);
    const suffix = JSON.stringify("." + domain);
    return `  if (host === ${exact} || dnsDomainIs(host, ${suffix})) return ${JSON.stringify(proxy)};`;
  }).join("\n");

  return [
    "function FindProxyForURL(url, host) {",
    "  host = String(host || \"\").toLowerCase();",
    "  if (isPlainHostName(host) || host === \"localhost\" || host === \"127.0.0.1\" || host === \"::1\" || host === \"[::1]\") return \"DIRECT\";",
    rules,
    '  return "DIRECT";',
    "}",
  ].join("\n");
}

export function browserProxyValue(host, port) {
  return {
    mode: "pac_script",
    pacScript: {
      mandatory: true,
      data: buildBrowserProxyPAC(host, port),
    },
  };
}

export function browserProxyMatches(value, host, port) {
  const expected = browserProxyValue(host, port);
  return value?.mode === expected.mode &&
    value?.pacScript?.data === expected.pacScript.data;
}
