export const PLATFORM_AUTH = Object.freeze([
  {
    id: "cnblogs",
    label: "博客园",
    probe: {
      kind: "json",
      url: "https://i.cnblogs.com/api/user",
      path: "loginName",
    },
  },
  {
    id: "juejin",
    label: "掘金",
    probe: {
      kind: "json",
      url: "https://api.juejin.cn/user_api/v1/user/get",
      path: "data.user_id",
    },
  },
  {
    id: "csdn",
    label: "CSDN",
    probe: {
      kind: "cookies",
      cookieUrl: "https://www.csdn.net/",
      requiredCookieNames: ["UserName", "UserToken"],
    },
  },
  {
    id: "segmentfault",
    label: "思否",
    probe: {
      kind: "html",
      url: "https://segmentfault.com/user/settings",
      match: "href=[\"']\/u\/[^\"']+[\"']",
    },
  },
  {
    id: "zhihu",
    label: "知乎",
    probe: {
      kind: "json",
      url: "https://www.zhihu.com/api/v4/me",
      path: "id",
      headers: { "x-requested-with": "fetch" },
    },
  },
  {
    id: "51cto",
    label: "51CTO",
    probe: {
      kind: "html",
      url: "https://blog.51cto.com/blogger/publish",
      match: "class=[\"']more user[\"']",
    },
  },
  {
    id: "oschina",
    label: "开源中国",
    probe: {
      kind: "json",
      url: "https://apiv1.oschina.net/oschinapi/user/myDetails",
      path: "result.userId",
    },
  },
  {
    id: "toutiao",
    label: "今日头条",
    probe: {
      kind: "json",
      url: "https://mp.toutiao.com/mp/agw/media/user_login_status_api",
      path: "data.is_login",
      equals: true,
    },
  },
  {
    id: "devto",
    label: "DEV.to",
    probe: {
      kind: "final-url",
      url: "https://dev.to/settings/account",
      loggedOutPathPatterns: ["/enter", "/login", "/users/sign_in"],
    },
  },
  {
    id: "medium",
    label: "Medium",
    probe: {
      kind: "cookies",
      cookieUrl: "https://medium.com/",
      requiredCookieNames: ["sid"],
    },
  },
]);

export const PLATFORM_SESSIONS = Object.freeze({
  cnblogs: {
    cookieDomains: ["cnblogs.com"],
    // Chrome cookies.getAll defaults to unpartitioned cookies. CNBlogs can also
    // have cookies scoped to its top-level site partition.
    cookiePartitionKeys: [{ topLevelSite: "https://cnblogs.com" }],
    cookieUrls: [
      "https://www.cnblogs.com/",
      "https://i.cnblogs.com/",
      "https://i.cnblogs.com/api/user",
      "https://i.cnblogs.com/api/posts",
      "https://i.cnblogs.com/posts/edit",
      "https://home.cnblogs.com/",
      "https://account.cnblogs.com/",
      "https://upload.cnblogs.com/v2/images/cors-upload",
    ],
    requiredCookieNames: [],
  },
  juejin: {
    cookieDomains: ["juejin.cn"],
    cookieUrls: ["https://juejin.cn/", "https://api.juejin.cn/"],
    requiredCookieNames: [],
  },
  csdn: {
    cookieDomains: ["csdn.net"],
    cookieUrls: ["https://www.csdn.net/", "https://editor.csdn.net/", "https://bizapi.csdn.net/"],
    requiredCookieNames: [],
  },
  segmentfault: {
    cookieDomains: ["segmentfault.com"],
    cookieUrls: ["https://segmentfault.com/"],
    requiredCookieNames: [],
  },
  zhihu: {
    cookieDomains: ["zhihu.com"],
    cookieUrls: ["https://www.zhihu.com/", "https://zhuanlan.zhihu.com/"],
    requiredCookieNames: [],
  },
  "51cto": {
    cookieDomains: ["51cto.com"],
    cookieUrls: ["https://blog.51cto.com/"],
    requiredCookieNames: [],
  },
  oschina: {
    cookieDomains: ["oschina.net"],
    cookieUrls: ["https://my.oschina.net/", "https://apiv1.oschina.net/"],
    requiredCookieNames: [],
  },
  toutiao: {
    cookieDomains: ["toutiao.com"],
    cookieUrls: ["https://mp.toutiao.com/"],
    requiredCookieNames: [],
  },
  medium: {
    cookieDomains: ["medium.com"],
    cookieUrls: ["https://medium.com/"],
    cookieNames: ["sid", "uid", "xsrf", "cf_clearance"],
    requiredCookieNames: ["sid"],
  },
});

export const PLATFORM_HOSTS = Object.freeze({
  cnblogs: "https://*.cnblogs.com/*",
  juejin: "https://*.juejin.cn/*",
  csdn: "https://*.csdn.net/*",
  segmentfault: "https://*.segmentfault.com/*",
  zhihu: "https://*.zhihu.com/*",
  "51cto": "https://*.51cto.com/*",
  oschina: "https://*.oschina.net/*",
  toutiao: "https://*.toutiao.com/*",
  devto: "https://dev.to/*",
  medium: "https://medium.com/*",
});
