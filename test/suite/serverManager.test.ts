import * as assert from 'assert';
import { ServerManager, ServerState } from '../../src/server/serverManager';

suite('ServerManager Test Suite', () => {
  test('ServerManager should be a singleton', () => {
    const instance1 = ServerManager.getInstance();
    const instance2 = ServerManager.getInstance();
    assert.strictEqual(instance1, instance2);
  });

  test('ServerManager should start in stopped state', () => {
    const manager = ServerManager.getInstance();
    assert.strictEqual(manager.getState(), ServerState.stopped);
  });

  test('ServerManager should report not running initially', () => {
    const manager = ServerManager.getInstance();
    assert.strictEqual(manager.isRunning(), false);
  });

  test('ServerManager should provide status info', () => {
    const manager = ServerManager.getInstance();
    const statusInfo = manager.getStatusInfo();
    assert.ok(statusInfo.includes('Sonic Pi Server Status'));
    assert.ok(statusInfo.includes('State:'));
    assert.ok(statusInfo.includes('Port:'));
  });

  test('parseDaemonOutput should parse valid daemon output', () => {
    const manager = ServerManager.getInstance();
    const output = '4560 4558 4557 4556 4559 4561 -1234567890';
    const result = manager.parseDaemonOutput(output);
    assert.ok(result);
    assert.strictEqual(result!.daemon, 4560);
    assert.strictEqual(result!.guiListenToServer, 4558);
    assert.strictEqual(result!.guiSendToServer, 4557);
    assert.strictEqual(result!.scsynth, 4556);
    assert.strictEqual(result!.oscCues, 4559);
    assert.strictEqual(result!.tauApi, 4561);
    assert.strictEqual(result!.token, -1234567890);
  });

  test('parseDaemonOutput should return null for non-matching output', () => {
    const manager = ServerManager.getInstance();
    assert.strictEqual(manager.parseDaemonOutput('Starting server...'), null);
    assert.strictEqual(manager.parseDaemonOutput('1 2 3'), null);
    assert.strictEqual(manager.parseDaemonOutput(''), null);
  });

  test('parseDaemonOutput should handle multiline output and find ports line', () => {
    const manager = ServerManager.getInstance();
    const output = 'Some debug info\n4560 4558 4557 4556 4559 4561 42';
    const result = manager.parseDaemonOutput(output);
    assert.ok(result);
    assert.strictEqual(result!.daemon, 4560);
    assert.strictEqual(result!.token, 42);
  });
});
