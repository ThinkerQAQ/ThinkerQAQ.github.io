# How to add or change content

**Task:** update an article without editing generated engine content.

## Preconditions

Use a checkout of the canonical `blog-content` repository or the public [content template](https://github.com/ThinkerQAQ/blog-content-template) beside the engine.

## Steps

1. Edit or create a Markdown entry under `blog-content/src/content/articles/` (or the matching notes/projects/series collection).
2. Follow the [content schema](../reference/content-schema.md) for frontmatter and translation rules.
3. From the engine root, assemble and check:

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npm run check
npm run dev:site
```

## Verify and boundary

Confirm the page renders at [localhost:4321](http://localhost:4321) with expected title and links. Commit **source Markdown** to the content repository, not the generated engine snapshot. Production deployment is a separate operation; see [deployment How-to](deploy.md).
