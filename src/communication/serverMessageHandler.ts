import OSC from 'osc-js';
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

/**
 * Handles incoming OSC messages from the Sonic Pi server.
 * Listens on the guiListenToServer port for messages like /log/info, /error, /syntax_error, etc.
 */
export class ServerMessageHandler {
  private osc: typeof OSC.prototype | null = null;
  private listenPort: number;
  private logOutputChannel: vscode.OutputChannel | null = null;
  private cuesOutputChannel: vscode.OutputChannel | null = null;

  constructor(listenPort: number) {
    this.listenPort = listenPort;
  }

  /**
   * Set the output channels for log and cues
   */
  setOutputChannels(logChannel: vscode.OutputChannel, cuesChannel: vscode.OutputChannel): void {
    this.logOutputChannel = logChannel;
    this.cuesOutputChannel = cuesChannel;
  }

  /**
   * Start listening for messages from the server
   */
  start(): void {
    if (this.osc) {
      Logger.debug('Server message handler is already started');
      return;
    }

    try {
      Logger.info(`Starting server message handler on port ${this.listenPort}`);

      const plugin = new OSC.DatagramPlugin({
        open: {
          host: '127.0.0.1',
          port: this.listenPort,
        },
      } as any);

      this.osc = new OSC({ plugin });

      // Register message handlers
      this.registerHandlers();

      this.osc.open();
      Logger.info(`Server message handler started successfully on port ${this.listenPort}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error('Failed to start server message handler', err);
      throw err;
    }
  }

  /**
   * Stop listening for messages
   */
  stop(): void {
    if (this.osc) {
      try {
        this.osc.close();
      } catch (error) {
        Logger.warn(`Error closing server message handler: ${error instanceof Error ? error.message : String(error)}`);
      }
      this.osc = null;
      Logger.info('Server message handler stopped');
    }
  }

  /**
   * Register handlers for incoming OSC messages
   */
  private registerHandlers(): void {
    if (!this.osc) {
      return;
    }

    // Handle /log/info messages
    this.osc.on('/log/info', (message: { args: any }) => {
      this.handleLogInfo(message);
    });

    // Handle /incoming/osc messages (cues)
    this.osc.on('/incoming/osc', (message: { args: any }) => {
      this.handleIncomingOsc(message);
    });

    // Handle /log/multi_message
    this.osc.on('/log/multi_message', (message: any) => {
      this.handleMultiMessage(message);
    });

    // Handle /syntax_error
    this.osc.on('/syntax_error', (message: { args: any }) => {
      this.handleSyntaxError(message);
    });

    // Handle /error
    this.osc.on('/error', (message: any) => {
      this.handleError(message);
    });
  }

  /**
   * Handle /log/info messages
   */
  private handleLogInfo(message: { args: any }): void {
    try {
      const logMessage = message.args[1];
      Logger.debug(`[Server] ${logMessage}`);
      
      if (this.logOutputChannel) {
        this.logOutputChannel.appendLine(logMessage);
      }
    } catch (error) {
      Logger.warn(`Error handling /log/info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle /incoming/osc messages (cues)
   */
  private handleIncomingOsc(message: { args: any }): void {
    try {
      // Args: [timestamp, from, address, value]
      const address = message.args[2];
      const value = message.args[3];
      const cueMessage = `${address}: ${value}`;
      
      Logger.debug(`[Cue] ${cueMessage}`);
      
      if (this.cuesOutputChannel) {
        this.cuesOutputChannel.appendLine(cueMessage);
      }
    } catch (error) {
      Logger.warn(`Error handling /incoming/osc: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle /log/multi_message
   */
  private handleMultiMessage(message: { args: any }): void {
    try {
      const jobId = message.args[0];
      const threadName = message.args[1];
      const runtime = message.args[2];
      const count = message.args[3];

      let logText = `{run: ${jobId}, time: ${runtime}`;
      if (threadName) {
        logText += `, thread: ${threadName}`;
      }
      logText += '}';

      if (this.logOutputChannel) {
        this.logOutputChannel.appendLine(logText);

        for (let i = 0; i < count; i++) {
          const str = message.args[4 + 1 + 2 * i];
          const lines = str ? str.split(/\r?\n/) : [];
          
          let prefix: string;
          if (!str) {
            prefix = ' |';
          } else if (i === count - 1) {
            prefix = ' └─ ';
          } else {
            prefix = ' ├─ ';
          }

          if (lines.length === 0) {
            this.logOutputChannel?.appendLine(prefix);
          } else {
            lines.forEach((line: string, index: number) => {
              if (index === 0) {
                this.logOutputChannel?.appendLine(prefix + line);
              } else {
                this.logOutputChannel?.appendLine('    ' + line);
              }
            });
          }
        }
      }
    } catch (error) {
      Logger.warn(`Error handling /log/multi_message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle /syntax_error messages
   */
  private handleSyntaxError(message: { args: any }): void {
    try {
      const jobId = message.args[0];
      const description = message.args[1];
      const errorLine = message.args[2];
      const line = message.args[3];

      const errorMessage = `Syntax error on job ${jobId}: ${description}\nLine ${line}: ${errorLine}`;
      Logger.error(errorMessage);

      if (this.logOutputChannel) {
        this.logOutputChannel.appendLine(errorMessage);
      }

      // Show error notification
      void vscode.window.showErrorMessage(
        `Sonic Pi Syntax Error: ${description}\nLine ${line}: ${errorLine}`,
        'Show Logs'
      ).then((item) => {
        if (item && this.logOutputChannel) {
          this.logOutputChannel.show();
        }
      });
    } catch (error) {
      Logger.warn(`Error handling /syntax_error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle /error messages
   */
  private handleError(message: { args: any }): void {
    try {
      const jobId = message.args[0];
      const description = message.args[1];
      const backtrace = message.args[2];
      const line = message.args[3];

      const errorMessage = `Error on job ${jobId}: ${description}\nLine ${line}\nBacktrace: ${backtrace}`;
      Logger.error(errorMessage);

      if (this.logOutputChannel) {
        this.logOutputChannel.appendLine(errorMessage);
      }

      // Show error notification
      void vscode.window.showErrorMessage(
        `Sonic Pi Error: ${description}`,
        'Show Logs'
      ).then((item) => {
        if (item && this.logOutputChannel) {
          this.logOutputChannel.show();
        }
      });
    } catch (error) {
      Logger.warn(`Error handling /error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Dispose the handler and free resources
   */
  dispose(): void {
    this.stop();
    this.logOutputChannel = null;
    this.cuesOutputChannel = null;
  }
}
