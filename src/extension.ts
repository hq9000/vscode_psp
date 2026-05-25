import * as vscode from 'vscode';

/**
 * This method is called when the extension is activated.
 * The extension is activated the very first time a command is executed.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('VSCode PSP extension is now active');

  // Register commands
  const startCommand = vscode.commands.registerCommand('vscode-psp.start', () => {
    vscode.window.showInformationMessage('PSP: Starting Sonic Pi Server (not yet implemented)');
  });

  const stopCommand = vscode.commands.registerCommand('vscode-psp.stop', () => {
    vscode.window.showInformationMessage('PSP: Stopping Sonic Pi Server (not yet implemented)');
  });

  const runCommand = vscode.commands.registerCommand('vscode-psp.run', () => {
    vscode.window.showInformationMessage('PSP: Running current file (not yet implemented)');
  });

  // Add commands to subscriptions for proper cleanup
  context.subscriptions.push(startCommand, stopCommand, runCommand);

  // Log when a .live.py file is opened
  vscode.workspace.onDidOpenTextDocument((document) => {
    if (document.fileName.endsWith('.live.py')) {
      console.log('Opened a .live.py file:', document.fileName);
    }
  });
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {
  console.log('VSCode PSP extension is now deactivated');
}
