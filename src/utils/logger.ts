import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/configurationManager';

/**
 * Log level enum with hierarchy: error > warn > info > debug
 */
enum LogLevel {
  debug = 0,
  info = 1,
  warn = 2,
  error = 3
}

/**
 * Logger utility for consistent logging across the extension
 */
export class Logger {
  private static outputChannel: vscode.OutputChannel | null = null;
  private static currentLogLevel: LogLevel = LogLevel.info;

  /**
   * Initialize the logger with an output channel
   */
  static initialize(outputChannel: vscode.OutputChannel): void {
    Logger.outputChannel = outputChannel;
    Logger.updateLogLevel();
  }

  /**
   * Update log level from configuration
   */
  private static updateLogLevel(): void {
    const configLevel = ConfigurationManager.getLogLevel();
    const logLevelKey = configLevel as keyof typeof LogLevel;
    
    // Validate that the config level is a valid LogLevel
    if (logLevelKey in LogLevel) {
      Logger.currentLogLevel = LogLevel[logLevelKey];
    } else {
      // Fall back to 'info' if invalid configuration
      Logger.currentLogLevel = LogLevel.info;
      Logger.warn(`Invalid log level configuration: ${configLevel}, falling back to 'info'`);
    }
  }

  /**
   * Check if a message should be logged based on current log level
   */
  private static shouldLog(level: LogLevel): boolean {
    return level >= Logger.currentLogLevel;
  }

  /**
   * Log an info message
   */
  static info(message: string): void {
    if (!Logger.shouldLog(LogLevel.info)) {
      return;
    }
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
    if (!Logger.shouldLog(LogLevel.debug)) {
      return;
    }
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
    if (!Logger.shouldLog(LogLevel.warn)) {
      return;
    }
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
    if (!Logger.shouldLog(LogLevel.error)) {
      return;
    }
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
   * Note: The output channel itself is disposed by extension.ts which owns it.
   * This method just clears the internal reference.
   */
  static dispose(): void {
    Logger.outputChannel = null;
  }
}
