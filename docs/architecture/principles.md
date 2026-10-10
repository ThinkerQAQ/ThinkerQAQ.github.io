# Architecture principles

**Definition:** keep a small, stable engine with replaceable components and explicit contracts; reuse mature implementations before custom work.

## Decision hierarchy

1. Is the need already handled by a standard/protocol?
2. Is there a maintained SDK, mature open-source library, service or infrastructure capability?
3. Can an existing provider/profile be configured to solve it?
4. Is a project extension appropriate?
5. Only if these are insufficient, implement a custom mechanism and document its maintenance cost.

## Applied to the blog

- **Core:** canonical content assembly and static site output have stable ownership.
- **Extensions:** platform publishers, search adapters, diagram renderers and EdgeOne integration can change independently.
- **Configuration:** DevTool `.devtool.toml`, BlogCTL `blogctl.toml`, and environment/CI settings select providers without hardcoding secrets.
- **Self-hosting:** DevTool operates the project's own build/verify/package workflow; the engine can run with fixtures independently of cloud services.

## Example

A new remote publishing platform should reuse the existing BlogCTL adapter contract and mature HTTP/SDK support. Do not duplicate authentication, asset handling or retry state. Verify a real remote draft readback before declaring write support.

**Boundary:** technical investigation and rejected alternatives go into Deep Design; actual supported CLI and config remain in Reference.
