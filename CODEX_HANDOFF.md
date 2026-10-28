# Codex handoff

Repository: `D:\Workarea\GitHub\chrome-tab-title`

## Goal

Maintain a small Manifest V3 extension for Chrome, Microsoft Edge, and Firefox that lets the user assign persistent custom tab titles. The main use case is multiple different custom titles for multiple URLs on the same site.

## Current behavior (v0.3.0)

- Popup offers two quick-create scopes:
  - `page`: exact full URL
  - `site`: URL origin (scheme + hostname + port)
- Options page lists all saved rules and allows editing/deleting them.
- Editing an exact URL and inserting `*` automatically stores it as a wildcard pattern rule.
- Wildcard `*` matches any sequence of characters, including `/`, `?`, and `#`.
- Matching precedence:
  1. exact page
  2. most specific wildcard pattern
  3. site rule
- Wildcard specificity is deterministic: more literal characters wins; if tied, fewer wildcards wins; if still tied, lexical order is used.
- Rules are stored in `chrome.storage.local` under the `rules` key.
- Existing v0.1 rule keys remain compatible:
  - `page:<full URL>`
  - `site:<origin>`
- New wildcard rules use:
  - `pattern:<URL pattern>`
- The content script applies matching rules after page load.
- A `MutationObserver` re-applies the override when the website changes `document.title`.
- SPA/client-side URL changes are detected with `popstate`, `hashchange`, and a lightweight URL check every 500 ms.
- Removing a rule attempts to restore the most recently observed natural page title.
- No service worker and no build step are required.
- The same source tree loads in Chrome and Firefox. `rules.js` exports `extensionApi` (`browser` if defined, else `chrome`); all other scripts use it instead of `chrome.*` directly.
- `rules.js` also exports `isSupportedUrl`, which blocks non-http(s) URLs, the Chrome Web Store, and Firefox's default restricted Mozilla domains.

## Important constraints

- Stay on Manifest V3.
- Keep Chrome, Edge, and Firefox working from one manifest (Chrome and Edge share the Chromium code path): use `options_ui` (not `options_page`), keep `browser_specific_settings.gecko`, and do not add a background service worker without also handling Firefox's `background.scripts`.
- Keep dependencies at zero unless there is a strong reason to add one.
- Do not request the broad `tabs` permission. The extension currently uses `activeTab` plus the host access implied by static content-script matches.
- Keep rule data local by default; do not move to Chrome Sync unless explicitly requested.
- Do not use inline JavaScript in extension HTML.
- Chrome internal pages and other protected browser pages are out of scope.
- Preserve backward compatibility with existing `page:` and `site:` entries already saved in `chrome.storage.local`.

## Files

- `manifest.json` - extension manifest; includes `options_ui`, Firefox `browser_specific_settings`, and loads `rules.js` before `content.js`.
- `rules.js` - browser API handle, supported-URL check, shared rule-key helpers, wildcard matching, precedence, and wildcard specificity logic.
- `content.js` - title enforcement, storage-change handling, SPA URL detection.
- `popup.html` - popup markup.
- `popup.js` - popup behavior and exact/site rule persistence; opens the Options page.
- `popup.css` - popup styling.
- `options.html` - saved-rules editor.
- `options.js` - converts edited URL rows to `page:` or `pattern:` keys automatically and saves the full rule set.
- `options.css` - Options-page styling.
- `package.py` - cross-platform Python 3 script (standard library only) that builds `build/chrome-tab-title-<version>.xpi` and `.zip` from the runtime files; update its file list when adding runtime files.
- `README.md` - usage and development notes.

## Manual validation checklist

1. Load unpacked from `chrome://extensions/`.
2. Verify existing v0.1 saved exact-page rules still work after upgrading/reloading the extension.
3. Open **Manage saved rules** and verify existing exact URLs and site rules are shown.
4. Change `https://example.com/projects/123/details` to `https://example.com/projects/*/details`, save, then verify both `/123/details` and `/456/details` receive the title.
5. Verify a nonmatching path does not receive the wildcard title.
6. Create an exact URL rule that also matches a wildcard rule and verify the exact rule wins.
7. Create two overlapping wildcard rules and verify the more specific rule wins.
8. Verify a wildcard rule wins over a site rule.
9. Edit a wildcard URL and custom title, save, and verify the change propagates immediately to open tabs.
10. Delete a rule in Options, save, and verify it stops applying.
11. Test a SPA that changes routes without reloading.
12. Test a site that changes `document.title` dynamically and verify the override remains.
13. Verify unsupported pages such as `chrome://extensions/` remain disabled in the popup.
14. Reload the extension and refresh existing pages after changing `rules.js` or `content.js`.
15. Repeat steps 3-12 in Edge (`edge://extensions/` > Load unpacked) and verify `edge://` pages are disabled in the popup.
16. Repeat steps 3-12 in Firefox (`about:debugging` > Load Temporary Add-on), and verify `about:` pages and `addons.mozilla.org` remain disabled in the popup.

## Future ideas

- JSON import/export.
- Optional Chrome Sync / Firefox Sync.
- Icons.
- Automated tests for `rules.js`.
