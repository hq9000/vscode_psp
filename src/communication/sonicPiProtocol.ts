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
 * Default GUI ID used when communicating with Sonic Pi
 * Sonic Pi expects a GUI identifier to track the source of commands
 */
const DEFAULT_GUI_ID = 'vscode-psp';

/**
 * Implements the Sonic Pi OSC protocol for sending commands
 */
export class SonicPiProtocol {
  private client: OscClient;
  private guiId: string;

  constructor(client: OscClient, guiId: string = DEFAULT_GUI_ID) {
    this.client = client;
    this.guiId = guiId;
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
