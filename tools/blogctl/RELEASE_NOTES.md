# BlogCTL v0.1.156

DEV.to draft editor links now use the article's complete username and slug instead of the invalid `/dashboard/edit/{id}` route.

- Fixed draft links in detection, update matching, and task artifacts through their shared resolver, covering both the browser Extension and embedded Web Console.
- Preserve the complete provider-returned slug, including `temp-slug` suffixes, and avoid appending `/edit` twice.
- Do not generate a guessed editor link when the article URL is missing or invalid; refresh detection to retrieve the current URL.
- Keep executable, Bridge, and Extension versions aligned at 0.1.156.

## Upgrade

Replace the executable and extension files together, preserve the existing `Data/` directory, restart the idle Bridge, then reload the unpacked Extension in Edge or Chrome.

## Validation

Extension JavaScript syntax checks and the native BlogCTL build passed. The release workflow verifies and packages the cross-platform binaries, Extension ZIP, and SHA-256 checksums before publishing.

Authenticated DEV.to navigation has not been verified; no remote article or draft was modified while validating this fix.
