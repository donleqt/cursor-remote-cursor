/**
 * Serialized into Cursor's renderer via Runtime.evaluate.
 * Must be self-contained (no outer closure captures).
 */
export const EXTRACT_SCRIPT = `
(function extractCursorRemoteState() {
  function text(el) {
    return (el && el.innerText ? el.innerText : '').replace(/\\s+/g, ' ').trim();
  }

  function workspaceHint() {
    try {
      if (typeof vscode !== 'undefined' && vscode.context && vscode.context.configuration) {
        var ws = vscode.context.configuration().workspace;
        if (ws && ws.uri && ws.uri.path) {
          var parts = ws.uri.path.split(/[/\\\\]/).filter(Boolean);
          return parts[parts.length - 1] || ws.uri.path;
        }
      }
    } catch (e) {}
    return document.title || '';
  }

  function queryVisible(root, selectors) {
    for (var i = 0; i < selectors.length; i++) {
      try {
        var el = root.querySelector(selectors[i]);
        if (el && el.offsetParent !== null) return el;
      } catch (err) {}
    }
    return null;
  }

  var chatRoots = [
    '#workbench.parts.auxiliarybar',
    '[class*="composer-bar"]',
    '[class*="composer-panel"]',
    '[class*="chat-widget"]'
  ];

  var root = document.body;
  for (var r = 0; r < chatRoots.length; r++) {
    var cr = document.querySelector(chatRoots[r]);
    if (cr) { root = cr; break; }
  }

  var bubbles = [];
  var candidates = root.querySelectorAll('[class*="bubble"], [class*="message"], [class*="turn"], [data-role="assistant"], [data-role="user"]');
  for (var j = 0; j < candidates.length; j++) {
    var c = candidates[j];
    var tx = text(c);
    if (tx.length > 2 && tx.length < 20000) bubbles.push(tx);
  }
  if (bubbles.length === 0) {
    var paras = root.querySelectorAll('p, li, pre, code');
    for (var k = 0; k < Math.min(paras.length, 80); k++) {
      var pk = text(paras[k]);
      if (pk.length > 3) bubbles.push(pk);
    }
  }

  var approveSelectors = [
    'button.ui-shell-tool-call__run-btn',
    'button.ui-shell-tool-call__allowlist-button',
    'button[aria-label*="Accept"]',
    'button[aria-label*="Approve"]',
    'button[aria-label*="Run"]',
    'button[aria-label*="Allow"]'
  ];
  var rejectSelectors = [
    'button.ui-shell-tool-call__skip-btn',
    'button[aria-label*="Reject"]',
    'button[aria-label*="Deny"]',
    'button[aria-label*="Skip"]'
  ];

  var approveBtn = queryVisible(document, approveSelectors);
  var rejectBtn = queryVisible(document, rejectSelectors);

  var pendingCommand = '';
  var shellCards = document.querySelectorAll('[class*="shell-tool"], [class*="tool-call"]');
  if (shellCards.length) {
    pendingCommand = text(shellCards[shellCards.length - 1]);
  }

  var agentBusy = !!document.querySelector('[class*="spinner"], [class*="thinking"], [class*="loading"]');

  return {
    workspaceTitle: workspaceHint(),
    messages: bubbles.slice(-80),
    pendingApproval: !!(approveBtn || rejectBtn),
    pendingSnippet: pendingCommand.slice(0, 2000),
    agentBusy
  };
})()
`;
