import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { OscClient, OscConnectionState } from './oscClient';
import { SonicPiProtocol } from './sonicPiProtocol';
import { ServerMessageHandler } from './serverMessageHandler';
import { DaemonPorts } from '../server/serverManager';

/**
 * Maximum number of retry attempts for failed sends
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Delay between retry attempts in milliseconds
 */
const RETRY_DELAY_MS = 500;

/**
 * Maximum number of messages to queue when server is unavailable
 */
const MAX_QUEUE_SIZE = 50;

/**
 * Queued message representation
 */
interface QueuedMessage {
  action: 'runCode' | 'stopAllJobs';
  payload?: string;
  timestamp: number;
}

/**
 * Coordinates OSC communication with the Sonic Pi server.
 * Provides retry logic, message queueing, and connection health monitoring.
 */
export class CommunicationManager {
  private oscClient: OscClient | null = null;
  private protocol: SonicPiProtocol | null = null;
  private messageQueue: QueuedMessage[] = [];
  private isProcessingQueue = false;
  private serverMessageHandler: ServerMessageHandler | null = null;
  private daemonPorts: DaemonPorts | null = null;

  /**
   * Initialize the communication manager with daemon ports and output channels
   * @param daemonPorts Ports discovered from daemon startup
   * @param logChannel Output channel for server logs
   * @param cuesChannel Output channel for OSC cues
   */
  initialize(
    daemonPorts: DaemonPorts,
    logChannel: vscode.OutputChannel,
    cuesChannel: vscode.OutputChannel
  ): void {
    this.daemonPorts = daemonPorts;

    // Initialize server message handler
    this.serverMessageHandler = new ServerMessageHandler(daemonPorts.guiListenToServer);
    this.serverMessageHandler.setOutputChannels(logChannel, cuesChannel);

    Logger.info(
      `Communication manager initialized with daemon ports - send: ${daemonPorts.guiSendToServer}, listen: ${daemonPorts.guiListenToServer}`
    );
  }

  /**
   * Connect to the Sonic Pi server
   */
  connect(): void {
    if (this.oscClient && this.oscClient.isConnected()) {
      Logger.debug('Communication manager is already connected');
      return;
    }

    if (!this.daemonPorts) {
      throw new Error(
        'Communication manager not initialized. Call initialize() first with daemon ports.'
      );
    }

    const host = '127.0.0.1';
    const port = this.daemonPorts.guiSendToServer;
    const token = this.daemonPorts.token;

    Logger.info(`Connecting to Sonic Pi server at ${host}:${port}`);

    this.oscClient = new OscClient({ host, sendPort: port });
    this.protocol = new SonicPiProtocol(this.oscClient, token);

    try {
      this.oscClient.open();

      // Start the server message handler
      if (this.serverMessageHandler) {
        this.serverMessageHandler.start();
      }
    } catch (error) {
      Logger.error(
        'Failed to connect to Sonic Pi server',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Disconnect from the Sonic Pi server
   */
  disconnect(): void {
    // Stop the server message handler
    if (this.serverMessageHandler) {
      this.serverMessageHandler.stop();
    }

    if (this.oscClient) {
      this.oscClient.dispose();
      this.oscClient = null;
      this.protocol = null;
    }
    this.messageQueue = [];
    Logger.info('Disconnected from Sonic Pi server');
  }

  /**
   * Check if communication is available
   */
  isConnected(): boolean {
    return this.oscClient !== null && this.oscClient.isConnected();
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): OscConnectionState {
    if (!this.oscClient) {
      return OscConnectionState.disconnected;
    }
    return this.oscClient.getState();
  }

  /**
   * Send Ruby code to Sonic Pi for execution with retry logic
   * @param code Ruby code to execute
   */
  async sendCode(code: string): Promise<boolean> {
    return this.sendWithRetry('runCode', code);
  }

  /**
   * Send stop command to Sonic Pi with retry logic
   */
  async sendStop(): Promise<boolean> {
    return this.sendWithRetry('stopAllJobs');
  }

  /**
   * Send a message with retry logic
   */
  private async sendWithRetry(
    action: 'runCode' | 'stopAllJobs',
    payload?: string
  ): Promise<boolean> {
    // Ensure we're connected
    if (!this.oscClient || !this.protocol) {
      try {
        this.connect();
      } catch {
        // Queue the message if we can't connect
        Logger.warn('Vk4fo: Not connected to Sonic Pi server, queuing message');
        this.queueMessage(action, payload);
        return false;
      }
    }

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        this.executeAction(action, payload);
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.warn(`Send attempt ${attempt}/${MAX_RETRY_ATTEMPTS} failed: ${errorMessage}`);

        if (attempt < MAX_RETRY_ATTEMPTS) {
          await this.delay(RETRY_DELAY_MS);
        }
      }
    }

    // All retries failed, queue the message
    Logger.error(
      `Failed to send ${action} after ${MAX_RETRY_ATTEMPTS} attempts. Connection state: ${this.getConnectionState()}. Ensure Sonic Pi server is running.`
    );
    this.queueMessage(action, payload);
    return false;
  }

  /**
   * Execute a protocol action
   */
  private executeAction(action: 'runCode' | 'stopAllJobs', payload?: string): void {
    if (!this.protocol) {
      throw new Error('Protocol not initialized');
    }

    switch (action) {
      case 'runCode':
        if (!payload) {
          throw new Error('No code payload provided for runCode action');
        }
        this.protocol.runCode(payload);
        break;
      case 'stopAllJobs':
        this.protocol.stopAllJobs();
        break;
    }
  }

  /**
   * Queue a message for later delivery
   */
  private queueMessage(action: 'runCode' | 'stopAllJobs', payload?: string): void {
    if (this.messageQueue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest message
      this.messageQueue.shift();
      Logger.warn('Message queue full, dropping oldest message');
    }

    this.messageQueue.push({
      action,
      payload,
      timestamp: Date.now(),
    });

    Logger.debug(`Message queued (queue size: ${this.messageQueue.length})`);
  }

  /**
   * Process queued messages
   */
  async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    if (!this.isConnected()) {
      Logger.debug('Cannot process queue: not connected');
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue[0];
        try {
          this.executeAction(message.action, message.payload);
          this.messageQueue.shift(); // Remove successfully sent message
          Logger.debug(`Queued message processed (remaining: ${this.messageQueue.length})`);
        } catch {
          // Stop processing on first failure
          Logger.warn('Failed to process queued message, will retry later');
          break;
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Helper to create a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Dispose the communication manager and free resources
   */
  dispose(): void {
    if (this.serverMessageHandler) {
      this.serverMessageHandler.dispose();
      this.serverMessageHandler = null;
    }
    this.disconnect();
    this.daemonPorts = null;
  }
}
