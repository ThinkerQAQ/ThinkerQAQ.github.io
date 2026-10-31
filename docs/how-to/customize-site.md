# Configure your site's identity

The repository currently contains the configuration for the author's site. Running the sample locally works without changing it; publishing your own site requires the settings below. There is no single environment variable that renames the whole site.

## Names, domain and contact details

Edit these files in your **engine checkout**:

| File | What to change |
| --- | --- |
| [`src/config/site.ts`](../../src/config/site.ts) | `SITE.title`, `homeTitle`, `description`, `author`, `url`, `github`, `profiles`, `repository`, `contactEmail`, `alternateNames` |
| [`src/config/i18n.ts`](../../src/config/i18n.ts) | Both locales' `homeTitle`, home accessibility labels, About and Search descriptions that contain the author's name |
| [`astro.config.mjs`](../../astro.config.mjs) | `site`: use the same canonical HTTPS origin as `SITE.url` |
| Content repository `src/content/pages/about.md` and `src/content/pages/en/about.md` | About biography, links, usage notice, lead and SEO descriptions; Inkerio only renders |
| [`public/`](../../public/) | Your icons, domain/verification files and other site-owned static assets |

Remove or replace `icpRecord`, `icpLookupUrl`, `publicSecurityRecord` and `publicSecurityLookupUrl` in `SITE`. They identify the author's site. Use your own applicable registration details; do not copy the template values as your site's registration.

Search the engine for `ThinkerQAQ` and `thinkerqaq.com` and inspect remaining matches individually. Keep upstream repository/module URLs when they identify Inkerio source; replace values that identify the published website. Do not globally replace names inside dependency or Go import paths.

## Comments, analytics and reactions

| Feature | Configuration | How to verify |
| --- | --- | --- |
| utterances comments | `COMMENTS.repository`, `label`, `theme` in `src/config/site.ts`; configure your own GitHub Issues repository and utterances installation | Scroll to an article's discussion and inspect the repository it opens |
| Umami | `PUBLIC_UMAMI_WEBSITE_ID` and `PUBLIC_UMAMI_PROXY_ORIGIN` | Check `/u.js` and collection requests, then your own dashboard |
| Helpful reactions | `PUBLIC_REACTION_WORKER_URL` | Deploy your [own Reactions Worker](../../workers/blog-reactions/README.md) and verify a content counter |
| AI chat | Optional Worker settings and frontend mount | Follow the [Worker guide](../../workers/blog-ai/README.md); chat is disabled in the checked-in configuration |

The comment component always attempts to load utterances when mounted; it has no general `enabled` switch. Configure your repository or remove the component mounts if you do not want comments. Leaving analytics/reaction build variables empty disables those integrations; do not leave the author's IDs in a fork.

For local environment variables, use your shell or Astro's local environment files. Set the same public values in your hosting build environment. A build variable change requires rebuilding the static site.

## Root hosting and deployment

Routes and media links use site-root paths such as `/articles/` and `/media/`. Use a root-domain deployment, a custom domain, or a user Pages site at `https://YOUR_USER.github.io/`. A project Pages URL under `/REPOSITORY/` needs a separate audit of root-relative links and Astro `base`; changing `site` alone does not add subpath support.

Update BlogCTL's `[search]` section separately if you use indexing. It selects which live site to submit and does not modify the site's build settings. See [BlogCTL configuration](../../tools/blogctl/docs/reference/configuration.md).

## Verify before publishing

Assemble your chosen content, run `npm run check`, then `npm run build` and `npm run preview`. Inspect the homepage title, About page, footer, article canonical URL, language links, `rss.xml`, `sitemap-index.xml`, comments and analytics. Search `dist/` for the old site origin and investigate any remaining website links.

## Article syndication domain

BlogCTL currently builds canonical and root-relative publishing links from the `SiteOrigin` constant in `tools/blogctl/compiler/markdown.go`. Changing the website settings above or the indexing `[search]` configuration does not update that constant. Adapt and inspect compiled links before syndicating a fork. Also configure your own R2 asset store; the author’s public asset URL does not grant upload access.

## Copyright notices for content and photography

The `CopyrightNotice` component renders the same bilingual policy across article and note detail pages, Life record pages, and the Life index (with a shorter photography notice). It is shown before comments or reactions and does not alter canonical metadata or Markdown content. Site-wide `©` in the footer is a separate, short attribution.

The **authoritative policy** is in the content repository at `src/content/site/copyright.json` (`zh` and `en`, each containing `title`, `notice`, `photo`, `syndication`, and `source`). The site assembler copies it into Inkerio's generated `src/content/`, and Astro imports that assembled file. The About page is also content-owned: edit `src/content/pages/about.md` and `src/content/pages/en/about.md` (`title`, `description`, `seoDescription`, `language` frontmatter). Its "Copyright and Use" paragraph is a human-facing summary and should agree with the JSON policy.

BlogCTL reads the **same content-root JSON at compile time**; changing copyright wording no longer requires releasing or reinstalling BlogCTL. If an older content checkout does not have a policy file, the Go publisher uses the previous embedded policy as a compatibility fallback. Invalid or incomplete present policies are rejected. Published copies on external sites are changed only by an explicit update. Inkerio's code is subject to its open-source license; this does not license original text or photography.

Do not add the same legal notice to individual Markdown files: it causes duplicate notices when the layout renders the component. Third-party images, quoted works, and software examples still require their own attribution and licensing checks; a blanket notice does not establish ownership of them.
