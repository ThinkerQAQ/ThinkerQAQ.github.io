import { readFileSync } from "node:fs";

export const DEFAULT_R2_PUBLIC_BASE_URL = "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/";
export const DEFAULT_MERMAID_FORMAT = "png";
export const DEFAULT_MERMAID_WIDTH = 1200;
export const DEFAULT_MERMAID_SCALE = 2;

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function loadBlogctlPublishingRuntimeConfig(env = process.env) {
  let stored = {};
  const resolved = String(env.BLOGCTL_PUBLISHING_JSON || "").trim();
  if (resolved) {
    try {
      stored = JSON.parse(resolved) ?? {};
    } catch (error) {
      throw new Error("Invalid BLOGCTL_PUBLISHING_JSON: " + error.message);
    }
  } else {
    const configFile = String(env.BLOGCTL_CONFIG_FILE || "").trim();
    if (configFile) {
      try {
        stored = JSON.parse(readFileSync(configFile, "utf8"))?.publishing ?? {};
      } catch {
        stored = {};
      }
    }
  }

  const mermaid = stored?.compiler?.mermaid ?? {};
  const assets = stored?.assets ?? {};
  const r2 = assets?.r2 ?? {};

  return {
    mermaid: {
      format: String(mermaid.format || DEFAULT_MERMAID_FORMAT).trim().toLowerCase(),
      width: positiveNumber(mermaid.width, DEFAULT_MERMAID_WIDTH),
      scale: positiveNumber(mermaid.scale, DEFAULT_MERMAID_SCALE),
    },
    assets: {
      store: String(assets.store || "r2").trim().toLowerCase(),
      r2: {
        bucket: String(env.R2_BUCKET || r2.bucket || "").trim(),
        publicBaseUrl: String(env.R2_PUBLIC_BASE_URL || r2.publicBaseUrl || DEFAULT_R2_PUBLIC_BASE_URL).trim(),
      },
    },
  };
}
