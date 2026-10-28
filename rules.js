(() => {
  "use strict";

  // Firefox exposes the promise-based `browser` namespace; Chrome and Edge
  // only have `chrome`. Both provide the same promise-returning APIs used here.
  // Require `runtime.id` so a page element with id="browser" (exposed as
  // window.browser via named access) can't be mistaken for the extension API.
  const extensionApi = globalThis.browser?.runtime?.id
    ? globalThis.browser
    : globalThis.chrome;

  // Firefox blocks content scripts on these Mozilla domains by default
  // (extensions.webextensions.restrictedDomains); Chrome and Edge block their
  // add-on stores.
  const RESTRICTED_HOSTNAMES = new Set([
    "chromewebstore.google.com",
    "microsoftedge.microsoft.com",
    "accounts-static.cdn.mozilla.net",
    "accounts.firefox.com",
    "addons.cdn.mozilla.net",
    "addons.mozilla.org",
    "api.accounts.firefox.com",
    "content.cdn.mozilla.net",
    "discovery.addons.mozilla.org",
    "install.mozilla.org",
    "oauth.accounts.firefox.com",
    "profile.accounts.firefox.com",
    "support.mozilla.org",
    "sync.services.mozilla.com"
  ]);

  function isSupportedUrl(url) {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    return !RESTRICTED_HOSTNAMES.has(url.hostname);
  }

  function pageRuleKey(url) {
    return `page:${url.href}`;
  }

  function siteRuleKey(url) {
    return `site:${url.origin}`;
  }

  function patternRuleKey(pattern) {
    return `pattern:${pattern}`;
  }

  function escapeRegExp(text) {
    return text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }

  function wildcardToRegExp(pattern) {
    const source = pattern
      .split("*")
      .map(escapeRegExp)
      .join(".*");

    return new RegExp(`^${source}$`);
  }

  function matchesPattern(url, pattern) {
    try {
      return wildcardToRegExp(pattern).test(url);
    } catch {
      return false;
    }
  }

  function patternSpecificity(pattern) {
    const wildcardCount = (pattern.match(/\*/g) ?? []).length;
    return {
      literalLength: pattern.length - wildcardCount,
      wildcardCount
    };
  }

  function matchingPatternRules(rules, url) {
    return Object.entries(rules)
      .filter(([key]) => key.startsWith("pattern:"))
      .map(([key, title]) => ({
        key,
        pattern: key.slice("pattern:".length),
        title
      }))
      .filter((rule) => matchesPattern(url, rule.pattern))
      .sort((a, b) => {
        const aScore = patternSpecificity(a.pattern);
        const bScore = patternSpecificity(b.pattern);

        if (aScore.literalLength !== bScore.literalLength) {
          return bScore.literalLength - aScore.literalLength;
        }

        if (aScore.wildcardCount !== bScore.wildcardCount) {
          return aScore.wildcardCount - bScore.wildcardCount;
        }

        return a.pattern.localeCompare(b.pattern);
      });
  }

  function findMatchingRule(rules, url) {
    const exactKey = pageRuleKey(url);
    if (Object.prototype.hasOwnProperty.call(rules, exactKey)) {
      return { key: exactKey, title: rules[exactKey], type: "page" };
    }

    const patternMatch = matchingPatternRules(rules, url.href)[0];
    if (patternMatch) {
      return { ...patternMatch, type: "pattern" };
    }

    const siteKey = siteRuleKey(url);
    if (Object.prototype.hasOwnProperty.call(rules, siteKey)) {
      return { key: siteKey, title: rules[siteKey], type: "site" };
    }

    return null;
  }

  globalThis.ChromeTabTitleRules = {
    extensionApi,
    findMatchingRule,
    isSupportedUrl,
    matchesPattern,
    matchingPatternRules,
    pageRuleKey,
    patternRuleKey,
    siteRuleKey
  };
})();
