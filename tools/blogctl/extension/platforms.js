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
      kind: "json",
      url: "https://api-media.51cto.com/user/index/get-info",
      path: "data.data.user_id",
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
    cookieUrls: [
      "https://www.csdn.net/",
      "https://blog.csdn.net/",
      "https://editor.csdn.net/",
      "https://bizapi.csdn.net/",
      "https://g-api.csdn.net/",
    ],
    cookieNames: [
      "UserName", "UserToken", "UserInfo", "UserNick",
      "AU", "UN", "BT", "csrfToken", "SESSION",
    ],
    requiredCookieNames: ["UserName", "UserToken"],
  },
  segmentfault: {
    cookieDomains: ["segmentfault.com"],
    cookieUrls: ["https://segmentfault.com/", "https://segmentfault.com/user/settings/profile", "https://segmentfault.com/write"],
    cookieNames: ["PHPSESSID", "SHARESESSID", "sl-session", "_c_WBKFRo"],
    requiredCookieNames: ["PHPSESSID"],
  },
  zhihu: {
    cookieDomains: ["zhihu.com"],
    cookieUrls: ["https://www.zhihu.com/", "https://www.zhihu.com/api/v4/me", "https://zhuanlan.zhihu.com/"],
    cookieNames: ["z_c0", "_xsrf", "d_c0", "__zse_ck", "SESSIONID", "BEC"],
    requiredCookieNames: ["z_c0"],
  },
  "51cto": {
    cookieDomains: ["51cto.com"],
    cookieUrls: [
      "https://www.51cto.com/",
      "https://blog.51cto.com/",
      "https://api-media.51cto.com/",
      "https://api-blog.51cto.com/",
      "https://ucenter.51cto.com/",
    ],
    cookieNames: [
      "www51cto", "pub_auth_profile", "pub_sauth1", "pub_sauth2",
      "pub_cookietime", "pub_wechatopen", "once_p", "PHPSESSID",
      "EO-Bot-Captcha-Token", "EO-Bot-Js-Token",
    ],
    requiredCookieNames: ["www51cto", "pub_sauth1", "pub_sauth2"],
  },
  oschina: {
    cookieDomains: ["oschina.net"],
    cookieUrls: ["https://www.oschina.net/", "https://my.oschina.net/", "https://apiv1.oschina.net/"],
    cookieNames: ["oscid", "_user_behavior_", "sl-session", "BEC"],
    requiredCookieNames: ["oscid"],
  },
  toutiao: {
    cookieDomains: ["toutiao.com"],
    cookieUrls: ["https://mp.toutiao.com/"],
    requiredCookieNames: [],
  },
  devto: {
    cookieDomains: ["dev.to"],
    cookieUrls: ["https://dev.to/", "https://dev.to/dashboard", "https://dev.to/new"],
    cookieNames: ["_Devto_Forem_Session", "remember_user_token", "current_user"],
    requiredCookieNames: ["_Devto_Forem_Session"],
    optional: true,
  },
  medium: {
    cookieDomains: ["medium.com"],
    cookieUrls: ["https://medium.com/", "https://medium.com/me/stories", "https://medium.com/_/graphql"],
    cookiePartitionKeys: [{ topLevelSite: "https://medium.com" }],
    cookieNames: ["sid", "uid", "rid", "xsrf", "cf_clearance", "_cfuvid"],
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
