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
});
