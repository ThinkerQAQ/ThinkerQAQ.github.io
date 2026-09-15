import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const notesRoot = path.join(repoRoot, 'src', 'content', 'notes');
const translationsRoot = path.join(repoRoot, 'src', 'content', 'note-translations', 'en');

async function collectMarkdownFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(root, absolute));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }

  return files.sort();
}

test('every published note has an English translation at the same relative path', async () => {
  const sourceNotes = await collectMarkdownFiles(notesRoot);
  const englishNotes = new Set(await collectMarkdownFiles(translationsRoot));
  const missing = sourceNotes.filter((relativePath) => !englishNotes.has(relativePath));

  assert.equal(
    missing.length,
    0,
    `Missing English translations for ${missing.length} note(s):\n${missing.map((item) => `- ${item}`).join('\n')}`,
  );
});
