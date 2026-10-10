# Example — public-engine fixtures

**Problem:** verify that the engine can produce a functioning site without production content, cloud secrets or a distribution account.

**Input:** `fixtures/src/content/` includes articles, notes, projects, series and translation examples.

**Run:**

```bash
npm ci
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). For validation:

```bash
npm run build:fixtures
```

**Capabilities:** BlogCTL Go assembly, Astro collections, static diagram processing, Pagefind as part of the build.

**Why this arrangement:** fixtures belong to the engine test boundary. Real canonical content is stored separately; tests must not require production secrets. Source code is in [fixtures](../../fixtures/) and [package.json](../../package.json).
