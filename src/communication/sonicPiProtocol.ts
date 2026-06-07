import { Logger } from '../utils/logger';
import { OscClient } from './oscClient';

/**
 * Sonic Pi OSC message addresses
 */
export const sonicPiAddresses = {
  runCode: '/run-code',
  stopAllJobs: '/stop-all-jobs',
} as const;

/**
 * Implements the Sonic Pi OSC protocol for sending commands
 */
export class SonicPiProtocol {
  private client: OscClient;
  private guiId: string;

  /**
   * @param client OSC client for sending messages
   * @param daemonToken Authentication token from DaemonPorts used as GUI ID for Sonic Pi commands.
   * This token identifies this client to the Sonic Pi daemon and is required for proper bidirectional communication.
   */
  constructor(client: OscClient, daemonToken: number) {
    this.client = client;
    this.guiId = String(daemonToken);
  }

  /**
   * Send Ruby code to Sonic Pi for execution
   * Message format: /run-code <gui_id> <code>
   * @param code Ruby code to execute
   */
  runCode(code: string): void {
    Logger.info('Sending run-code command to Sonic Pi');
    Logger.debug(`Code length: ${code.length} characters`);
    this.client.sendMessage(sonicPiAddresses.runCode, this.guiId, code);
  }

  /**
   * Stop all running jobs in Sonic Pi
   * Message format: /stop-all-jobs <gui_id>
   */
  stopAllJobs(): void {
    Logger.info('Sending stop-all-jobs command to Sonic Pi');
    this.client.sendMessage(sonicPiAddresses.stopAllJobs, this.guiId);
  }
}
