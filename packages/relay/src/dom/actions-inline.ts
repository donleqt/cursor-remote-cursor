export function clickApproveScript(): string {
  return `
(function () {
  var selectors = [
    'button.ui-shell-tool-call__run-btn',
    'button.ui-shell-tool-call__allowlist-button',
    'button[aria-label*="Accept"]',
    'button[aria-label*="Approve"]',
    'button[aria-label*="Run"]',
    'button[aria-label*="Allow"]'
  ];
  for (var i = 0; i < selectors.length; i++) {
    var el = document.querySelector(selectors[i]);
    if (el) { el.click(); return { ok: true, via: selectors[i] }; }
  }
  return { ok: false };
})()
`;
}

export function clickRejectScript(): string {
  return `
(function () {
  var selectors = [
    'button.ui-shell-tool-call__skip-btn',
    'button[aria-label*="Reject"]',
    'button[aria-label*="Deny"]',
    'button[aria-label*="Skip"]'
  ];
  for (var i = 0; i < selectors.length; i++) {
    var el = document.querySelector(selectors[i]);
    if (el) { el.click(); return { ok: true, via: selectors[i] }; }
  }
  return { ok: false };
})()
`;
}

export function sendPromptScript(promptText: string): string {
  const escaped = JSON.stringify(promptText);
  return `
(function () {
  var prompt = ${escaped};
  var roots = [
    '#workbench.parts.auxiliarybar',
    '.composer-bar',
    '[class*="composer-panel"]'
  ];
  var root = document.body;
  for (var i = 0; i < roots.length; i++) {
    var r = document.querySelector(roots[i]);
    if (r) { root = r; break; }
  }
  var input = root.querySelector('[contenteditable="true"]');
  if (!input) input = root.querySelector('textarea');
  if (!input) input = root.querySelector('[role="textbox"]');
  if (!input) return { ok: false, reason: 'no_input' };

  input.focus();
  if ("value" in input) {
    input.value = prompt;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    input.textContent = prompt;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: prompt }));
  }

  var submitSelectors = [
    'button[aria-label*="Submit"]',
    'button[aria-label*="Send"]',
    '[class*="submit-button"]',
    'button.codicon-send'
  ];
  for (var j = 0; j < submitSelectors.length; j++) {
    var btn = document.querySelector(submitSelectors[j]);
    if (btn) { btn.click(); return { ok: true, via: submitSelectors[j] }; }
  }
  return { ok: true, via: 'typed_only' };
})()
`;
}
