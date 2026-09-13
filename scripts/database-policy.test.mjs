import assert from "node:assert/strict";
import test from "node:test";

import { CATEGORY_LABELS, CATEGORY_SLUGS, REVIEWED_NOTE_PATHS } from "./content-policy.mjs";
import { sourceExclusionReason } from "./import-vnotes.mjs";

test("Database is one category with MySQL and PostgreSQL topics", () => {
  assert.equal(CATEGORY_LABELS.Database, "Database");
  assert.equal(CATEGORY_SLUGS.Database, "database");
  const reviewed = REVIEWED_NOTE_PATHS.Database;
  assert.equal(reviewed.size, 42);
  assert.equal(reviewed.has("Database/PostgreSQL/PostgreSQL.md"), true);
  assert.equal(reviewed.has("Database/PostgreSQL/PostgreSQL MVCC.md"), true);
  assert.equal([...reviewed].every((path) => path.startsWith("Database/MySQL/") || path.startsWith("Database/PostgreSQL/")), true);
  assert.equal(sourceExclusionReason({ sourcePath: "Database" }, "数据库事务.md"), "not-reviewed");
  assert.equal(sourceExclusionReason({ sourcePath: "Database" }, "SQL Join查询.md"), "not-reviewed");
});
