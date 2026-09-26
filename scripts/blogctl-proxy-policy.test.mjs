import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
  BLOGCTL_BROWSER_PROXY_DOMAINS,
  browserProxyMatches,
  browserProxyValue,
  buildBrowserProxyPAC,
} from "../tools/blogctl/extension/proxy-policy.js";

function evaluatePAC(url) {
  const pac = buildBrowserProxyPAC("127.0.0.1", 7890);
  const parsed = new URL(url);
  const context = vm.createContext({
    dnsDomainIs(host, suffix) {
      return String(host).endsWith(String(suffix));
    },
    isPlainHostName(host) {
      return !String(host).includes(".");
    },
  });
  vm.runInContext(pac, context);
  return vm.runInContext(
    `FindProxyForURL(${JSON.stringify(url)}, ${JSON.stringify(parsed.hostname)})`,
    context,
  );
}

test("selective browser proxy covers BlogCTL platform and GSC domains", () => {
  assert.ok(BLOGCTL_BROWSER_PROXY_DOMAINS.includes("medium.com"));
  assert.ok(BLOGCTL_BROWSER_PROXY_DOMAINS.includes("search.google.com"));
  assert.equal(evaluatePAC("https://medium.com/me/stories"), "PROXY 127.0.0.1:7890");
  assert.equal(evaluatePAC("https://api.juejin.cn/user_api/v1/user/get"), "PROXY 127.0.0.1:7890");
  assert.equal(evaluatePAC("https://search.google.com/search-console"), "PROXY 127.0.0.1:7890");
  assert.equal(evaluatePAC("https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico"), "PROXY 127.0.0.1:7890");
});

test("selective browser proxy leaves unrelated browsing direct", () => {
  assert.equal(evaluatePAC("https://github.com/ThinkerQAQ"), "DIRECT");
  assert.equal(evaluatePAC("https://thinkerqaq.github.io/"), "DIRECT");
  assert.equal(evaluatePAC("https://example.com/"), "DIRECT");
  assert.equal(evaluatePAC("http://localhost:32145/v1/status"), "DIRECT");
});

test("browser proxy health compares the exact PAC policy", () => {
  const value = browserProxyValue("127.0.0.1", 7890);
  assert.equal(browserProxyMatches(value, "127.0.0.1", 7890), true);
  assert.equal(browserProxyMatches(value, "127.0.0.1", 7891), false);
  assert.equal(browserProxyMatches({ mode: "fixed_servers" }, "127.0.0.1", 7890), false);
});
