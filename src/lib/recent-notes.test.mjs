import assert from "node:assert/strict";
import test from "node:test";
import { selectRecentNotes } from "./recent-notes.mjs";

function note(id, category, updatedAt, options = {}) {
  return {
    id,
    data: {
      category,
      updatedAt: new Date(updatedAt),
      status: "active",
      indexable: true,
      featured: false,
      order: 10,
      ...options,
    },
  };
}

test("recent notes use update dates, exclude historical/unlisted notes, and cap categories", () => {
  const pool = [
    note("ai/older", "ai", "2026-10-24"),
    note("ai/new", "ai", "2026-10-27"),
    note("ai/second", "ai", "2026-10-26"),
    note("ai/third", "ai", "2026-10-25"),
    note("database/new", "database", "2026-10-23"),
    note("draft", "database", "2026-10-30", { status: "historical" }),
    note("private", "database", "2026-10-31", { indexable: false }),
  ];
  assert.deepEqual(selectRecentNotes(pool).map((entry) => entry.id), [
    "ai/new", "ai/second", "database/new",
  ]);
});

test("a single recent category shows at most two notes, never fills from archives", () => {
  const pool = [
    note("ai/a", "ai", "2026-10-26", { order: 1 }),
    note("ai/b", "ai", "2026-10-26", { order: 2 }),
    note("ai/c", "ai", "2026-10-26", { order: 3 }),
    note("java/old", "java", "2022-01-01", { status: "historical" }),
  ];
  assert.deepEqual(selectRecentNotes(pool).map((entry) => entry.id), ["ai/a", "ai/b"]);
});

test("ties prioritize featured notes, then note order and ID deterministically", () => {
  const pool = [
    note("ai/z", "ai", "2026-10-26", { order: 10 }),
    note("ai/x", "ai", "2026-10-26", { featured: true, order: 15 }),
    note("java/b", "java", "2026-10-26", { order: 3 }),
    note("java/a", "java", "2026-10-26", { order: 3 }),
  ];
  assert.deepEqual(selectRecentNotes(pool).map((entry) => entry.id), ["ai/x", "java/a", "java/b"]);
});

test("empty or disabled feeds do not produce entries", () => {
  const pool = [note("ai/a", "ai", "2026-10-26")];
  assert.deepEqual(selectRecentNotes([]), []);
  assert.deepEqual(selectRecentNotes(pool, { limit: 0 }), []);
  assert.deepEqual(selectRecentNotes(pool, { maxPerCategory: 0 }), []);
});

test("the recent feed includes nontechnical categories alongside engineering notes", () => {
  const pool = [
    note("ai/first", "ai", "2026-10-27"),
    note("photography/first", "photography", "2026-10-26"),
    note("database/first", "database", "2026-10-25"),
    note("fitness/archive", "fitness", "2026-10-28", { status: "historical" }),
  ];
  assert.deepEqual(selectRecentNotes(pool).map((entry) => entry.id), [
    "ai/first", "photography/first", "database/first",
  ]);
});
