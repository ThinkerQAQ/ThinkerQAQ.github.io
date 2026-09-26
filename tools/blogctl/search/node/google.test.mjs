import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import {
  auditGoogleUrls,
  checkGoogleSearchConsoleSite,
  normalizeInspectionResult,
  submitGoogleSitemap,
  submitGoogleSitemaps,
} from "./google.mjs";
import {
  createServiceAccountAssertion,
  fetchGoogleAccessToken,
  parseServiceAccountCredentials,
} from "./google-auth.mjs";

function decodePart(part) {
  const padded = part.replaceAll("-", "+").replaceAll("_", "/");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

test("service-account parser rejects OAuth client credentials with an actionable message", () => {
  assert.throws(
    () => parseServiceAccountCredentials({
      installed: {
        client_id: "client-id",
        client_secret: "secret",
      },
    }),
    /OAuth Desktop Client credentials, not a Service Account JSON key/u,
  );
  assert.throws(
    () => parseServiceAccountCredentials({
      web: {
        client_id: "client-id",
        client_secret: "secret",
      },
    }),
    /OAuth Web Client credentials, not a Service Account JSON key/u,
  );
});

test("service-account parser reports exactly which required fields are missing", () => {
  assert.throws(
    () => parseServiceAccountCredentials({ type: "service_account" }),
    /missing client_email, private_key/u,
  );
});

test("service-account assertion contains Search Console scope and expected claims", () => {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const credentials = parseServiceAccountCredentials({
    client_email: "search@example.iam.gserviceaccount.com",
    private_key: privateKey,
    token_uri: "https://oauth2.googleapis.com/token",
  });
  const assertion = createServiceAccountAssertion(credentials, { now: 1000 });
  const parts = assertion.split(".");
  assert.equal(parts.length, 3);
  assert.equal(decodePart(parts[0]).alg, "RS256");
  const claims = decodePart(parts[1]);
  assert.equal(claims.iss, credentials.clientEmail);
  assert.equal(claims.aud, credentials.tokenUri);
  assert.equal(claims.iat, 1000);
  assert.equal(claims.exp, 4600);
  assert.match(claims.scope, /webmasters/u);
});

test("fetchGoogleAccessToken performs OAuth JWT exchange", async () => {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const credentials = parseServiceAccountCredentials({
    client_email: "search@example.iam.gserviceaccount.com",
    private_key: privateKey,
    token_uri: "https://oauth2.googleapis.com/token",
  });
  let request;
  const token = await fetchGoogleAccessToken(credentials, {
    now: 1000,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({
        access_token: "token-123",
        token_type: "Bearer",
        expires_in: 3600,
      }), { status: 200 });
    },
  });
  assert.equal(token.accessToken, "token-123");
  assert.equal(request.url, credentials.tokenUri);
  assert.equal(request.options.method, "POST");
  assert.match(String(request.options.body), /grant_type=/u);
  assert.match(String(request.options.body), /assertion=/u);
});

test("checkGoogleSearchConsoleSite verifies property access", async () => {
  let request;
  const result = await checkGoogleSearchConsoleSite({
    siteUrl: "https://thinkerqaq.github.io/",
    accessToken: "token",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({
        siteUrl: "https://thinkerqaq.github.io/",
        permissionLevel: "siteFullUser",
      }), { status: 200 });
    },
  });
  assert.equal(result.httpStatus, 200);
  assert.equal(result.permissionLevel, "siteFullUser");
  assert.match(request.url, /sites\/https%3A%2F%2Fthinkerqaq\.github\.io%2F$/u);
  assert.equal(request.options.method, "GET");
  assert.equal(request.options.headers.authorization, "Bearer token");
});

test("submitGoogleSitemap uses Search Console PUT endpoint", async () => {
  let request;
  const result = await submitGoogleSitemap({
    siteUrl: "https://thinkerqaq.github.io/",
    feedPath: "https://thinkerqaq.github.io/sitemap-index.xml",
    accessToken: "token",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(null, { status: 204 });
    },
  });
  assert.equal(result.httpStatus, 204);
  assert.match(request.url, /sites\/https%3A%2F%2Fthinkerqaq\.github\.io%2F\/sitemaps\//u);
  assert.equal(request.options.method, "PUT");
  assert.equal(request.options.headers.authorization, "Bearer token");
});

test("submitGoogleSitemaps submits XML and text sitemap", async () => {
  const urls = [];
  const result = await submitGoogleSitemaps({
    siteUrl: "https://thinkerqaq.github.io/",
    origin: "https://thinkerqaq.github.io",
    accessToken: "token",
    fetchImpl: async (url) => {
      urls.push(url);
      return new Response(null, { status: 204 });
    },
  });
  assert.equal(result.length, 2);
  assert.match(decodeURIComponent(urls[0]), /sitemap-index\.xml/u);
  assert.match(decodeURIComponent(urls[1]), /sitemap-all\.txt/u);
});

test("normalizeInspectionResult keeps the operational index fields", () => {
  assert.deepEqual(
    normalizeInspectionResult("https://thinkerqaq.github.io/a/", {
      inspectionResult: {
        indexStatusResult: {
          verdict: "PASS",
          coverageState: "Submitted and indexed",
          robotsTxtState: "ALLOWED",
          indexingState: "INDEXING_ALLOWED",
          lastCrawlTime: "2026-09-21T00:00:00Z",
          googleCanonical: "https://thinkerqaq.github.io/a/",
          userCanonical: "https://thinkerqaq.github.io/a/",
          referringUrls: ["https://thinkerqaq.github.io/"],
          sitemap: ["https://thinkerqaq.github.io/sitemap-all.txt"],
        },
      },
    }),
    {
      url: "https://thinkerqaq.github.io/a/",
      verdict: "PASS",
      coverageState: "Submitted and indexed",
      robotsTxtState: "ALLOWED",
      indexingState: "INDEXING_ALLOWED",
      lastCrawlTime: "2026-09-21T00:00:00Z",
      pageFetchState: "",
      userCanonical: "https://thinkerqaq.github.io/a/",
      googleCanonical: "https://thinkerqaq.github.io/a/",
      crawledAs: "",
      referringUrls: ["https://thinkerqaq.github.io/"],
      sitemap: ["https://thinkerqaq.github.io/sitemap-all.txt"],
    },
  );
});

test("auditGoogleUrls supports offset and returns resume metadata", async () => {
  const urls = [
    "https://thinkerqaq.github.io/a/",
    "https://thinkerqaq.github.io/b/",
    "https://thinkerqaq.github.io/c/",
    "https://thinkerqaq.github.io/d/",
  ];
  const inspected = [];
  const report = await auditGoogleUrls(urls, {
    siteUrl: "https://thinkerqaq.github.io/",
    origin: "https://thinkerqaq.github.io",
    accessToken: "token",
    offset: 1,
    limit: 2,
    requestDelayMs: 0,
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      inspected.push(body.inspectionUrl);
      return new Response(JSON.stringify({
        inspectionResult: {
          indexStatusResult: {
            verdict: "PASS",
            coverageState: "Submitted and indexed",
            lastCrawlTime: "2026-09-21T00:00:00Z",
            sitemap: ["https://thinkerqaq.github.io/sitemap-all.txt"],
          },
        },
      }), { status: 200 });
    },
  });

  assert.deepEqual(inspected, urls.slice(1, 3));
  assert.equal(report.offset, 1);
  assert.equal(report.inspected, 2);
  assert.equal(report.totalAvailable, 4);
  assert.equal(report.remaining, 1);
  assert.equal(report.nextOffset, 3);
  assert.equal(report.summary.total, 2);
  assert.equal(report.summary.verdicts.PASS, 2);
  assert.equal(report.summary.withSitemap, 2);
});

test("auditGoogleUrls enforces the documented daily-site bound", async () => {
  await assert.rejects(
    auditGoogleUrls(["https://thinkerqaq.github.io/"], {
      siteUrl: "https://thinkerqaq.github.io/",
      origin: "https://thinkerqaq.github.io",
      accessToken: "token",
      limit: 2001,
      fetchImpl: async () => new Response("{}", { status: 200 }),
    }),
    /between 1 and 2000/u,
  );
});
