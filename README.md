# Reddit Filter

**Your feed. Your rules.** A privacy-first, open-source browser extension that filters Reddit posts as you scroll.

![Version](https://img.shields.io/badge/version-3.0.0-ff734a) ![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4) ![License](https://img.shields.io/badge/license-MIT-green) ![CI](https://img.shields.io/badge/tests-node--test-informational)

## Why Reddit Filter?

Reddit Filter helps you control unwanted feed content without sending your browsing history to a server. The extension runs locally in your browser, observes new posts as Reddit loads them, and applies your preferences immediately.

## Features

- **Live feed filtering:** Observes newly inserted posts and open shadow roots; supports common current and classic Reddit layouts.
- **Custom blocklists:** Filter keywords, subreddits, authors, domains, and post flairs.
- **One-click presets:** Balanced, Focus and Strict, with custom blocklists preserved.
- **Content controls:** Hide promoted posts, crossposts, NSFW, spoilers, deleted authors, AutoModerator, and optionally low-score posts.
- **Trusted allowlists:** Keep preferred communities, authors, and domains visible.
- **Display modes:** Hide, dim or collapse posts with a reveal button.
- **On-device counters:** See session filtering activity and number of configured rules.
- **Backup and restore:** Export/import settings as JSON.
- **Privacy first:** No remote servers, tracking, accounts, analytics or API keys.
- **Accessible controls:** Keyboard-focus styling and reduced-motion support.

## Install from source

1. Download the latest source ZIP and extract it.
2. Open `chrome://extensions` in desktop Chrome or another compatible Chromium browser.
3. Enable **Developer mode** and click **Load unpacked**.
4. Select the extracted `Reddit-Filter` folder containing `manifest.json`.
5. Open Reddit and click the extension icon to configure your filters.

> Chrome on Android does not support standard desktop Chrome extensions.

## Develop and test

Requires Node.js 20+. No install or build step is necessary.

```bash
npm test
npm run check
```

## How it works

The `src/engine.js` module is a testable rule engine. The `src/content.js` content script inspects posts already present in the Reddit page and reacts to DOM changes. The popup edits local settings stored in `chrome.storage.local`. The extension does not modify your Reddit account, post votes, or comments.

## Privacy and permissions

The `storage` permission saves your settings and local counters. Reddit-only content-script matches are needed to inspect the posts you see. There are no broad site permissions and no background network requests. See [PRIVACY.md](PRIVACY.md).

## Compatibility and limitations

Reddit changes its markup frequently. Filtering depends on the information available in each post and may miss some layouts or dynamically loaded details. Low-score filtering works only when a score is exposed. Automated unit tests are included, but full live-browser compatibility has **not** been independently verified across all Reddit versions.

## Open source

Licensed under [MIT](LICENSE). Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). This project is independent and not affiliated with Reddit.
