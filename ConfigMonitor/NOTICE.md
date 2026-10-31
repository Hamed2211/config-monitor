# Third-party notices

Config Monitor app code: GPL-3.0-or-later. Full GPL text: third_party/GPL-3.0-full.txt.

- AndroidLibXrayLite v26.6.27: https://github.com/2dust/AndroidLibXrayLite/tree/v26.6.27 . Exact tag source archive included. Xray core dependency commit 45cf2898ab12 from the pinned go.mod; source included. Retain upstream license files and module notices.
- Xray-core: https://github.com/XTLS/Xray-core/tree/45cf2898ab12 (MPL-2.0; inspect archive LICENSE).
- sing-box v1.14.3: https://github.com/SagerNet/sing-box/tree/v1.14.3 (GPL-3.0-or-later; original license/name-use notice preserved). Unmodified Android release binaries, corresponding main source archive, go.mod/go.sum and upstream build scripts included. Go module dependencies are identified by upstream lockfiles and can be retrieved by `go mod download`; build according to the archived upstream Makefile/CI with the Android NDK.
- AndroidX Core 1.15.0 and WebKit 1.12.1: Apache-2.0, https://android.googlesource.com/platform/frameworks/support/ . Gradle resolves source artifacts via Google Maven.
- ZXing core 3.5.3: Apache-2.0, https://github.com/zxing/zxing/tree/zxing-3.5.3 . JourneyApps embedded 4.3.0: Apache-2.0, https://github.com/journeyapps/zxing-android-embedded/tree/v4.3.0 . Camera/image QR decoder.
- Vazirmatn 33.003 and Inter: SIL OFL-1.1, full notices included. https://github.com/rastikerdar/vazirmatn/tree/v33.003 and https://github.com/google/fonts/tree/main/ofl/inter . Bundled fonts may not be sold alone.
- Lucide 0.468.0: ISC, original notice included; https://github.com/lucide-icons/lucide/tree/0.468.0 .
- Bouncy Castle bcprov-jdk15to18 1.80: MIT-style Bouncy Castle license, full text in third_party/BouncyCastle-LICENSE.html. Lightweight PBKDF2-HMAC-SHA256 implementation supports Android API 24 without depending on the system PBKDF2-SHA256 provider. Source: https://github.com/bcgit/bc-java/tree/r1rv80 and https://repo.maven.apache.org/maven2/org/bouncycastle/bcprov-jdk15to18/1.80/bcprov-jdk15to18-1.80-sources.jar .
- JUnit 4.13.2 and org.json 20240303 are test-only dependencies.
- Four bundled WAV alarms were synthesized for this project; no sampled commercial recordings.

No upstream branding or affiliation is claimed. Distribution includes sources and build recipes; do not remove these notices from redistributed packages.

- CM Numerals: modified Vazirmatn numeric-input face, under the same SIL OFL-1.1 (third_party/Vazirmatn-OFL.txt). ASCII digits map to Persian digit glyphs; outlines unchanged. Reproduce with tools/make_numerals_font.py. Original font remains bundled.
