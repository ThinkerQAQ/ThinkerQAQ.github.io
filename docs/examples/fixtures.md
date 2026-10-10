# Example — public-engine fixtures

**Problem:** verify that the engine can produce a functioning site without production content, cloud secrets or a distribution account.

**Input:** `fixtures/src/content/` includes articles, notes, projects, series and translation examples.

**Run:**

```bash
npm ci
npm run dev:quick
```

Open [http://localhost:4321](http://localhost:4321). For validation:

```bash
npm run build:fixtures
```

**Capabilities:** fast preview uses BlogCTL Go assembly and Astro collections. The optional full build also runs static diagram processing and Pagefind and requires Java/Graphviz and headless Chromium.

**Why this arrangement:** fixtures belong to the engine test boundary. Real canonical content is stored separately; tests must not require production secrets. Source code is in [fixtures](../../fixtures/) and [package.json](../../package.json).
