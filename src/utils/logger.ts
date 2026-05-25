import * as vscode from 'vscode';

/**
 * Logger utility for consistent logging across the extension
 */
export class Logger {
  private static outputChannel: vscode.OutputChannel | null = null;

  /**
   * Initialize the logger with an output channel
   */
  static initialize(outputChannel: vscode.OutputChannel): void {
    Logger.outputChannel = outputChannel;
  }

  /**
   * Log an info message
   */
  static info(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[INFO ${timestamp}] ${message}`;
    console.log(logMessage);
    if (Logger.outputChannel) {
      Logger.outputChannel.appendLine(logMessage);
    }
  }

  /**
   * Log a debug message
   */
  static debug(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[DEBUG ${timestamp}] ${message}`;
    console.log(logMessage);
    if (Logger.outputChannel) {
      Logger.outputChannel.appendLine(logMessage);
    }
  }

  /**
   * Log a warning message
   */
  static warn(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[WARN ${timestamp}] ${message}`;
    console.warn(logMessage);
    if (Logger.outputChannel) {
      Logger.outputChannel.appendLine(logMessage);
    }
  }

  /**
   * Log an error message
   */
  static error(message: string, error?: Error): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[ERROR ${timestamp}] ${message}`;
    const errorDetails = error ? `\n${error.stack || error.message}` : '';
    console.error(logMessage + errorDetails);
    if (Logger.outputChannel) {
      Logger.outputChannel.appendLine(logMessage + errorDetails);
    }
  }

  /**
   * Show the output channel
   */
  static show(): void {
    if (Logger.outputChannel) {
      Logger.outputChannel.show();
    }
  }

  /**
   * Dispose the logger
   */
  static dispose(): void {
    Logger.outputChannel = null;
  }
}
