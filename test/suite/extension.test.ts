import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('hq9000.vscode-psp'));
  });

  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension('hq9000.vscode-psp');
    assert.ok(extension);
    await extension!.activate();
    assert.strictEqual(extension!.isActive, true);
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('vscode-psp.start'));
    assert.ok(commands.includes('vscode-psp.stop'));
    assert.ok(commands.includes('vscode-psp.run'));
  });
});
