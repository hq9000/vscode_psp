import * as assert from 'assert';
import * as vscode from 'vscode';
import { OscClient, OscConnectionState } from '../../src/communication/oscClient';
import { SonicPiProtocol, sonicPiAddresses } from '../../src/communication/sonicPiProtocol';
import { CommunicationManager } from '../../src/communication/communicationManager';
import { ServerMessageHandler } from '../../src/communication/serverMessageHandler';
import { DaemonPorts } from '../../src/server/serverManager';

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

    test('CommunicationManager should require initialization before connecting', () => {
      const manager = new CommunicationManager();
      assert.throws(() => {
        manager.connect();
      }, /not initialized/);
    });

    test('CommunicationManager should initialize with daemon ports', () => {
      const manager = new CommunicationManager();
      const daemonPorts: DaemonPorts = {
        daemonKeepAlive: 4556,
        guiListenToServer: 4557,
        guiSendToServer: 4558,
        scsynth: 4559,
        oscCues: 4560,
        tauApi: 4561,
        tauPhx: 4562,
        token: 12345,
      };
      const logChannel = vscode.window.createOutputChannel('Test Log');
      const cuesChannel = vscode.window.createOutputChannel('Test Cues');

      // Should not throw
      manager.initialize(daemonPorts, logChannel, cuesChannel);

      logChannel.dispose();
      cuesChannel.dispose();
    });

    test('CommunicationManager should support log suppression', () => {
      const manager = new CommunicationManager();
      const daemonPorts: DaemonPorts = {
        daemonKeepAlive: 4556,
        guiListenToServer: 4557,
        guiSendToServer: 4558,
        scsynth: 4559,
        oscCues: 4560,
        tauApi: 4561,
        tauPhx: 4562,
        token: 12345,
      };
      const logChannel = vscode.window.createOutputChannel('Test Log');
      const cuesChannel = vscode.window.createOutputChannel('Test Cues');

      manager.initialize(daemonPorts, logChannel, cuesChannel);

      // Should not throw
      manager.setLogSuppression(true);
      assert.strictEqual(true, true); // Basic assertion to verify method exists and doesn't throw

      manager.setLogSuppression(false);
      assert.strictEqual(true, true); // Basic assertion to verify method exists and doesn't throw

      logChannel.dispose();
      cuesChannel.dispose();
    });

    test('CommunicationManager dispose should clean up', () => {
      const manager = new CommunicationManager();
      manager.dispose();
      assert.strictEqual(manager.isConnected(), false);
    });
  });

  suite('ServerMessageHandler', () => {
    test('ServerMessageHandler should be created with listen port', () => {
      const handler = new ServerMessageHandler(4557);
      assert.ok(handler);
    });

    test('ServerMessageHandler should dispose without errors', () => {
      const handler = new ServerMessageHandler(4557);
      handler.dispose();
      assert.ok(true);
    });

    test('ServerMessageHandler should set output channels', () => {
      const handler = new ServerMessageHandler(4557);
      const logChannel = vscode.window.createOutputChannel('Test Log');
      const cuesChannel = vscode.window.createOutputChannel('Test Cues');

      // Should not throw
      handler.setOutputChannels(logChannel, cuesChannel);

      handler.dispose();
      logChannel.dispose();
      cuesChannel.dispose();
    });

    test('ServerMessageHandler should support log suppression', () => {
      const handler = new ServerMessageHandler(4557);
      const logChannel = vscode.window.createOutputChannel('Test Log');
      const cuesChannel = vscode.window.createOutputChannel('Test Cues');

      // Should not throw
      handler.setOutputChannels(logChannel, cuesChannel);
      handler.setLogSuppression(true);
      assert.strictEqual(true, true); // Basic assertion to verify method exists and doesn't throw

      handler.setLogSuppression(false);
      assert.strictEqual(true, true); // Basic assertion to verify method exists and doesn't throw

      handler.dispose();
      logChannel.dispose();
      cuesChannel.dispose();
    });
  });
});
