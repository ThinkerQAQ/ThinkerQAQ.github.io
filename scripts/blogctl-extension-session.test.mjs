import assert from "node:assert/strict";
import test from "node:test";

import { selectBrowserSessionCookies } from "../tools/blogctl/extension/session.js";

test("selectBrowserSessionCookies preserves domain/path metadata and deduplicates exact cookies", () => {
  const selected = selectBrowserSessionCookies({ requiredCookieNames: [] }, [[
    {
      name: "sessionid", value: "root", domain: ".juejin.cn", path: "/",
      secure: true, httpOnly: true, hostOnly: false, sameSite: "lax",
      expirationDate: 2000000000, storeId: "0",
    },
    {
      name: "sessionid", value: "api", domain: "api.juejin.cn", path: "/",
      secure: true, httpOnly: true, hostOnly: true, sameSite: "lax",
      expirationDate: 2000000000, storeId: "0",
    },
  ], [
    {
      name: "sessionid", value: "api-new", domain: "api.juejin.cn", path: "/",
      secure: true, httpOnly: true, hostOnly: true, sameSite: "lax",
      expirationDate: 2000000000, storeId: "0",
    },
  ]]);

  assert.equal(selected.length, 2);
  assert.deepEqual(
    selected.map(({ name, value, domain, path, secure, httpOnly, hostOnly }) => ({
      name, value, domain, path, secure, httpOnly, hostOnly,
    })),
    [
      {
        name: "sessionid", value: "root", domain: ".juejin.cn", path: "/",
        secure: true, httpOnly: true, hostOnly: false,
      },
      {
        name: "sessionid", value: "api-new", domain: "api.juejin.cn", path: "/",
        secure: true, httpOnly: true, hostOnly: true,
      },
    ],
  );
});

test("selectBrowserSessionCookies applies Medium allowlist and required cookie", () => {
  const definition = {
    cookieNames: ["sid", "uid"],
    requiredCookieNames: ["sid"],
  };
  const selected = selectBrowserSessionCookies(definition, [[
    { name: "sid", value: "secret", domain: ".medium.com", path: "/" },
    { name: "uid", value: "42", domain: ".medium.com", path: "/" },
    { name: "unrelated", value: "drop", domain: ".medium.com", path: "/" },
  ]]);
  assert.deepEqual(selected.map((cookie) => cookie.name), ["sid", "uid"]);
  assert.throws(
    () => selectBrowserSessionCookies(definition, [[
      { name: "uid", value: "42", domain: ".medium.com", path: "/" },
    ]]),
    /required cookie sid not found/u,
  );
});

test("selectBrowserSessionCookies rejects an empty usable session", () => {
  assert.throws(
    () => selectBrowserSessionCookies({ requiredCookieNames: [] }, [[
      { name: "empty", value: "", domain: ".juejin.cn", path: "/" },
    ]]),
    /no browser cookies/u,
  );
});

test("all native platform sessions declare domain-wide cookie discovery", async () => {
  const { PLATFORM_SESSIONS } = await import("../tools/blogctl/extension/platforms.js");
  const expected = {
    cnblogs: "cnblogs.com",
    juejin: "juejin.cn",
    csdn: "csdn.net",
    segmentfault: "segmentfault.com",
    zhihu: "zhihu.com",
    "51cto": "51cto.com",
    oschina: "oschina.net",
    toutiao: "toutiao.com",
  };
  for (const [platform, domain] of Object.entries(expected)) {
    assert.ok(
      PLATFORM_SESSIONS[platform]?.cookieDomains?.includes(domain),
      `${platform} must collect cookies across ${domain} subdomains`,
    );
  }
});
