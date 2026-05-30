import * as assert from 'assert';
import { OscClient, OscConnectionState } from '../../src/communication/oscClient';
import { SonicPiProtocol, sonicPiAddresses } from '../../src/communication/sonicPiProtocol';
import { CommunicationManager } from '../../src/communication/communicationManager';

suite('Communication Layer Test Suite', () => {
  suite('OscClient', () => {
    test('OscClient should start in disconnected state', () => {
      const client = new OscClient({ host: '127.0.0.1', sendPort: 4557 });
      assert.strictEqual(client.getState(), OscConnectionState.disconnected);
    });

    test('OscClient should report not connected initially', () => {
      const client = new OscClient({ host: '127.0.0.1', sendPort: 4557 });
      assert.strictEqual(client.isConnected(), false);
    });

    test('OscClient should throw when sending without connection', () => {
      const client = new OscClient({ host: '127.0.0.1', sendPort: 4557 });
      assert.throws(() => {
        client.sendMessage('/test', 'hello');
      }, /not connected/);
    });

    test('OscClient dispose should set state to disconnected', () => {
      const client = new OscClient({ host: '127.0.0.1', sendPort: 4557 });
      client.dispose();
      assert.strictEqual(client.getState(), OscConnectionState.disconnected);
    });
  });

  suite('SonicPiProtocol', () => {
    test('sonicPiAddresses should have correct OSC addresses', () => {
      assert.strictEqual(sonicPiAddresses.runCode, '/run-code');
      assert.strictEqual(sonicPiAddresses.stopAllJobs, '/stop-all-jobs');
    });
  });

  suite('CommunicationManager', () => {
    test('CommunicationManager should start disconnected', () => {
      const manager = new CommunicationManager();
      assert.strictEqual(manager.isConnected(), false);
    });

    test('CommunicationManager should report disconnected state initially', () => {
      const manager = new CommunicationManager();
      assert.strictEqual(manager.getConnectionState(), OscConnectionState.disconnected);
    });

    test('CommunicationManager dispose should clean up', () => {
      const manager = new CommunicationManager();
      manager.dispose();
      assert.strictEqual(manager.isConnected(), false);
    });
  });
});
