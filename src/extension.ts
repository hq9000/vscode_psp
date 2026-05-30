import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { ErrorHandler } from './utils/errorHandler';
import { ConfigurationManager } from './config/configurationManager';
import { FileHandler } from './files/fileHandler';
import { ServerManager } from './server/serverManager';
import { PythonEnvironment, PythonExecutor, OutputFileManager } from './python';

// Global output channel for logging
let outputChannel: vscode.OutputChannel;

/**
 * This method is called when the extension is activated.
 * The extension is activated the very first time a command is executed.
 */
export function activate(context: vscode.ExtensionContext) {
  // Initialize output channel for user feedback
  outputChannel = vscode.window.createOutputChannel('VSCode PSP');
  context.subscriptions.push(outputChannel);

  // Initialize logger with output channel
  Logger.initialize(outputChannel);

  Logger.info('VSCode PSP extension is now active');

  // Validate configuration
  const configErrors = ConfigurationManager.validateConfiguration();
  if (configErrors.length > 0) {
    Logger.warn('Configuration validation errors:');
    configErrors.forEach(error => Logger.warn(`  - ${error}`));
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

  // Register commands
  const startCommand = vscode.commands.registerCommand('vscode-psp.start',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Start server command invoked');
      await serverManager.startServer();
    }, 'startCommand')
  );

  const stopCommand = vscode.commands.registerCommand('vscode-psp.stop',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Stop server command invoked');
      await serverManager.stopServer();
    }, 'stopCommand')
  );

  const restartCommand = vscode.commands.registerCommand('vscode-psp.restart',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Restart server command invoked');
      await serverManager.restartServer();
    }, 'restartCommand')
  );

  const checkStatusCommand = vscode.commands.registerCommand('vscode-psp.checkServerStatus',
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

  const runCommand = vscode.commands.registerCommand('vscode-psp.run',
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

      // Save the file before executing
      if (editor.document.isDirty) {
        await editor.document.save();
      }

      // Clear output if configured
      if (ConfigurationManager.getLogClearOnRun()) {
        outputChannel.clear();
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
          vscode.window.showErrorMessage(`PSP: Script execution failed (exit code ${result.exitCode})`);
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

      Logger.info('Script executed and output file read successfully');
      vscode.window.showInformationMessage('PSP: Script executed successfully');
    }, 'runCommand')
  );

  // Add commands to subscriptions for proper cleanup
  context.subscriptions.push(startCommand, stopCommand, restartCommand, checkStatusCommand, runCommand);
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {
  Logger.info('VSCode PSP extension is now deactivated');

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
}
