import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { ErrorHandler } from './utils/errorHandler';
import { ConfigurationManager } from './config/configurationManager';
import { FileHandler } from './files/fileHandler';

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
  
  // Initialize file handler
  FileHandler.initialize(context);

  // Register commands
  const startCommand = vscode.commands.registerCommand('vscode-psp.start', 
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Start server command invoked');
      vscode.window.showInformationMessage('PSP: Starting Sonic Pi Server (not yet implemented)');
    }, 'startCommand')
  );

  const stopCommand = vscode.commands.registerCommand('vscode-psp.stop',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Stop server command invoked');
      vscode.window.showInformationMessage('PSP: Stopping Sonic Pi Server (not yet implemented)');
    }, 'stopCommand')
  );

  const runCommand = vscode.commands.registerCommand('vscode-psp.run',
    ErrorHandler.wrapAsync(async () => {
      Logger.info('Run current file command invoked');
      vscode.window.showInformationMessage('PSP: Running current file (not yet implemented)');
    }, 'runCommand')
  );

  // Add commands to subscriptions for proper cleanup
  context.subscriptions.push(startCommand, stopCommand, runCommand);
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {
  Logger.info('VSCode PSP extension is now deactivated');
  
  // Dispose file handler
  FileHandler.dispose();
  
  // Dispose logger
  Logger.dispose();
  
  if (outputChannel) {
    outputChannel.dispose();
  }
}
