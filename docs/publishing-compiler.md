# Publishing Compiler

## Goal

The canonical article remains Markdown. Mermaid remains Mermaid in the source repository and on the personal site.

External publishing uses a small compiler only for semantic blocks that are not portable across platforms.

```text
Canonical Markdown
        |
        +--> Personal site --> Mermaid.js --> SVG in the browser
        |
        +--> BlogCTL publishing
                |
                +--> Mermaid fence
                |       |
                |       +--> Mermaid CLI --> PNG
                |                          |
                |                          +--> Cloudflare R2
                |
                +--> portable Markdown image URL
                        |
                        +--> DEV.to / Chinese platforms / Medium fallback
```

Ordinary Markdown is preserved as much as possible. This is not a full Markdown reserializer.

## Mermaid assets

A Mermaid diagram is normalized and hashed together with the pinned renderer identity:

```text
@mermaid-js/mermaid-cli@11.17.0
+
normalized Mermaid source
        |
        v
SHA-256
        |
        v
generated/mermaid/<24-hex>.png
```

The content-addressed key makes an unchanged diagram stable across articles and publishing runs.

The default public URL is:

```text
https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/generated/mermaid/<hash>.png
```

The renderer writes to the local publishing cache under `.distribution/assets/mermaid/`. It is not part of the Astro site build and is not committed.

## R2 configuration

Live publishing of an article containing Mermaid requires S3-compatible R2 credentials in the BlogCTL process environment:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
```

Optional overrides:

```text
R2_ENDPOINT
R2_PUBLIC_BASE_URL
MERMAID_PUPPETEER_CONFIG_FILE
```

`R2_PUBLIC_BASE_URL` defaults to the existing public ThinkerQAQ R2 domain.

Credentials are used only for live asset upload. Export and dry-run can compile deterministic R2 URLs without credentials.

## Platform flow

### Personal site

No publishing asset is generated. The existing browser Mermaid runtime renders the fenced block directly.

### Chinese platforms

`distribute.mjs` compiles Mermaid fences to image Markdown. During live BlogCTL sync, generated Mermaid assets are rendered and uploaded to R2 before the platform delivery step starts.

### DEV.to

The DEV.to payload uses the same compiled R2 image URLs. Live syndication prepares R2 assets before the DEV API request. Dry-run performs no upload.

### Medium

The compiler also converts Mermaid to an image in the generated copy/paste HTML fallback.

The current Medium browser-session adapter writes text deltas but does not have a verified native body-image delta/upload contract. A live Medium draft containing a body image therefore stops before draft creation instead of silently degrading the diagram to source code or a text link.

This is an explicit transport limitation. The generated copy/paste fallback contains the correct image.

## Failure policy

Publishing fails before remote content mutation when:

- a Mermaid fence is unclosed;
- Mermaid rendering fails;
- required R2 configuration is missing;
- R2 upload fails;
- Medium requires an unsupported native body-image write.

The personal site remains independent from this pipeline.
