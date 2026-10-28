"use strict";

const STORAGE_KEY = "rules";
const { extensionApi } = ChromeTabTitleRules;
const rulesElement = document.getElementById("rules");
const rowTemplate = document.getElementById("row-template");
const addButton = document.getElementById("add");
const saveButton = document.getElementById("save");
const statusElement = document.getElementById("status");

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

function setEmptyState() {
  const rows = rulesElement.querySelectorAll("tr:not(.empty)");
  const empty = rulesElement.querySelector(".empty");

  if (rows.length === 0 && !empty) {
    const row = document.createElement("tr");
    row.className = "empty";
    row.innerHTML = '<td colspan="4">No saved rules yet.</td>';
    rulesElement.appendChild(row);
  } else if (rows.length > 0 && empty) {
    empty.remove();
  }
}

function addRow(type = "url", match = "", title = "") {
  rulesElement.querySelector(".empty")?.remove();

  const fragment = rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector("tr");
  row.querySelector(".type").value = type;
  row.querySelector(".match").value = match;
  row.querySelector(".title").value = title;
  row.querySelector(".delete").addEventListener("click", () => {
    row.remove();
    setEmptyState();
    setStatus("Unsaved changes.");
  });

  for (const control of row.querySelectorAll("input, select")) {
    control.addEventListener("input", () => setStatus("Unsaved changes."));
    control.addEventListener("change", () => setStatus("Unsaved changes."));
  }

  rulesElement.appendChild(fragment);
  return row;
}

function parseRule(key, title) {
  if (key.startsWith("page:")) {
    return { type: "url", match: key.slice("page:".length), title };
  }

  if (key.startsWith("pattern:")) {
    return { type: "url", match: key.slice("pattern:".length), title };
  }

  if (key.startsWith("site:")) {
    return { type: "site", match: key.slice("site:".length), title };
  }

  return null;
}

function buildRuleKey(type, match) {
  if (type === "site") {
    const url = new URL(match);
    if (url.origin === "null") {
      throw new Error(`Invalid site URL: ${match}`);
    }
    return ChromeTabTitleRules.siteRuleKey(url);
  }

  if (match.includes("*")) {
    if (!/^https?:\/\//i.test(match)) {
      throw new Error(`Wildcard pattern must start with http:// or https://: ${match}`);
    }
    return ChromeTabTitleRules.patternRuleKey(match);
  }

  const url = new URL(match);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Only http:// and https:// URLs are supported: ${match}`);
  }
  return ChromeTabTitleRules.pageRuleKey(url);
}

async function loadRules() {
  const result = await extensionApi.storage.local.get(STORAGE_KEY);
  const rules = result[STORAGE_KEY] ?? {};

  for (const [key, title] of Object.entries(rules)) {
    const parsed = parseRule(key, title);
    if (parsed) {
      addRow(parsed.type, parsed.match, parsed.title);
    }
  }

  setEmptyState();
}

async function saveRules() {
  const nextRules = {};
  const rows = [...rulesElement.querySelectorAll("tr:not(.empty)")];

  for (const row of rows) {
    const type = row.querySelector(".type").value;
    const match = row.querySelector(".match").value.trim();
    const title = row.querySelector(".title").value.trim();

    if (!match || !title) {
      throw new Error("Every rule must have both a URL/pattern and a custom title.");
    }

    const key = buildRuleKey(type, match);
    if (Object.prototype.hasOwnProperty.call(nextRules, key)) {
      throw new Error(`Duplicate rule: ${match}`);
    }

    nextRules[key] = title;
  }

  await extensionApi.storage.local.set({ [STORAGE_KEY]: nextRules });
  setStatus("Saved.");
}

addButton.addEventListener("click", () => {
  const row = addRow();
  row.querySelector(".match").focus();
  setStatus("Unsaved changes.");
});

saveButton.addEventListener("click", () => {
  saveRules().catch((error) => {
    console.error(error);
    setStatus(error.message || "Failed to save rules.", true);
  });
});

loadRules().catch((error) => {
  console.error(error);
  setStatus("Failed to load saved rules.", true);
});
