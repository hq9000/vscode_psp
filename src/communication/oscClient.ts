import OSC from 'osc-js';
import { Logger } from '../utils/logger';

/**
 * Connection state for the OSC client
 */
export enum OscConnectionState {
  disconnected = 'disconnected',
  connecting = 'connecting',
  connected = 'connected',
  error = 'error'
}

/**
 * Options for OscClient configuration
 */
export interface OscClientOptions {
  host: string;
  sendPort: number;
  listenPort?: number;
}

/**
 * OSC Client for communicating with Sonic Pi server via UDP
 */
export class OscClient {
  private osc: typeof OSC.prototype | null = null;
  private state: OscConnectionState = OscConnectionState.disconnected;
  private options: OscClientOptions;

  constructor(options: OscClientOptions) {
    this.options = options;
  }

  /**
   * Get current connection state
   */
  getState(): OscConnectionState {
    return this.state;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.state === OscConnectionState.connected;
  }

  /**
   * Open connection to Sonic Pi server
   */
  open(): void {
    if (this.state === OscConnectionState.connected) {
      Logger.debug('OSC client is already connected');
      return;
    }

    try {
      this.state = OscConnectionState.connecting;

      const plugin = new OSC.DatagramPlugin({
        open: {
          host: this.options.host,
          port: this.options.listenPort || 0,
        },
        send: {
          host: this.options.host,
          port: this.options.sendPort,
        },
      } as any);

      this.osc = new OSC({ plugin });

      this.osc.on('open', () => {
        this.state = OscConnectionState.connected;
        Logger.info(`OSC client connected (sending to ${this.options.host}:${this.options.sendPort})`);
      });

      this.osc.on('close', () => {
        this.state = OscConnectionState.disconnected;
        Logger.info('OSC client disconnected');
      });

      this.osc.on('error', (error: Error) => {
        this.state = OscConnectionState.error;
        Logger.error('OSC client error', error);
      });

      this.osc.open();
    } catch (error) {
      this.state = OscConnectionState.error;
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error('Failed to open OSC connection', err);
      throw err;
    }
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.osc) {
      try {
        this.osc.close();
      } catch (error) {
        Logger.warn(`Error closing OSC connection: ${error instanceof Error ? error.message : String(error)}`);
      }
      this.osc = null;
    }
    this.state = OscConnectionState.disconnected;
  }

  /**
   * Send an OSC message
   * @param address OSC address pattern (e.g., '/run-code')
   * @param args Message arguments
   */
  sendMessage(address: string, ...args: (string | number)[]): void {
    if (!this.osc) {
      throw new Error('OSC client is not connected');
    }

    try {
      const message = new OSC.Message(address, ...args);
      this.osc.send(message);
      Logger.debug(`OSC message sent: ${address} [${args.length} args]`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error(`Failed to send OSC message to ${address}`, err);
      throw err;
    }
  }

  /**
   * Register a handler for incoming OSC messages
   * @param address OSC address pattern to listen for
   * @param handler Callback function
   */
  on(address: string, handler: (message: any) => void): void {
    if (this.osc) {
      this.osc.on(address, handler);
    }
  }

  /**
   * Dispose the client and free resources
   */
  dispose(): void {
    this.close();
  }
}
