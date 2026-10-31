## Release 2.3.1

Exit card hierarchy, smaller IP/copy action, and website note removal. Java sources are unchanged from 2.3.0: reuse of its verified DEX, source hashes checked during packaging. Existing app DOM suites rerun; no new JVM run or device/browser visual QA. APK assets, signature, version, ABI sets and alignment checked.

## Release 2.3.0

133 JVM tests and 14 application DOM suites pass. New coverage: global alert off, weekly local-time windows, inclusive/exclusive boundaries, overnight/week/month rollover, timezone and spring clock change, fresh results at reopening, preserved acknowledgement threshold, backup migration and schedule validation. UI checks cover schedule persistence, invalid forms, refresh-safe drafts, minimal About, exit-IP copy and refresh in both languages/themes. Signed APK contents, ABI sets, sounds, version and original certificate verified. No physical-device alarm/schedule or visual browser QA. See UPDATE-2.3.0-fa.md and verification/.

## Release 2.2.1

120 JVM tests and 13 application DOM suites pass. New coverage: proxy-only exit discovery config, authenticated SOCKS domain forwarding, strict bounded HTTP/IP parsing, per-config country isolation, retry cadence, and exit detail states in both languages/themes. Tests use synthetic responses/configuration fixtures, not live tunneled connections. APK compilation/signature/assets/resources verified. No physical-device, actual two-hop configuration, or visual browser QA. See verification/ and UPDATE-2.2.1-fa.md.

# Config Monitor 2.1.0-beta1 — validation

2026-10-24. Android package com.configmonitor.app, versionCode 19. Platform 2.1.0-beta1.

## Delivered changes

The operational admin uses the structural layout of Config-Monitor-Admin-preview-v3.html: metric icons/sparklines, install trend, version donut/legend, placement bars, activity heatmap, recent devices, campaign quota cards, six-metric advertiser reports, notification metrics, release rows/version distribution, phone placement mocks and update-dialog previews. Every original reference CSS rule remains in order; all four YekanBakh/Inter font binaries match the embedded reference exactly. Live statistics come from API data; only the standalone preview and explicitly labeled phone mockups use samples. Static asset URLs are versioned.

The banner and APK fields use a shared uploader: pick or drag/drop, file name/size, image/GIF preview, real XMLHttpRequest upload progress, transferred bytes/speed, cancellation, retry, server validation stage, and reuse of successfully uploaded media when the subsequent form save fails. Transfer reaching 100% is not shown as completed until the server accepts the file. Drawer close aborts an active transfer and stale continuations cannot save a campaign. Final record saving is guarded from drawer dismissal. CSRF and authenticated same-origin requests remain.

GIF upload recognizes GIF87a/GIF89a, validates every frame, stores the original bytes and serves image/gif. Limits: 2 MiB uploaded size, 2 million canvas pixels, 200 frames and 80 million decoded frame pixels. Truncated/invalid/oversized files are rejected. Existing PNG/JPEG/WebP support remains. The Android banner renderer supports animated GIF in both placements using a software Movie-backed view on API 24+, with lifecycle pause/resume and no JavaScript. Banner impressions/clicks still use the existing viewability and event flow; no GIF script bridge is introduced. Application alarm fixes and automatic panel connection remain included.

## Tests completed

- 23 Python backend tests passed, including GIF byte preservation, MIME, frame metadata, static GIF, corruption, dimension/frame/size limits and prior auth, campaign, quota, notification and release regressions.
- Admin UI integration passed against a real temporary WSGI/SQLite backend over stdin: login, campaign create/edit/delete, public quota/revocation, actual GIF upload through the new uploader and two-placement campaign, notifications, devices, menus/settings/logout. The XHR transport is bridged by the test; no live HTTP server is used.
- Uploader event tests passed: real progress-event handling, processing, CSRF, preview cleanup, media reuse, network/server errors, cancellation, timeout and stale response guard. Events are simulated; real network throughput was not measured.
- Layout DOM suite passed for all seven admin pages and public reports with populated fixtures, light/dark, tooltip/select interactions, placement hiding and phone update preview. Reference CSS/font parity is recorded in reference-parity.log.
- Android: full Java 17 javac/D8 build, 103 JVM tests and 11 UI suites passed. Three new tests verify GIF signature/dimension/size prechecks. GIF rendering/audio/Android lifecycle have not been tested on a phone.
- APKs checked for version/code, same signature, fresh DEX/assets, original native libraries, correct ABI sets, unchanged resource IDs, WAV assets and 16 KiB zip alignment. The actual universal APK passes the server validator and update targeting from beta6/code18 to code19.
- Installer/update shell syntax checked. Source archives reopened, source hashes and file permissions checked, signing material excluded and delivery SHA-256 checks verified during packaging.

## Verification limits

Browser security policy blocked opening the local reference file. No alternate browser path was attempted; there is no screenshot or pixel comparison, so exact rendered parity is not claimed. The reference CSS/font identities and structural DOM tests are the evidence available. Review the standalone preview manually on desktop/mobile.

No production server deployment, SSH session, live-domain request, real upload over HTTP, Ubuntu upgrade execution, or physical Android device test occurred. Update script retains data/media/environment and backs up application code before replacing it; its rollback/start/socket-health logic needs acceptance on the target Ubuntu host. The database schema is unchanged. Gradle lint/instrumentation did not run.
