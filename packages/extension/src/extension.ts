import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

function cfg(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('cursorRemoteCursor');
}

function baseUrl(): string {
  const host = cfg().get<string>('serverHost', '127.0.0.1');
  const port = cfg().get<number>('serverPort', 3847);
  return `http://${host}:${port}`;
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('cursorRemoteCursor.openWeb', async () => {
      const url = baseUrl();
      try {
        const res = await fetch(`${url}/api/health`);
        if (!res.ok) throw new Error(String(res.status));
      } catch {
        vscode.window.showWarningMessage(
          `Relay does not appear reachable at ${url}. Run "npm start" from the cursor-remote-cursor repo on this machine.`
        );
      }
      await vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cursorRemoteCursor.showPasswordHint', async () => {
      const custom = cfg().get<string>('passwordFile', '')?.trim();
      const candidates = [
        custom,
        path.join(context.extensionPath, '..', 'relay', 'data', '.relay-password'),
      ].filter(Boolean) as string[];

      let found: string | null = null;
      for (const p of candidates) {
        try {
          if (fs.existsSync(p)) {
            found = p;
            break;
          }
        } catch {
          /* ignore */
        }
      }

      if (!found) {
        vscode.window.showInformationMessage(
          'No password file found. After you run the relay once, it prints the password and stores packages/relay/data/.relay-password.'
        );
        return;
      }

      try {
        const pw = fs.readFileSync(found, 'utf-8').trim();
        await vscode.env.clipboard.writeText(pw);
        vscode.window.showInformationMessage(
          `Copied relay password (${path.basename(path.dirname(found))}) to clipboard.`
        );
      } catch (e) {
        vscode.window.showErrorMessage(
          `Could not read password file: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    })
  );
}

export function deactivate(): void {}
