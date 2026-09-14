import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { handleRequest } = await import("./index.js");

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async first() {
    const [contentType, contentId, reactionType, visitorHash] = this.params;
    const matches = this.db.rows.filter(
      (row) => row.contentType === contentType && row.contentId === contentId && row.reactionType === reactionType,
    );

    if (this.sql.startsWith("SELECT COUNT(*)")) return { count: matches.length };
    if (this.sql.startsWith("SELECT 1 AS reacted")) {
      return matches.some((row) => row.visitorHash === visitorHash) ? { reacted: 1 } : null;
    }
    throw new Error(`Unsupported first() SQL: ${this.sql}`);
  }

  async run() {
    const [contentType, contentId, reactionType, visitorHash] = this.params;
    const keyMatches = (row) =>
      row.contentType === contentType &&
      row.contentId === contentId &&
      row.reactionType === reactionType &&
      row.visitorHash === visitorHash;

    if (this.sql.startsWith("INSERT OR IGNORE")) {
      if (!this.db.rows.some(keyMatches)) {
        this.db.rows.push({ contentType, contentId, reactionType, visitorHash });
      }
      return { success: true };
    }

    if (this.sql.startsWith("DELETE FROM reactions")) {
      this.db.rows = this.db.rows.filter((row) => !keyMatches(row));
      return { success: true };
    }

    throw new Error(`Unsupported run() SQL: ${this.sql}`);
  }
}

class FakeDb {
  constructor() {
    this.rows = [];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

function env() {
  return {
    ALLOWED_ORIGINS: "https://thinkerqaq.github.io,http://localhost:4321",
    REACTION_HMAC_SECRET: "test-secret",
    REACTIONS_DB: new FakeDb(),
    REACTION_RATE_LIMITER: {
      async limit() {
        return { success: true };
      },
    },
  };
}

function request(method, path, visitor = "123e4567-e89b-12d3-a456-426614174000", origin = "https://thinkerqaq.github.io") {
  return new Request(`https://reactions.example${path}`, {
    method,
    headers: {
      origin,
      "x-reaction-visitor": visitor,
      "cf-connecting-ip": "203.0.113.5",
    },
  });
}

test("GET starts at zero and not reacted", async () => {
  const runtime = env();
  const response = await handleRequest(
    request("GET", "/v1/reactions?contentType=article&contentId=go-cas"),
    runtime,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { count: 0, reacted: false });
});

test("PUT is idempotent and DELETE removes the reaction", async () => {
  const runtime = env();
  const path = "/v1/reactions?contentType=note&contentId=java%2Fjuc";

  let response = await handleRequest(request("PUT", path), runtime);
  assert.deepEqual(await response.json(), { count: 1, reacted: true });

  response = await handleRequest(request("PUT", path), runtime);
  assert.deepEqual(await response.json(), { count: 1, reacted: true });

  response = await handleRequest(request("DELETE", path), runtime);
  assert.deepEqual(await response.json(), { count: 0, reacted: false });

  response = await handleRequest(request("DELETE", path), runtime);
  assert.deepEqual(await response.json(), { count: 0, reacted: false });
});

test("different visitors contribute independently", async () => {
  const runtime = env();
  const path = "/v1/reactions?contentType=article&contentId=ddia";

  await handleRequest(request("PUT", path, "123e4567-e89b-12d3-a456-426614174000"), runtime);
  const response = await handleRequest(
    request("PUT", path, "223e4567-e89b-12d3-a456-426614174111"),
    runtime,
  );
  assert.deepEqual(await response.json(), { count: 2, reacted: true });
});

test("rejects disallowed origins and invalid resources", async () => {
  const runtime = env();

  let response = await handleRequest(
    request("GET", "/v1/reactions?contentType=article&contentId=go", undefined, "https://evil.example"),
    runtime,
  );
  assert.equal(response.status, 403);

  response = await handleRequest(
    request("GET", "/v1/reactions?contentType=other&contentId=go"),
    runtime,
  );
  assert.equal(response.status, 400);
});

test("rate limits mutation requests", async () => {
  const runtime = env();
  runtime.REACTION_RATE_LIMITER = {
    async limit() {
      return { success: false };
    },
  };

  const response = await handleRequest(
    request("PUT", "/v1/reactions?contentType=article&contentId=go-cas"),
    runtime,
  );
  assert.equal(response.status, 429);
});
