# Content engagement analytics

## Decision

The blog should keep Umami automatic pageviews as the traffic layer and add a small, explicit content-engagement layer for Articles and Notes.

The implementation follows standard web-analytics primitives, but the exact thresholds are a ThinkerQAQ product definition rather than an industry standard:

- Measure foreground/visible time instead of wall-clock time.
- Combine time with reading progress instead of treating either signal as sufficient.
- Emit sparse milestones rather than heartbeat events every few seconds.
- Use stable event names plus low-cardinality properties.
- Send milestones while the page is still alive instead of depending on `unload`.
- Keep pageview attribution, UTM parameters, and content-engagement events separate.

Chosen blog semantics:

| Metric | Definition | Purpose |
| --- | --- | --- |
| `read_milestone(time=30)` | 30 seconds of visible-page time | Reader stayed beyond a quick glance |
| `read_milestone(time=60)` | 60 seconds of visible-page time | Sustained reading |
| `read_milestone(time=180)` | 180 seconds of visible-page time | Long-form reading |
| `read_milestone(progress=50)` | Reached 50% reading progress | Reached the middle of the content |
| `read_milestone(progress=90)` | Reached 90% reading progress | Reached the end region |
| `engaged_read` | >=30 visible seconds and >=50% progress | Primary meaningful-read KPI |
| `deep_read` | >=60 visible seconds and >=90% progress | Primary near-completion KPI |

`30s + 50%` and `60s + 90%` are intentionally stricter than a generic session-engagement definition. They should be recalibrated only after enough real traffic exists to inspect the distribution.

## Industry research

### Google Analytics 4

GA4 defines user engagement as time while a webpage is in focus or an app is in the foreground. Engagement time is sent when focus is lost, the page is left, or the app moves to the background. This supports using visible/foreground time rather than raw elapsed time.

Source: https://support.google.com/analytics/answer/11109416

GA4's generic engaged-session threshold is useful for session analysis, but it is not a definition of a completed long-form article read. This blog therefore uses a stricter content-level KPI.

### Plausible

Plausible excludes inactive-tab time from time-on-page and treats scroll depth as a first-class engagement metric. Its own guidance recommends interpreting scroll depth together with time because high scroll with very low time may indicate skimming, while low scroll with high time may indicate concentrated reading near the top.

Sources:

- https://plausible.io/docs/metrics-definitions
- https://plausible.io/docs/scroll-depth

### Snowplow

Snowplow's web activity tracking uses page-activity pings to determine whether a visitor is still engaged and records scroll extent. Its documentation uses 30 seconds as an example minimum visit length before the first activity ping. Snowplow also supports interaction signals such as scroll, click, touch, and keypress.

Sources:

- https://docs.snowplow.io/docs/events/ootb-data/page-activity-tracking/
- https://docs.snowplow.io/docs/sources/web-trackers/tracking-events/activity-page-pings/

### Browser platform guidance

The Page Visibility API is the standard browser primitive for detecting whether a document is visible or hidden. MDN recommends `visibilitychange` for analytics lifecycle handling and warns against relying on `unload` / `beforeunload`, especially on mobile and with the back-forward cache.

Sources:

- https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon

### Umami

Umami officially supports custom events with event properties through `umami.track(name, data)` and data attributes. The tracker already includes page URL/title/referrer properties, so custom events do not need to duplicate URL or title.

Umami also supports:

- `data-domains` to keep development traffic out of production analytics.
- `data-exclude-hash` so article TOC anchors do not fragment page URLs.
- `data-performance=true` to collect Core Web Vitals.
- `localStorage['umami.disabled']` as the documented way to exclude one's own browser.

Sources:

- https://docs.umami.is/docs/track-events
- https://docs.umami.is/docs/tracker-functions
- https://docs.umami.is/docs/tracker-configuration
- https://docs.umami.is/docs/exclude-my-own-visits

## What is standard and what is project-specific

| Part | Status |
| --- | --- |
| Foreground/visible-time accounting | Standard analytics pattern |
| Visibility API for tab/background lifecycle | Standard browser primitive |
| Scroll depth / content progress | Standard content-engagement signal |
| Combining time + progress | Common and well-founded content-analytics pattern |
| Stable event names + properties | Umami-recommended event design |
| Avoiding unload-dependent analytics | Standard lifecycle guidance |
| 30s/50% engaged threshold | Project-specific |
| 60s/90% deep threshold | Project-specific |
| 30/60/180 and 50/90 milestone set | Project-specific, intentionally sparse |

Conclusion: the architecture is standard; the thresholds are a deliberate measurement policy for this blog.

## Event model

### Automatic Umami data

Keep Umami automatic pageviews enabled. Do not manually send pageviews because Umami already tracks ordinary navigation and History API navigation.

The tracker is configured with:

- production domain restriction;
- hash exclusion;
- search/query retention so UTM attribution remains available;
- Core Web Vitals collection.

### Content events

All content events inherit Umami's page URL and default page properties.

`read_milestone` properties:

| Property | Values |
| --- | --- |
| `content_type` | `article`, `note` |
| `lang` | `zh`, `en` |
| `series` | article series ID when present |
| `category` | note category when present |
| `metric` | `time`, `progress` |
| `value` | `30`, `60`, `180`, `50`, `90` |

`engaged_read` and `deep_read` additionally include the observed `active_seconds` and `progress_percent` at the moment the threshold is satisfied.

### Navigation events

`content_nav` records movement from one piece of content to another:

| Property | Values |
| --- | --- |
| `kind` | `series`, `note_collection` |
| `direction` | `previous`, `next`, `index` |

`language_switch` is emitted by the language switcher with `from` and `to` properties.

`outbound_click` is emitted from Article/Note pages for HTTP(S) links leaving `thinkerqaq.github.io`, with only `target_domain`. Full outbound URLs are intentionally not stored.

## Runtime algorithm

### Active reading time

1. Start a 1-second sampling interval.
2. Count elapsed time only while the previous document state was visible.
3. Cap a single sampling delta at 2.5 seconds so laptop sleep, debugger pauses, or heavily delayed timers cannot add a large false reading interval.
4. On `visibilitychange`, advance the current visible interval immediately before switching state.
5. Do not use `unload` or `beforeunload` as the source of truth.

This matches the industry principle of foreground engagement while remaining simple enough for a static blog.

### Reading progress

Progress uses the same `#reading-start` and `#reading-end` boundaries as the visible reading-progress UI. It is measured against the content reading range rather than the full page, so comments, related content, and the footer do not distort article completion.

Only the maximum progress reached during the pageview is used.

### Deduplication

Every milestone and derived KPI is emitted at most once per pageview. A refresh is a new pageview and may legitimately produce a new set of reading events.

Session-level deduplication is intentionally not used because it would hide genuine repeat reads and make event/pageview ratios harder to interpret.

### Astro lifecycle

The runtime has explicit page cleanup and bootstrap cleanup hooks. It also listens for `astro:before-swap` and `astro:page-load`, so adding Astro client-side navigation later will not leave old timers or listeners running.

## Analysis model

The main weekly funnel is:

~~~text
Article / Note pageview
        |
        v
engaged_read
        |
        v
deep_read
        |
        v
content_nav(next/index)
~~~

Recommended KPIs:

| KPI | Formula / interpretation |
| --- | --- |
| Engaged-read rate | unique visitors with `engaged_read` / content visitors |
| Deep-read rate | unique visitors with `deep_read` / content visitors |
| Continuation rate | visitors with `content_nav` / engaged readers |
| 50% reach | `read_milestone(progress=50)` |
| 90% reach | `read_milestone(progress=90)` |
| Long-form readers | `read_milestone(time=180)` |
| External-interest signal | `outbound_click` by `target_domain` |
| Translation interest | `language_switch` by `from` and `to` |

Do not use bounce rate or Umami visit duration alone to judge article quality. A single-page reader can still be an engaged or deep reader.

## Umami configuration after deployment

Create two Goals in Umami:

1. `Engaged Reader` -> event `engaged_read`.
2. `Deep Reader` -> event `deep_read`.

After enough data exists, create a Funnel:

1. Article/Note pageview.
2. `engaged_read`.
3. `deep_read`.
4. `content_nav`.

Keep Search Console as the source of truth for Google impressions, queries, clicks, CTR, and ranking. Use Umami for on-site behavior and referral attribution.

## Deferred events

The following are deliberately not part of the first implementation:

- `copy_code`
- `toc_click`
- `comment_open`

They are potentially useful but lower priority. Adding them now would increase event volume before the core reading model has enough data to validate its thresholds.

## Validation checklist

Before merging:

1. Run the content-analytics unit tests.
2. Run `astro check` and the production build through normal CI.
3. Verify the Umami script still appears only when the website ID and Worker origin exist.
4. Verify `data-domains`, `data-exclude-hash`, and `data-performance` on the production tracker.
5. Verify a browser with `umami.disabled = 1` sends no pageviews or custom events.
6. In a normal browser, open one Article and verify 30s/50% yields `read_milestone` plus `engaged_read`.
7. Continue to 60s/90% and verify `deep_read` is emitted once.
8. Switch tabs for at least 30 seconds and verify hidden time does not advance the time milestone.
9. Click previous/next/index navigation and verify `content_nav`.
10. Switch language and verify `language_switch`.
11. Click an external HTTP(S) link and verify only its domain is recorded.

## Recalibration rule

Do not tune thresholds from a handful of sessions. Revisit the 30s/50% and 60s/90% rules only after at least several hundred real content visits or a similarly stable sample. Compare the distributions by Article vs Note and Chinese vs English before changing the definitions.
