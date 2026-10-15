# BlogCTL v0.1.157

Article publishing now parses canonical frontmatter as YAML, fixing failures for valid inline tags such as `tags: [并发编程, Message Passing, Java]`.

- Replace the handwritten scalar and list parser with `go.yaml.in/yaml/v3`; support inline and multiline sequences, YAML comments, quoting and block scalars.
- Include source paths, YAML diagnostics, parse status and duration in failures; report publishing failures without incorrectly implying a remote request occurred.
- Preserve the DEV.to draft editor fixes from v0.1.156.
- Keep executable, Bridge, and Extension versions aligned at 0.1.157.

## Upgrade

Replace the executable and extension files together, preserve the existing `Data/` directory, restart the idle Bridge, then reload the unpacked Extension in Edge or Chrome.

## Validation

The native build, 102 real article/platform payload compilations, four valid YAML form integration runs, three rejected malformed/type/duplicate-key scenarios, documentation links, extension syntax and public boundary checks passed. No unit tests or remote publishing operations were run. Cross-platform release packaging and authenticated remote publishing have not been verified.
