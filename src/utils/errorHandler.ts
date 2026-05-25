import * as vscode from 'vscode';
import { Logger } from './logger';

/**
 * Error handling utility for consistent error handling across the extension
 */
export class ErrorHandler {
  /**
   * Handle an error with logging and user notification
   */
  static handle(error: Error, context: string, showNotification = true): void {
    const message = `Error in ${context}: ${error.message}`;
    Logger.error(message, error);

    if (showNotification) {
      vscode.window.showErrorMessage(`VSCode PSP: ${message}`);
    }
  }

  /**
   * Handle an error with a custom message
   */
  static handleWithMessage(error: Error, userMessage: string, context: string, showNotification = true): void {
    Logger.error(`Error in ${context}: ${error.message}`, error);

    if (showNotification) {
      vscode.window.showErrorMessage(`VSCode PSP: ${userMessage}`);
    }
  }

  /**
   * Create a safe wrapper for async functions that handles errors
   */
  static wrapAsync<T>(
    fn: (...args: any[]) => Promise<T>,
    context: string,
    showNotification = true
  ): (...args: any[]) => Promise<T | undefined> {
    return async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        ErrorHandler.handle(error as Error, context, showNotification);
        return undefined;
      }
    };
  }

  /**
   * Create a safe wrapper for synchronous functions that handles errors
   */
  static wrap<T>(
    fn: (...args: any[]) => T,
    context: string,
    showNotification = true
  ): (...args: any[]) => T | undefined {
    return (...args: any[]) => {
      try {
        return fn(...args);
      } catch (error) {
        ErrorHandler.handle(error as Error, context, showNotification);
        return undefined;
      }
    };
  }
}
