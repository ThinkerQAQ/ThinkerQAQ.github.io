# Historical releases — superseded by the repository split

**Snapshot:** 2026-11-01 (GitHub release metadata, before retirement).

`ThinkerQAQ.github.io` is now a **website configuration and deployment wrapper**, not a software distribution repository. The release artifacts below were originally published while it also contained the Inkerio engine and BlogCTL. The software has since been separated into dedicated repositories.

- **Inkerio engine:** [ThinkerQAQ/inkerio](https://github.com/ThinkerQAQ/inkerio) — independent source Releases.
- **SyndiRelay publisher:** [ThinkerQAQ/syndirelay](https://github.com/ThinkerQAQ/syndirelay) — currently private and undergoing a separate licensing/security review. It has **no approved public binary/extension release**.
- **BlogCTL legacy binaries:** do not use as SyndiRelay installers. Older `fhttp` / `tls-client` dependency licensing was not conclusively reviewed for redistribution. Existing installed copies are not automatically upgraded or uninstalled by retiring a download.

At this snapshot: **24 Releases**, **194 attached files**, and **260 total asset downloads**. Download counts are *file download events*, not distinct end users; automated tests or the owner may account for some events.

| Former release tag | Published (UTC) | Asset files | Asset downloads |
| --- | --- | ---: | ---: |
| `inkerio-v2.0.0` | 2026-10-31 | 3 | 3 |
| `blogctl-v0.1.193` | 2026-10-31 | 15 | 15 |
| `blogctl-v0.1.192` | 2026-10-31 | 8 | 11 |
| `blogctl-v0.1.191` | 2026-10-30 | 8 | 11 |
| `blogctl-v0.1.190` | 2026-10-30 | 8 | 11 |
| `blogctl-v0.1.188` | 2026-10-22 | 8 | 11 |
| `blogctl-v0.1.187` | 2026-10-22 | 8 | 10 |
| `blogctl-v0.1.185` | 2026-10-21 | 8 | 12 |
| `blogctl-v0.1.184` | 2026-10-21 | 8 | 11 |
| `blogctl-v0.1.183` | 2026-10-21 | 8 | 12 |
| `blogctl-v0.1.182` | 2026-10-21 | 8 | 12 |
| `blogctl-v0.1.181` | 2026-10-21 | 8 | 12 |
| `blogctl-v0.1.180` | 2026-10-21 | 8 | 10 |
| `blogctl-v0.1.179` | 2026-10-21 | 8 | 14 |
| `blogctl-v0.1.178` | 2026-10-21 | 8 | 12 |
| `blogctl-v0.1.177` | 2026-10-21 | 8 | 11 |
| `blogctl-v0.1.176` | 2026-10-21 | 8 | 12 |
| `blogctl-v0.1.175` | 2026-10-21 | 8 | 12 |
| `blogctl-v0.1.164` | 2026-10-17 | 8 | 9 |
| `blogctl-v0.1.161` | 2026-10-17 | 8 | 10 |
| `blogctl-v0.1.157` | 2026-10-15 | 8 | 11 |
| `blogctl-v0.1.156` | 2026-10-14 | 8 | 11 |
| `blogctl-v0.1.155` | 2026-10-13 | 8 | 8 |
| `blogctl-v0.1.153` | 2026-10-12 | 8 | 9 |

## Historical compatibility

The corresponding Git **tags** and commit history are retained for source provenance. Retiring a GitHub Release removes its download assets and may break old direct-download links; it does not erase copies downloaded earlier, third-party mirrors or local installations. Consumers needing supported source should use the new repositories and current configuration docs.

Do not republish old BlogCTL binaries until their original build, transitive dependency licenses and platform integration policy are independently reviewed. For SyndiRelay, consult its `docs/compliance/PUBLICATION_READINESS.md` after access is granted.
