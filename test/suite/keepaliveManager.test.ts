import * as assert from 'assert';
import { KeepaliveManager } from '../../src/server/keepaliveManager';

suite('KeepaliveManager Test Suite', () => {
  test('KeepaliveManager should not be active initially', () => {
    const manager = new KeepaliveManager(12345, 99999);
    assert.strictEqual(manager.isActive(), false);
  });

  test('KeepaliveManager should be active after start', () => {
    const manager = new KeepaliveManager(12345, 99999);
    manager.start();
    assert.strictEqual(manager.isActive(), true);
    manager.stop();
  });

  test('KeepaliveManager should not be active after stop', () => {
    const manager = new KeepaliveManager(12345, 99999);
    manager.start();
    manager.stop();
    assert.strictEqual(manager.isActive(), false);
  });

  test('KeepaliveManager start should be idempotent', () => {
    const manager = new KeepaliveManager(12345, 99999);
    manager.start();
    manager.start(); // Should not throw
    assert.strictEqual(manager.isActive(), true);
    manager.stop();
  });

  test('KeepaliveManager stop should be safe to call when not started', () => {
    const manager = new KeepaliveManager(12345, 99999);
    manager.stop(); // Should not throw
    assert.strictEqual(manager.isActive(), false);
  });
});
