import * as dgram from 'dgram';
import { Logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OSC = require('osc-js');

/**
 * Keepalive interval in milliseconds.
 * The daemon requires keepalive messages more frequently than every 3s.
 * We use 1s to provide a safe margin.
 */
const KEEPALIVE_INTERVAL_MS = 1000;

/**
 * Manages periodic keep-alive messages sent to the Sonic Pi daemon.
 *
 * The Sonic Pi daemon implements a "Zombie Kill Switch" - it requires
 * periodic OSC /daemon/keep-alive messages from an external process.
 * If these messages stop arriving (timeout > 3s), the daemon kills
 * all spawned processes.
 */
export class KeepaliveManager {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private socket: dgram.Socket | null = null;
  private daemonPort: number;
  private token: number;

  constructor(daemonPort: number, token: number) {
    this.daemonPort = daemonPort;
    this.token = token;
  }

  /**
   * Start sending periodic keep-alive messages to the daemon.
   */
  start(): void {
    if (this.intervalHandle) {
      Logger.warn('Keepalive is already running');
      return;
    }

    this.socket = dgram.createSocket('udp4');

    this.socket.on('error', (err) => {
      Logger.error('Keepalive socket error', err);
    });

    Logger.info(`Starting keepalive to daemon on port ${this.daemonPort}`);

    // Send immediately, then on interval
    this.sendKeepalive();
    this.intervalHandle = setInterval(() => {
      this.sendKeepalive();
    }, KEEPALIVE_INTERVAL_MS);
  }

  /**
   * Stop sending keep-alive messages and close the socket.
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    if (this.socket) {
      try {
        this.socket.close();
      } catch (err) {
        // Socket may already be closed (e.g. due to prior error)
        Logger.debug(`Socket close error (safe to ignore): ${err instanceof Error ? err.message : String(err)}`);
      }
      this.socket = null;
    }

    Logger.info('Keepalive stopped');
  }

  /**
   * Check if the keepalive is currently active.
   */
  isActive(): boolean {
    return this.intervalHandle !== null;
  }

  /**
   * Send a single /daemon/keep-alive OSC message to the daemon.
   */
  private sendKeepalive(): void {
    if (!this.socket) {
      return;
    }

    try {
      const message = new OSC.Message('/daemon/keep-alive', this.token);
      const buffer = Buffer.from(message.pack());

      this.socket.send(buffer, 0, buffer.length, this.daemonPort, '127.0.0.1', (err) => {
        if (err) {
          Logger.warn(`Failed to send keepalive: ${err.message}`);
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      Logger.warn(`Error preparing keepalive message: ${errorMessage}`);
    }
  }
}
