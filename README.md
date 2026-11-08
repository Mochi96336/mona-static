# Mona Static — unofficial static web deployment

This repository is an independent deployment experiment, not a fork maintained by TwiceDrop. It downloads an exact upstream release, makes small browser-only compatibility changes, verifies the site and (after merge) publishes it using GitHub Pages. No personal computer or continuously running backend is required.

## Status

**Experimental / under test.** Source review supports browser-side WASM and Web Workers, but numerical equivalence has not yet been proved.

Upstream: https://github.com/TwiceDrop/genshin_artifact

Pinned upstream: release v7.2.03, commit 21dcfb2276ca52fa19f543d98c0b8d69ecf471f4.

## Workflow

1. Clone the upstream release from upstream.lock.json and verify the exact commit.
2. Install upstream dependencies with npm ci --legacy-peer-deps.
3. Patch the checkout for static-only mode: hash routing, asset URL rebasing, browser session IDs, local statistics, no desktop updater and no game-account sign-in.
4. Build the frontend and WASM into the dist directory.
5. Serve dist with a static-only HTTP server, and run a Chromium smoke test of the calculator, team configuration and UID import pages.
6. Upload the build artifact. On a verified push to main, deploy it to GitHub Pages.

## Deliberate exclusions and risks

- Account sign-in and session cookies are not supported in the static build; UID JSON import/export is retained.
- Legacy share-code URLs and remote community statistics require compatibility work.
- WebGPU varies by browser/device. CPU support is the baseline.
- The test is only a smoke test, not a full numerical regression suite.
- Automatic upstream version polling is intentionally not enabled until a pinned baseline is verified.
- External game images may require remote third-party hosts.

## Enable GitHub Pages

Open Settings → Pages → Build and deployment → Source: GitHub Actions.

After a passing build is merged to main, the target URL will be:

https://mochi96336.github.io/mona-static/

This project is unofficial. Preserve upstream licenses and third-party attributions when publishing.
