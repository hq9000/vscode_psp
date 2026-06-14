import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { ErrorHandler } from './utils/errorHandler';
import { EditorFlashManager } from './utils/editorFlashManager';
import { ConfigurationManager } from './config/configurationManager';
import { FileHandler } from './files/fileHandler';
import { ServerManager } from './server/serverManager';
import { PythonEnvironment, PythonExecutor, OutputFileManager } from './python';
import { CommunicationManager } from './communication';

// Constants for daemon port initialization
const MAX_DAEMON_PORT_RETRIES = 10;
const DAEMON_PORT_RETRY_DELAY_MS = 500;

// Global output channel for logging
let outputChannel: vscode.OutputChannel;
let cuesOutputChannel: vscode.OutputChannel;
let communicationManagerInstance: CommunicationManager | null = null;

// Log suppression state tracking
let isLogSuppressionActive: boolean = false;

/**
 * This method is called when the extension is activated.
 * The extension is activated the very first time a command is executed.
 */
export function activate(context: vscode.ExtensionContext) {
  // Initialize output channel for user feedback
  outputChannel = vscode.window.createOutputChannel('VSCode PSP');
  context.subscriptions.push(outputChannel);

  // Initialize cues output channel for OSC cues
  cuesOutputChannel = vscode.window.createOutputChannel('VSCode PSP Cues');
  context.subscriptions.push(cuesOutputChannel);

  // Initialize logger with output channel
  Logger.initialize(outputChannel);

  Logger.info('VSCode PSP extension is now active');

  // Validate configuration
  const configErrors = ConfigurationManager.validateConfiguration();
  if (configErrors.length > 0) {
    Logger.warn('Configuration validation errors:');
    configErrors.forEach((error) => Logger.warn(`  - ${error}`));
  }

  // Initialize server manager
  const serverManager = ServerManager.getInstance();
  serverManager.initialize(context);

  // Initialize file handler
  FileHandler.initialize(context);

  // Initialize Python execution components
  const pythonEnvironment = new PythonEnvironment();
  const pythonExecutor = new PythonExecutor(pythonEnvironment);
  const outputFileManager = new OutputFileManager();

  // Initialize communication manager
  const communicationManager = new CommunicationManager();
  communicationManagerInstance = communicationManager;

  // Helper function to initialize communication manager with daemon ports
  const initializeCommunicationManager = async () => {
    for (let i = 0; i < MAX_DAEMON_PORT_RETRIES; i++) {
      const daemonPorts = serverManager.getDaemonPorts();
      if (daemonPorts) {
        communicationManager.initialize(daemonPorts, outputChannel, cuesOutputChannel);
        Logger.info('Communication manager initialized with daemon ports');
        return;
      }

      if (i < MAX_DAEMON_PORT_RETRIES - 1) {
        Logger.debug(
          `Daemon ports not available yet, retrying in ${DAEMON_PORT_RETRY_DELAY_MS}ms (attempt ${i + 1}/${MAX_DAEMON_PORT_RETRIES})`
        );
        await new Promise((resolve) => setTimeout(resolve, DAEMON_PORT_RETRY_DELAY_MS));
      }
    }

    Logger.error(
      'Failed to initialize communication manager: daemon ports not available after retries'
    );
    vscode.window.showWarningMessage(
      'PSP: Communication with Sonic Pi server could not be established'
    );
  };

  // Set the server start callback for FileHandler
  FileHandler.setServerStartCallback(initializeCommunicationManager);

  // Register commands
  const startCommand = vscode.commands.registerCommand(
    'vscode-psp.start',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Start server command invoked');
      const started = await serverManager.startServer();

      if (started) {
        // Initialize communication manager with daemon ports after server starts
        await initializeCommunicationManager();
      }
    }, 'startCommand')
  );

  const stopServerCommand = vscode.commands.registerCommand(
    'vscode-psp.stopServer',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Stop server command invoked');
      // Send stop command to Sonic Pi via OSC
      await communicationManager.sendStop();
      await serverManager.stopServer();
    }, 'stopServerCommand')
  );

  const restartCommand = vscode.commands.registerCommand(
    'vscode-psp.restartServer',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Restart server command invoked');
      await serverManager.restartServer();
    }, 'restartCommand')
  );
       
  const stopCommand = vscode.commands.registerCommand(
    'vscode-psp.stop',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Stop all playback command invoked');

      const connectionState = communicationManager.getConnectionState();
      if (!communicationManager.isConnected()) {
        vscode.window.showWarningMessage('PSP: Sonic Pi server is not running');
        return;
      }

      const sent = await communicationManager.sendStop();
      if (sent) {
        vscode.window.showInformationMessage('PSP: All playback stopped');
        Logger.info('Stop command sent successfully');
      } else {
        vscode.window.showWarningMessage('PSP: Failed to send stop command to Sonic Pi server');
        Logger.warn('Failed to send stop command');
      }
    }, 'stopCommand')
  );

  const checkStatusCommand = vscode.commands.registerCommand(
    'vscode-psp.checkServerStatus',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Check server status command invoked');
      const statusInfo = serverManager.getStatusInfo();

      // Show status in output channel for better formatting
      Logger.show();
      Logger.info('=== Server Status ===');
      Logger.info(statusInfo);

      // Also show a brief notification
      const state = serverManager.getState();
      const briefStatus = `Server is ${state}`;
      vscode.window.showInformationMessage(briefStatus);
    }, 'checkStatusCommand')
  );

  const runCommand = vscode.commands.registerCommand(
    'vscode-psp.run',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Run current file command invoked');

      // Get the active editor
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('PSP: No active file to run');
        return;
      }

      const filePath = editor.document.fileName;
      if (!filePath.endsWith('.live.py')) {
        vscode.window.showWarningMessage('PSP: Current file is not a .live.py file');
        return;
      }

      // Suppress logs before execution to prevent Sonic Pi logs from burying Python errors
      if (communicationManagerInstance) {
        communicationManagerInstance.setLogSuppression(true);
        isLogSuppressionActive = true;
      }

      try {
        // Show progress indicator while running
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'PSP: Running Python script...',
            cancellable: false,
          },
          async () => {
            // Save the file before executing
            if (editor.document.isDirty) {
              await editor.document.save();
            }

            // Clear output if configured
            if (ConfigurationManager.getLogClearOnRun()) {
              outputChannel.clear();
              // Show output channel to enable autoscroll if configured
              if (ConfigurationManager.getLogAutoscroll()) {
                Logger.show();
              }
            }

            // Detect Python environment if not already done
            if (!pythonEnvironment.getPythonPath()) {
              const detected = await pythonEnvironment.detectPythonPath();
              if (!detected) {
                vscode.window.showErrorMessage(
                  'PSP: No Python interpreter found. Please configure vscode-psp.pythonPath in settings.'
                );
                return;
              }

              // Validate version
              const version = await pythonEnvironment.validatePythonVersion(detected);
              if (!version) {
                return;
              }
            }

            // Ensure output directory exists
            outputFileManager.ensureOutputDirectory();

            // Execute the script
            const result = await pythonExecutor.executeScript(filePath);

            // Display output
            if (result.stdout) {
              Logger.info(`[Script Output]\n${result.stdout}`);
            }
            if (result.stderr) {
              Logger.warn(`[Script Error]\n${result.stderr}`);
            }

            if (!result.success) {
              if (result.timedOut) {
                vscode.window.showErrorMessage('PSP: Script execution timed out');
              } else {
                vscode.window.showErrorMessage(
                  `PSP: Script execution failed (exit code ${result.exitCode})`
                );
              }
              return;
            }

            // Read the output file
            const outputContent = await outputFileManager.readOutputFile();
            if (!outputContent) {
              vscode.window.showErrorMessage(
                'PSP: Script executed but no output file (last.rb) was generated'
              );
              return;
            }

            // Validate output content
            if (!outputFileManager.validateContent(outputContent)) {
              vscode.window.showWarningMessage('PSP: Output file content may be invalid');
            }

            // Send the generated Ruby code to Sonic Pi via OSC
            const sent = await communicationManager.sendCode(outputContent);
            if (!sent) {
              vscode.window.showWarningMessage(
                'PSP: Code generated but failed to send to Sonic Pi server'
              );
              Logger.warn('EDi4f: Failed to send code to Sonic Pi server');
            } else {
              Logger.info('GB904f: Code sent to Sonic Pi server successfully');
              // Apply flash effect on successful code send to the .live.py file editor
              await EditorFlashManager.flashEditor(editor);
            }

            Logger.info('Script executed and output file read successfully');
            vscode.window.showInformationMessage('PSP: Script executed successfully');
          }
        );
      } finally {
        // Always restore logs after execution, regardless of success or failure
        if (isLogSuppressionActive) {
          if (communicationManagerInstance) {
            communicationManagerInstance.setLogSuppression(false);
          }
          isLogSuppressionActive = false;
        }
      }
    }, 'runCommand')
  );

  // Add commands to subscriptions for proper cleanup
  context.subscriptions.push(
    startCommand,
    stopServerCommand,
    stopCommand,
    restartCommand,
    checkStatusCommand,
    runCommand
  );
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {
  Logger.info('VSCode PSP extension is now deactivated');

  // Dispose communication manager
  if (communicationManagerInstance) {
    communicationManagerInstance.dispose();
    communicationManagerInstance = null;
  }

  // Dispose server manager
  const serverManager = ServerManager.getInstance();
  serverManager.dispose();

  // Dispose file handler
  FileHandler.dispose();

  // Dispose logger
  Logger.dispose();

  if (outputChannel) {
    outputChannel.dispose();
  }

  if (cuesOutputChannel) {
    cuesOutputChannel.dispose();
  }
}
