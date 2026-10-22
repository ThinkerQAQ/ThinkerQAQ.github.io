# Deploy Inkerio to GitHub Pages

This guide adapts the existing workflow for your own root-hosted site. It does not require the author's private content or Cloudflare services.

## 1. Prepare the repositories

Complete the [content tutorial](../tutorial/first-site.md) and [site configuration](customize-site.md). Fork or copy the engine into a repository you control. For the default user Pages address, name your engine repository `YOUR_USER.github.io`. A custom domain can also serve the site at its root.

Enable Actions and set **Settings → Pages → Build and deployment → Source → GitHub Actions**. The checked-in workflow triggers on engine `main` pushes; change that branch filter if your default branch has another name.

## 2. Configure the content source

In **Settings → Secrets and variables → Actions → Variables**, add:

| Variable | Example |
| --- | --- |
| `CONTENT_REPOSITORY` | `YOUR_USER/blog-content` |

The `build` job reads this variable for forks. On the original engine repository it deliberately selects `ThinkerQAQ/blog-content` instead.

For private content, generate a dedicated SSH key pair. Add the public key as a read-only Deploy Key on the content repository. Add the private key as the engine repository Secret `BLOG_CONTENT_DEPLOY_KEY`. Public content normally needs no SSH deploy key; remove or leave empty the `ssh-key` checkout input as appropriate.

Never use the engine checkout itself as the content source. The selected repository must contain `src/content/`; confirm this before running Actions.

## 3. Adapt `.github/workflows/deploy.yml`

The workflow is configured for two author-owned hosts. A fork will build but skip those deployment jobs until you adjust them.

| Workflow location | Pages-only fork change |
| --- | --- |
| `Configure GitHub Pages` step | Replace its `github.repository` guard with your engine repository |
| `deploy` job | Replace its repository guard; retain `github-pages` environment and `needs: build` |
| `deploy-edgeone` | Remove the job if unused; it contains the author's Makers project name |
| `sync-ai-search`, `notify-search` | Remove if unused; both currently depend on `deploy-edgeone` |
| `record-content-state` | Remove if you are not adapting the content watcher; otherwise replace its guard and dependencies |
| `PUBLIC_ASK_BLOG_WORKER_URL`, `PUBLIC_UMAMI_PROXY_ORIGIN` build defaults | Remove author-specific fallback URLs; set your own values for integrations you use |

Keep `permissions: pages: write` and `id-token: write`, `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`. The build already installs Go, Node, Java, Graphviz and fonts and configures headless Chromium for CI. The static artifact path is `engine/dist` because CI checks out the engine into `engine/`.

For example, a repository guard becomes:

```yaml
if: github.repository == 'YOUR_USER/YOUR_USER.github.io'
```

Do not change the original repository's workflow as part of configuring a fork.

## 4. Decide how content changes trigger deployment

The engine's `main` push and manual workflow dispatch trigger deployment. A separate content commit does not automatically trigger those events.

For initial use, manually run **Actions → Deploy Astro site to GitHub Pages → Run workflow** after pushing content. Optional `content_sha` pins a content commit; leave it empty to use that repository's default branch.

For automatic content updates, adapt `content-watch.yml`: its job guard, `CONTENT_REPOSITORY_SSH`, content branch (`refs/heads/master` in the checked-in script), deploy workflow target and deployment-state handling all refer to the author's setup. Its schedule is every ten minutes, subject to GitHub scheduling delays. Pages-only deployments must also adjust the state-recording job's dependencies; otherwise the watcher can repeatedly request deployment without a successful marker.

The deploy workflow also has a monthly schedule for completed fitness months. Keep it if needed, or remove that schedule from your fork.

## 5. Run and verify

Commit your engine changes and run the workflow. Confirm **build** and **deploy** succeed; a green build with a skipped deploy is not a published site.

Open the Pages URL and inspect an article, `/en/`, `/rss.xml`, `/sitemap-index.xml` and `/search/`. Check that canonical URLs use your own domain. For a custom domain, also configure it in Pages and your DNS provider; changing Astro `site` does not configure DNS.

## Failures

| Symptom | Likely cause |
| --- | --- |
| Content checkout fails | Repository spelling, deploy key, or pinned SHA |
| Build succeeds, deploy skipped | Original repository guard is still present |
| Pages action reports configuration/permission error | Pages source, Actions permissions or `github-pages` environment |
| HTML opens but links/media fail under a repository prefix | Root-relative routes need a root-hosted deployment |
| Old content remains online | Workflow used the wrong content repository/SHA or was never triggered |
| Optional service job fails | Check that job's own credentials; it does not prove Pages failed |

Workflow names, variables and artifact behavior are listed in [Deployment Reference](../reference/deployment.md).
