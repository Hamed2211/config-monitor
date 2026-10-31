
# Config Monitor

2.3.0 adds an independent automatic-alert switch, a weekly local-time alert window, a compact exit-IP card, and a minimal About page. The alert window supports overnight periods and is included in encrypted backups.

Private Android network configuration monitor, version 2.1.0-beta1 (versionCode 19). See **README-fa.md** for full Persian installation, behavior, support matrix and limitations. See **VALIDATION.md** for exactly what was tested and which device checks remain.

- Deep black/emerald theme, compact dashboard, collapsible search/filter tools, bounded real-history sparklines with honest failure gaps, and a native safe-inset alarm with pinned acknowledgement/snooze actions.
- Approved UI refresh: native safe-area padding, persistent header/back and bottom navigation, real scheduler countdown, compact mirrored endpoint/protocol cards, inline ms and green add controls, bottom-sheet add/edit/QR flow.
- Local Persian/English dark/light UI, bundled Vazirmatn/Inter fonts, native service/alarms/QR scanner.
- Real outbound HTTP(S) checks using Xray or isolated sing-box; no device VPN or TUN interface.
- Default 20-second scheduling, bounded concurrency, alert on the sixth consecutive failure, explicit acknowledgement, per-monitor configurable thresholds, editable/toggleable monitors and direct address checks.
- Seven added tools: ordered fallback probe URLs, evidence-based diagnostics, hourly 24-hour/7-day reports with CSV, per-monitor failure/latency rules, snooze/maintenance, password-encrypted backup/restore, and a native Android widget. No gaming tester or grouping feature.
- Android API 24+, target 35; universal four-ABI APK and smaller ARM64 variant.
- Beta: physical devices, actual server configurations, OEM background behavior and 16 KiB page-size support remain unverified. Some link variants are deliberately rejected. No promise of all protocols/all devices or exact intervals under arbitrary load.

Build with JDK 17 and Android SDK 35:

```sh
python3 fetch_cores.py
./gradlew clean assembleRelease testReleaseUnitTest lintRelease
```

Set the SDK path via `ANDROID_HOME` or `local.properties`. The dedicated release signing material is delivered in a **separate private signing-backup archive**, never in this source archive. Restore it to `signing/` for updates of the delivered APK. Without it a local build uses debug signing and cannot update the delivered app.

Code: GPL-3.0-or-later. Sources, pinned dependency downloads, original notices and source archives are included. See NOTICE.md. No affiliation with upstream projects is claimed.
