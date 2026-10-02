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
      r2: {
        publicBaseUrl: String(r2.publicBaseUrl || DEFAULT_R2_PUBLIC_BASE_URL).trim(),
      },
    },
  };
}
