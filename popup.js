"use strict";

const STORAGE_KEY = "rules";
const { extensionApi } = ChromeTabTitleRules;

const pageElement = document.getElementById("page");
const scopeElement = document.getElementById("scope");
const titleElement = document.getElementById("title");
const saveButton = document.getElementById("save");
const removeButton = document.getElementById("remove");
const statusElement = document.getElementById("status");
const manageButton = document.getElementById("manage");

let currentUrl = null;

function ruleKey(url, scope) {
  if (scope === "site") {
    return ChromeTabTitleRules.siteRuleKey(url);
  }

  return ChromeTabTitleRules.pageRuleKey(url);
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

function setEnabled(enabled) {
  scopeElement.disabled = !enabled;
  titleElement.disabled = !enabled;
  saveButton.disabled = !enabled;
  removeButton.disabled = !enabled;
}

async function getRules() {
  const result = await extensionApi.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? {};
}

async function refreshEditor() {
  if (!currentUrl) {
    return;
  }

  const rules = await getRules();
  const key = ruleKey(currentUrl, scopeElement.value);
  const savedTitle = rules[key] ?? "";

  titleElement.value = savedTitle;
  removeButton.disabled = !savedTitle;

  if (savedTitle) {
    setStatus("Override exists for this scope.");
    return;
  }

  if (scopeElement.value === "page") {
    const pattern = ChromeTabTitleRules.matchingPatternRules(rules, currentUrl.href)[0];
    if (pattern) {
      setStatus(`Matched by wildcard: ${pattern.pattern}`);
      return;
    }
  }

  setStatus("");
}

async function saveRule() {
  const customTitle = titleElement.value.trim();

  if (!customTitle) {
    setStatus("Enter a custom title first.", true);
    titleElement.focus();
    return;
  }

  const rules = await getRules();
  const key = ruleKey(currentUrl, scopeElement.value);

  rules[key] = customTitle;
  await extensionApi.storage.local.set({ [STORAGE_KEY]: rules });

  removeButton.disabled = false;
  setStatus("Saved.");
}

async function removeRule() {
  const rules = await getRules();
  const key = ruleKey(currentUrl, scopeElement.value);

  if (!(key in rules)) {
    setStatus("No override exists for this scope.");
    return;
  }

  delete rules[key];
  await extensionApi.storage.local.set({ [STORAGE_KEY]: rules });

  titleElement.value = "";
  removeButton.disabled = true;
  setStatus("Removed.");
}

async function initialize() {
  const [tab] = await extensionApi.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url) {
    pageElement.textContent = "This tab cannot be accessed.";
    setEnabled(false);
    return;
  }

  const url = new URL(tab.url);

  if (!ChromeTabTitleRules.isSupportedUrl(url)) {
    pageElement.textContent = "This browser page cannot be renamed by an extension.";
    pageElement.title = tab.url;
    setEnabled(false);
    return;
  }

  currentUrl = url;
  pageElement.textContent = url.hostname;
  pageElement.title = url.href;

  await refreshEditor();
  titleElement.focus();
}

scopeElement.addEventListener("change", () => {
  refreshEditor().catch((error) => {
    console.error(error);
    setStatus("Failed to read saved rules.", true);
  });
});

saveButton.addEventListener("click", () => {
  saveRule().catch((error) => {
    console.error(error);
    setStatus("Failed to save the title.", true);
  });
});

removeButton.addEventListener("click", () => {
  removeRule().catch((error) => {
    console.error(error);
    setStatus("Failed to remove the title.", true);
  });
});

manageButton.addEventListener("click", () => {
  extensionApi.runtime.openOptionsPage();
});

titleElement.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveButton.click();
  }
});

initialize().catch((error) => {
  console.error(error);
  pageElement.textContent = "Unable to access this tab.";
  setStatus("Initialization failed.", true);
  setEnabled(false);
});
