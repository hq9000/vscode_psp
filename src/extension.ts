import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { ErrorHandler } from './utils/errorHandler';
import { ConfigurationManager } from './config/configurationManager';
import { FileHandler } from './files/fileHandler';
import { ServerManager } from './server/serverManager';

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
      vscode.window.showInformationMessage('PSP: Running current file (not yet implemented)');
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
