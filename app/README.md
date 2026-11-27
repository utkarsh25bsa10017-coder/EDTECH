# Prashnottar app (Android, iOS, Windows)

A Tauri 2 shell written in Rust. It bundles the website build (`../web/dist`), so the app and the site share one UI. The app calls the API server at `PUBLIC_API_BASE`, which is baked in when the web build runs.

## Building

This server has no C compiler, and iOS needs a Mac, so builds run on GitHub Actions: **Actions → App builds → Run workflow**. Artifacts:
- `prashnottar-android`: a debug APK to install on phones for testing
- `prashnottar-windows`: an installer (.exe / .msi)
- `prashnottar-ios-simulator`: a simulator build

Before building for real users, set the repository variable `PUBLIC_API_BASE` to the live API URL.

## Before store release
- **Android (Play Store):** create an upload keystore and add it as repository secrets, then switch the build to `--release` with signing. A Play developer account costs a one-time $25.
- **iOS (App Store):** needs an Apple Developer account ($99/year) and signing certificates as secrets. Apple rejects apps that are only a website wrapper, which is why the UI is bundled, not loaded from the web.
- **Payments:** keep checkout on the website. In-app purchase rules: Google Play charges 11–26% on Indian in-app sales even with alternative billing, and Apple requires its own in-app purchase for digital content. Check each store's current rules before release.
