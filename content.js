(() => {
  "use strict";

  const STORAGE_KEY = "rules";
  const URL_CHECK_INTERVAL_MS = 500;
  const { extensionApi } = ChromeTabTitleRules;

  let rules = {};
  let desiredTitle = null;
  let naturalTitle = document.title;
  let lastUrl = location.href;

  function findDesiredTitle() {
    const match = ChromeTabTitleRules.findMatchingRule(
      rules,
      new URL(location.href)
    );

    return match?.title ?? null;
  }

  function enforceDesiredTitle() {
    if (!desiredTitle || document.title === desiredTitle) {
      return;
    }

    // If the page tried to change its title while our override is active,
    // remember that value so it can be restored when the override is removed.
    naturalTitle = document.title;
    document.title = desiredTitle;
  }

  function updateDesiredTitle() {
    const nextTitle = findDesiredTitle();
    const previousTitle = desiredTitle;

    if (nextTitle === previousTitle) {
      enforceDesiredTitle();
      return;
    }

    // An override has just been removed for this URL. Restore the most recent
    // title we observed from the page itself.
    if (previousTitle && !nextTitle) {
      desiredTitle = null;

      if (document.title === previousTitle && naturalTitle) {
        document.title = naturalTitle;
      }

      return;
    }

    // Switching from one matching rule to another must not treat our old
    // custom title as the page's natural title.
    if (previousTitle && nextTitle) {
      desiredTitle = nextTitle;
      document.title = nextTitle;
      return;
    }

    // A new override has become active.
    naturalTitle = document.title;
    desiredTitle = nextTitle;
    enforceDesiredTitle();
  }

  async function loadRules() {
    const result = await extensionApi.storage.local.get(STORAGE_KEY);
    rules = result[STORAGE_KEY] ?? {};
    updateDesiredTitle();
  }

  // Many web applications rewrite <title> after load, and some do it often.
  // Watch the document head and immediately re-apply the configured override.
  const titleObserver = new MutationObserver(() => {
    if (desiredTitle) {
      if (document.title !== desiredTitle) {
        naturalTitle = document.title;
        document.title = desiredTitle;
      }
    } else {
      naturalTitle = document.title;
    }
  });

  if (document.head) {
    titleObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Content scripts are not re-injected for many SPA navigations. Detect URL
  // changes so page-specific rules follow History API / client-side routing.
  window.addEventListener("popstate", () => {
    lastUrl = location.href;
    updateDesiredTitle();
  });

  window.addEventListener("hashchange", () => {
    lastUrl = location.href;
    updateDesiredTitle();
  });

  window.setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      updateDesiredTitle();
    }
  }, URL_CHECK_INTERVAL_MS);

  extensionApi.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }

    rules = changes[STORAGE_KEY].newValue ?? {};
    updateDesiredTitle();
  });

  loadRules().catch((error) => {
    console.error("Chrome Tab Title: failed to load rules", error);
  });
})();
