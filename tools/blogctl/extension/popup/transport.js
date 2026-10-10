"use strict";

// The UI depends on a small, host-agnostic request contract. IDFlow uses the
// same Host -> Feature -> Transport separation. Never duplicate feature state
// or expose the native messaging token to a Web page.
(function (root) {
  function send(type, payload = {}) {
    if (!root.chrome?.runtime?.sendMessage) {
      return Promise.reject(new Error("当前宿主尚未连接 BlogCTL Transport"));
    }
    return new Promise((resolve, reject) => {
      root.chrome.runtime.sendMessage({ type, ...payload }, (response) => {
        const runtimeError = root.chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        if (!response?.ok) {
          const error = new Error(response?.error || "BlogCTL Extension request failed");
          error.code = response?.code || "";
          error.details = response?.details || null;
          error.status = response?.status || 0;
          error.response = response;
          reject(error);
          return;
        }
        resolve(response);
      });
    });
  }
  root.BlogCTLTransport = { send, host: "extension" };
})(globalThis);
