import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../utils/logger';
import { ConfigurationManager } from '../config/configurationManager';
import { KeepaliveManager } from './keepaliveManager';

/**
 * Server state enum
 */
export enum ServerState {
  stopped = 'stopped',
  starting = 'starting',
  running = 'running',
  stopping = 'stopping',
  error = 'error'
}

/**
 * Server configuration constants
 */
const SERVER_STARTUP_WAIT_MS = 2000; // Time to wait for server to initialize
const SERVER_STOP_TIMEOUT_MS = 5000; // Maximum time to wait for graceful shutdown
const STOP_CHECK_INTERVAL_MS = 100; // Polling interval for checking server stop
// Number of fields in daemon stdout: daemon gui-listen-to-server gui-send-to-server scsynth osc-cues tau-api token
const DAEMON_OUTPUT_FIELD_COUNT = 7;

/**
 * Parsed daemon stdout parameters.
 * The daemon prints: daemon gui-listen-to-server gui-send-to-server scsynth osc-cues tau-api token
 */
export interface DaemonPorts {
  daemon: number;
  guiListenToServer: number;
  guiSendToServer: number;
  scsynth: number;
  oscCues: number;
  tauApi: number;
  token: number;
}

/**
 * Server manager for Sonic Pi server lifecycle management
 */
export class ServerManager {
  private static instance: ServerManager | null = null;
  private serverProcess: childProcess.ChildProcess | null = null;
  private serverState: ServerState = ServerState.stopped;
  private statusBarItem: vscode.StatusBarItem | null = null;
  private keepaliveManager: KeepaliveManager | null = null;
  private daemonPorts: DaemonPorts | null = null;

  /**
   * Get singleton instance
   */
  static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  /**
   * Initialize server manager with status bar
   */
  initialize(context: vscode.ExtensionContext): void {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'vscode-psp.checkServerStatus';
    context.subscriptions.push(this.statusBarItem);

    this.updateStatusBar();
  }

  /**
   * Get current server state
   */
  getState(): ServerState {
    return this.serverState;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.serverState === ServerState.running;
  }

  /**
   * Start the Sonic Pi server
   */
  async startServer(): Promise<boolean> {
    if (this.serverState === ServerState.running) {
      Logger.info('Server is already running');
      vscode.window.showInformationMessage('Sonic Pi server is already running');
      return true;
    }

    if (this.serverState === ServerState.starting) {
      Logger.warn('Server is already starting');
      return false;
    }

    try {
      this.serverState = ServerState.starting;
      this.updateStatusBar();

      const sonicPiRoot = ConfigurationManager.getSonicPiRootDirectory();
      if (!sonicPiRoot) {
        throw new Error('Sonic Pi root directory not configured');
      }

      const serverPath = this.getServerExecutablePath(sonicPiRoot);
      if (!serverPath) {
        throw new Error('Could not locate Sonic Pi server executable');
      }

      Logger.info(`Starting Sonic Pi server from: ${serverPath}`);

      // Show progress notification
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Starting Sonic Pi Server',
        cancellable: false
      }, async (progress) => {
        progress.report({ message: 'Locating server executable...' });

        // Spawn server process
        const { command, args, options } = this.getServerSpawnConfig(serverPath);
        Logger.debug(`Spawning server: ${command} ${args.join(' ')}`);

        progress.report({ message: 'Launching server process...' });

        this.serverProcess = childProcess.spawn(command, args, options);

        // Set up process event handlers
        this.setupProcessHandlers();

        // Wait a bit for the server to start
        progress.report({ message: 'Waiting for server to initialize...' });
        await this.waitForServerStart();
      });

      this.serverState = ServerState.running;
      this.updateStatusBar();
      Logger.info('Sonic Pi server started successfully');
      vscode.window.showInformationMessage('Sonic Pi server started successfully');
      return true;

    } catch (error) {
      this.serverState = ServerState.error;
      this.updateStatusBar();
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Failed to start server: ${errorMessage}`, error instanceof Error ? error : undefined);
      vscode.window.showErrorMessage(`Failed to start Sonic Pi server: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Stop the Sonic Pi server
   */
  async stopServer(): Promise<boolean> {
    if (this.serverState === ServerState.stopped) {
      Logger.info('Server is already stopped');
      vscode.window.showInformationMessage('Sonic Pi server is not running');
      return true;
    }

    if (this.serverState === ServerState.stopping) {
      Logger.warn('Server is already stopping');
      return false;
    }

    try {
      this.serverState = ServerState.stopping;
      this.updateStatusBar();

      Logger.info('Stopping Sonic Pi server');

      // Stop keepalive first
      this.stopKeepalive();

      if (this.serverProcess) {
        // Try graceful shutdown first
        this.serverProcess.kill('SIGTERM');

        // Wait for process to exit
        await this.waitForServerStop();

        // Force kill if still running
        if (this.serverProcess && !this.serverProcess.killed) {
          Logger.warn('Server did not stop gracefully, force killing');
          this.serverProcess.kill('SIGKILL');
        }

        this.serverProcess = null;
      }

      this.daemonPorts = null;
      this.serverState = ServerState.stopped;
      this.updateStatusBar();
      Logger.info('Sonic Pi server stopped successfully');
      vscode.window.showInformationMessage('Sonic Pi server stopped successfully');
      return true;

    } catch (error) {
      this.serverState = ServerState.error;
      this.updateStatusBar();
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Failed to stop server: ${errorMessage}`, error instanceof Error ? error : undefined);
      vscode.window.showErrorMessage(`Failed to stop Sonic Pi server: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Restart the Sonic Pi server
   */
  async restartServer(): Promise<boolean> {
    Logger.info('Restarting Sonic Pi server');
    const stopped = await this.stopServer();
    if (!stopped) {
      return false;
    }
    return await this.startServer();
  }

  /**
   * Get server status information
   */
  getStatusInfo(): string {
    const port = ConfigurationManager.getServerPort();
    const sonicPiRoot = ConfigurationManager.getSonicPiRootDirectory();

    let status = `Sonic Pi Server Status\n\n`;
    status += `State: ${this.serverState}\n`;
    status += `Port: ${port}\n`;
    status += `Sonic Pi Root: ${sonicPiRoot}\n`;

    // Include process ID if available (using optional chaining for safety)
    const pid = this.serverProcess?.pid;
    if (pid) {
      status += `Process ID: ${pid}\n`;
    }

    return status;
  }

  /**
   * Get the path to the Ruby interpreter based on platform
   */
  private getRubyPath(sonicPiRoot: string): string {
    const platform = os.platform();

    if (platform === 'win32') {
      return path.join(sonicPiRoot, 'app', 'server', 'native', 'ruby', 'bin', 'ruby.exe');
    } else if (platform === 'darwin') {
      return '/usr/bin/ruby';
    } else {
      return 'ruby';
    }
  }

  /**
   * Get the path to the daemon launcher script based on platform
   */
  private getDaemonLauncherPath(sonicPiRoot: string): string {
    const platform = os.platform();

    if (platform === 'win32') {
      return path.join(sonicPiRoot, 'app', 'server', 'ruby', 'bin', 'daemon.rb');
    } else {
      return path.join(sonicPiRoot, 'server', 'ruby', 'bin', 'daemon.rb');
    }
  }

  /**
   * Get platform-specific server executable path (daemon.rb script)
   */
  private getServerExecutablePath(sonicPiRoot: string): string | null {
    const platform = os.platform();

    if (platform !== 'win32' && platform !== 'darwin' && platform !== 'linux') {
      Logger.error(`Unsupported platform: ${platform}`);
      return null;
    }

    const daemonPath = this.getDaemonLauncherPath(sonicPiRoot);

    // Verify the path exists
    if (!fs.existsSync(daemonPath)) {
      Logger.error(`Daemon launcher script not found at: ${daemonPath}`);
      return null;
    }

    Logger.debug(`Found daemon launcher at: ${daemonPath}`);
    return daemonPath;
  }

  /**
   * Get platform-specific spawn configuration
   */
  private getServerSpawnConfig(serverPath: string): {
    command: string;
    args: string[];
    options: childProcess.SpawnOptions;
  } {
    const sonicPiRoot = ConfigurationManager.getSonicPiRootDirectory();
    const rubyPath = this.getRubyPath(sonicPiRoot);
    const command = rubyPath;
    const args: string[] = [serverPath, '--no-scsynth-inputs'];
    const options: childProcess.SpawnOptions = {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    };

    return { command, args, options };
  }

  /**
   * Set up process event handlers
   */
  private setupProcessHandlers(): void {
    if (!this.serverProcess) {
      return;
    }

    // Handle stdout - also parse daemon port info
    if (this.serverProcess.stdout) {
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          Logger.debug(`[Server] ${output}`);
          // Try to parse daemon ports from stdout if not yet parsed
          if (!this.daemonPorts) {
            const parsed = this.parseDaemonOutput(output);
            if (parsed) {
              this.daemonPorts = parsed;
              Logger.info(`Daemon ports parsed - daemon: ${parsed.daemon}, token: ${parsed.token}`);
              this.startKeepalive(parsed.daemon, parsed.token);
            }
          }
        }
      });
    }

    // Handle stderr
    if (this.serverProcess.stderr) {
      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          Logger.warn(`[Server Error] ${output}`);
        }
      });
    }

    // Handle process exit
    this.serverProcess.on('exit', (code, signal) => {
      Logger.info(`Server process exited with code ${code}, signal ${signal}`);
      this.serverProcess = null;

      if (this.serverState === ServerState.running) {
        // Unexpected exit
        this.serverState = ServerState.error;
        this.updateStatusBar();
        vscode.window.showErrorMessage('Sonic Pi server stopped unexpectedly');
      } else if (this.serverState !== ServerState.stopping) {
        this.serverState = ServerState.stopped;
        this.updateStatusBar();
      }
    });

    // Handle process errors
    this.serverProcess.on('error', (error) => {
      Logger.error('Server process error', error);
      this.serverState = ServerState.error;
      this.updateStatusBar();
      vscode.window.showErrorMessage(`Sonic Pi server error: ${error.message}`);
    });
  }

  /**
   * Wait for server to start (simple delay-based approach)
   * TODO: In Phase 5, replace with actual health check by attempting
   * to connect to the OSC port instead of using a fixed delay
   */
  private async waitForServerStart(): Promise<void> {
    // Simple delay to allow server to initialize
    // In a production implementation, this should be replaced with
    // actual health checks (e.g., trying to connect to the OSC port)
    // Phase 5 will implement proper OSC connectivity checks
    return new Promise((resolve) => setTimeout(resolve, SERVER_STARTUP_WAIT_MS));
  }

  /**
   * Wait for server to stop
   */
  private async waitForServerStop(): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        try {
          if (!this.serverProcess || this.serverProcess.killed) {
            clearInterval(checkInterval);
            resolve();
          } else if (Date.now() - startTime > SERVER_STOP_TIMEOUT_MS) {
            clearInterval(checkInterval);
            resolve();
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, STOP_CHECK_INTERVAL_MS);
    });
  }

  /**
   * Update status bar item
   */
  private updateStatusBar(): void {
    if (!this.statusBarItem) {
      return;
    }

    let icon: string;
    let tooltip: string;

    switch (this.serverState) {
      case ServerState.running:
        icon = '$(vm-running)';
        tooltip = 'Sonic Pi Server is running (click for details)';
        break;
      case ServerState.starting:
        icon = '$(sync~spin)';
        tooltip = 'Sonic Pi Server is starting...';
        break;
      case ServerState.stopping:
        icon = '$(loading~spin)';
        tooltip = 'Sonic Pi Server is stopping...';
        break;
      case ServerState.error:
        icon = '$(error)';
        tooltip = 'Sonic Pi Server encountered an error';
        break;
      case ServerState.stopped:
      default:
        icon = '$(vm-outline)';
        tooltip = 'Sonic Pi Server is stopped (click for details)';
        break;
    }

    this.statusBarItem.text = `${icon} Sonic Pi`;
    this.statusBarItem.tooltip = tooltip;
    this.statusBarItem.show();
  }

  /**
   * Parse daemon stdout output to extract port numbers and token.
   * The daemon prints: daemon gui-listen-to-server gui-send-to-server scsynth osc-cues tau-api token
   */
  parseDaemonOutput(output: string): DaemonPorts | null {
    // The daemon output line contains 7 space-separated integers
    const lines = output.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length === DAEMON_OUTPUT_FIELD_COUNT && parts.every(p => /^-?\d+$/.test(p))) {
        const values = parts.map(p => parseInt(p, 10));
        return {
          daemon: values[0],
          guiListenToServer: values[1],
          guiSendToServer: values[2],
          scsynth: values[3],
          oscCues: values[4],
          tauApi: values[5],
          token: values[6],
        };
      }
    }
    return null;
  }

  /**
   * Start the keepalive manager to send periodic messages to the daemon.
   */
  private startKeepalive(daemonPort: number, token: number): void {
    this.stopKeepalive();
    this.keepaliveManager = new KeepaliveManager(daemonPort, token);
    this.keepaliveManager.start();
  }

  /**
   * Stop the keepalive manager.
   */
  private stopKeepalive(): void {
    if (this.keepaliveManager) {
      this.keepaliveManager.stop();
      this.keepaliveManager = null;
    }
  }

  /**
   * Get the parsed daemon ports (if available).
   */
  getDaemonPorts(): DaemonPorts | null {
    return this.daemonPorts;
  }

  /**
   * Dispose server manager
   */
  dispose(): void {
    Logger.info('Disposing server manager');

    this.stopKeepalive();

    if (this.serverProcess) {
      Logger.info('Cleaning up server process');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }

    if (this.statusBarItem) {
      this.statusBarItem.dispose();
      this.statusBarItem = null;
    }

    this.daemonPorts = null;
    this.serverState = ServerState.stopped;
  }
}
