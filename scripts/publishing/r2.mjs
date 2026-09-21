import { createHash, createHmac } from "node:crypto";

export const DEFAULT_R2_PUBLIC_BASE_URL = "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/";

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding = undefined) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function encodedPath(value) {
  return String(value).split("/").map((part) => encodeURIComponent(part)).join("/");
}

function timestamp(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/gu, "");
}

export function loadR2Config(env = process.env) {
  const accountId = String(env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = String(env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucket = String(env.R2_BUCKET || "").trim();
  const endpoint = String(env.R2_ENDPOINT || (accountId ? "https://" + accountId + ".r2.cloudflarestorage.com" : "")).trim();
  const publicBaseUrl = String(env.R2_PUBLIC_BASE_URL || DEFAULT_R2_PUBLIC_BASE_URL).trim();
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint, publicBaseUrl };
}

export function assertR2Config(config) {
  for (const field of ["accessKeyId", "secretAccessKey", "bucket", "endpoint", "publicBaseUrl"]) {
    if (!String(config[field] || "").trim()) throw new Error("Missing R2 publishing configuration: " + field);
  }
  const endpoint = new URL(config.endpoint);
  if (endpoint.protocol !== "https:") throw new Error("R2 endpoint must use HTTPS");
  const publicBase = new URL(config.publicBaseUrl);
  if (publicBase.protocol !== "https:") throw new Error("R2 public base URL must use HTTPS");
  return config;
}

export function publicR2Url(objectKey, config = loadR2Config()) {
  const base = new URL(config.publicBaseUrl);
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  return new URL(encodedPath(objectKey), base).toString();
}

export function signR2Put({
  objectKey,
  body,
  contentType = "image/png",
  config = loadR2Config(),
  now = new Date(),
}) {
  assertR2Config(config);
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const endpoint = new URL(config.endpoint);
  const amzDate = timestamp(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(payload);
  const canonicalUri = "/" + encodedPath(config.bucket) + "/" + encodedPath(objectKey);
  const canonicalHeaders = [
    "content-type:" + contentType,
    "host:" + endpoint.host,
    "x-amz-content-sha256:" + payloadHash,
    "x-amz-date:" + amzDate,
    "",
  ].join("\n");
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = dateStamp + "/auto/s3/aws4_request";
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const dateKey = hmac("AWS4" + config.secretAccessKey, dateStamp);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");
  const authorization = "AWS4-HMAC-SHA256 Credential=" + config.accessKeyId + "/" + scope
    + ", SignedHeaders=" + signedHeaders
    + ", Signature=" + signature;

  return {
    url: new URL(canonicalUri, endpoint.origin).toString(),
    headers: {
      authorization,
      "content-type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: payload,
  };
}

export async function uploadR2Object({
  objectKey,
  body,
  contentType = "image/png",
  config = loadR2Config(),
  fetchImpl = fetch,
  now = () => new Date(),
}) {
  const request = signR2Put({
    objectKey,
    body,
    contentType,
    config,
    now: now(),
  });
  const response = await fetchImpl(request.url, {
    method: "PUT",
    headers: request.headers,
    body: request.body,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("R2 upload failed (" + response.status + "): " + detail.slice(0, 500));
  }
  return {
    objectKey,
    publicUrl: publicR2Url(objectKey, config),
  };
}
