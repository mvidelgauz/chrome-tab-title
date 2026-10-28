# Chrome Tab Title

A small Manifest V3 browser extension for Chrome, Microsoft Edge, and Firefox that assigns persistent custom titles to tabs.

## Features

- Set a custom title for one exact URL.
- Use `*` inside a saved URL to create a wildcard URL pattern.
- Set a custom title for an entire site (same origin).
- Exact URL rules take precedence over wildcard rules; wildcard rules take precedence over site rules.
- When several wildcard rules match, the most specific rule wins (more literal characters, then fewer `*` characters).
- Manage all saved rules from an Options page: edit URL/pattern, edit title, add, or delete.
- Existing v0.1 exact-page and site rules remain compatible.
- Rules survive page reloads and Chrome restarts.
- Works with SPA/client-side navigation.
- Re-applies the custom title if the web application rewrites `document.title`.
- Uses `storage.local`; rules stay on this browser installation rather than Chrome Sync / Firefox Sync.
- Uses `activeTab` only for the tab the user explicitly opens the popup on; it does not request the broad `tabs` browsing-history permission.
- No background service worker and no build step.
- One codebase for Chrome, Edge, and Firefox 128+; scripts use `browser` when available and fall back to `chrome`.

## Repository layout

```text
chrome-tab-title/
  manifest.json
  rules.js
  content.js
  popup.html
  popup.js
  popup.css
  options.html
  options.js
  options.css
  package.py
  README.md
  CODEX_HANDOFF.md
```

## Install for development

### Chrome

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.
5. Pin **Chrome Tab Title** from Chrome's Extensions menu if desired.

After changing source files, return to `chrome://extensions/` and click **Reload** on the extension card. Refresh already-open web pages when `rules.js` or `content.js` changes.

Chrome may list `browser_specific_settings` as an unrecognized manifest key; that warning is harmless.

### Microsoft Edge

1. Open `edge://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this repository folder.

Edge is Chromium-based and uses the same code path as Chrome.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `manifest.json` in this repository folder.
4. Pin **Chrome Tab Title** from the Extensions (puzzle-piece) menu if desired.

Temporary add-ons are removed when Firefox restarts. Use **Reload** on the add-on card after changing source files.

Firefox treats content-script sites as host permissions. If titles are not applied, open `about:addons`, select **Chrome Tab Title**, open the **Permissions** tab, and allow access to all websites.

For a permanent install, package and sign the add-on (see below). The add-on ID is set in `manifest.json` under `browser_specific_settings.gecko.id`.

## Packaging

Requires Python 3 (standard library only). On Windows, Linux, or macOS, run:

```sh
python3 package.py
```

(On Windows, `python package.py` or `py package.py` also works.)

This writes two identical archives to `build/` (ignored by git), named after the manifest version:

- `chrome-tab-title-<version>.xpi` for Firefox.
- `chrome-tab-title-<version>.zip` for uploading to the Chrome Web Store or Microsoft Edge Add-ons.

Release Firefox only installs signed add-ons. To install the `.xpi` permanently:

- **Signed:** upload it at addons.mozilla.org Developer Hub as an *unlisted* (self-distributed) add-on, download the signed `.xpi`, then use `about:addons` > gear menu > **Install Add-on From File...**.
- **Unsigned:** in Firefox Developer Edition, Nightly, or ESR, set `xpinstall.signatures.required` to `false` in `about:config`, then install the `.xpi` from `about:addons`. Regular release Firefox ignores this setting.

Bump `version` in `manifest.json` before each signed upload; addons.mozilla.org rejects a version number it has already signed.

## Usage

### Create a title from the popup

1. Open a normal `http://` or `https://` page.
2. Click the extension icon.
3. Choose **This exact page** or **This entire site**.
4. Enter a custom title.
5. Click **Save**.

Use **Remove** to delete the rule for the currently selected popup scope.

### Edit saved URLs and create wildcard patterns

1. Click the extension icon.
2. Click **Manage saved rules**.
3. Find the saved exact URL you want to generalize.
4. Replace any variable portion with `*`.
5. Click **Save changes**.

For example:

```text
https://example.com/projects/123/details
```

can be changed to:

```text
https://example.com/projects/*/details
```

The `*` wildcard matches any sequence of characters, including `/`, `?`, and `#`.

## Rule semantics

Rules are stored in `chrome.storage.local` as a `rules` object.

- Exact page key: `page:<full URL>`
- Wildcard pattern key: `pattern:<URL pattern>`
- Site key: `site:<origin>`

For example:

```json
{
  "page:https://example.com/projects/123": "Project 123",
  "pattern:https://example.com/projects/*/details": "Project details",
  "site:https://wiki.example.com": "Company Wiki"
}
```

Matching precedence is:

1. Exact URL.
2. Most specific matching wildcard URL pattern.
3. Site/origin rule.

`site:` means the same origin: protocol + hostname + port. Therefore `https://example.com` and `http://example.com` are intentionally different sites for this extension.

## Restrictions

Browsers do not allow normal content scripts on protected pages. In particular, the extension cannot rename pages such as `chrome://settings/`, `chrome://extensions/`, `edge://` pages, `about:` pages, the New Tab page, and other browser UI pages. The Chrome Web Store and Mozilla domains such as `addons.mozilla.org` and `support.mozilla.org` are also protected from script injection, so the popup is disabled there.

## Suggested next improvements

- Add JSON import/export of rules.
- Add optional Chrome Sync / Firefox Sync support.
- Add extension icons.
- Add automated tests for URL/rule matching helpers.
