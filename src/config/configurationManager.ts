import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

/**
 * Configuration manager for accessing and validating extension settings
 */
export class ConfigurationManager {
  private static readonly configSection = 'vscode-psp';

  /**
   * Get the Sonic Pi root directory with platform-specific defaults
   */
  static getSonicPiRootDirectory(): string {
    const config = vscode.workspace.getConfiguration(this.configSection);
    let rootDir = config.get<string>('sonicPiRootDirectory', '');

    // If not set, use platform-specific defaults
    if (!rootDir) {
      rootDir = this.getDefaultSonicPiPath();
    }

    return rootDir;
  }

  /**
   * Get platform-specific default Sonic Pi installation path
   */
  private static getDefaultSonicPiPath(): string {
    const platform = os.platform();

    switch (platform) {
      case 'win32':
        return 'C:\\Program Files\\Sonic Pi';
      case 'darwin':
        return '/Applications/Sonic Pi.app';
      case 'linux':
        // Try common Linux installation paths
        return '/opt/sonic-pi';
      default:
        return '';
    }
  }

  /**
   * Get auto-start server setting
   */
  static getAutoStartServer(): boolean {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get<boolean>('autoStartServer', true);
  }

  /**
   * Get output file path with variable substitution
   */
  static getOutputFile(): string {
    const config = vscode.workspace.getConfiguration(this.configSection);
    let outputFile = config.get<string>('outputFile', '${workspaceFolder}/last.rb');

    // Substitute workspace folder variable
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceFolder = workspaceFolders[0].uri.fsPath;
      outputFile = outputFile.replace('${workspaceFolder}', workspaceFolder);
    }

    return outputFile;
  }

  /**
   * Get server port
   */
  static getServerPort(): number {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get<number>('serverPort', 4557);
  }

  /**
   * Get log level
   */
  static getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get<'debug' | 'info' | 'warn' | 'error'>('logLevel', 'info');
  }

  /**
   * Get log autoscroll setting
   */
  static getLogAutoscroll(): boolean {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get<boolean>('logAutoscroll', true);
  }

  /**
   * Get log clear on run setting
   */
  static getLogClearOnRun(): boolean {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get<boolean>('logClearOnRun', true);
  }

  /**
   * Get flash background color
   */
  static getFlashBackgroundColor(): string {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get<string>('flashBackgroundColor', 'rgba(255,20,147,1.0)');
  }

  /**
   * Get flash text color
   */
  static getFlashTextColor(): string {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get<string>('flashTextColor', 'rgba(255,255,255,1.0)');
  }

  /**
   * Validate configuration and return validation errors
   */
  static validateConfiguration(): string[] {
    const errors: string[] = [];

    // Validate server port
    const port = this.getServerPort();
    if (port < 1 || port > 65535) {
      errors.push(`Invalid server port: ${port}. Must be between 1 and 65535.`);
    }

    // Validate log level
    const logLevel = this.getLogLevel();
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(logLevel)) {
      errors.push(`Invalid log level: ${logLevel}. Must be one of: ${validLogLevels.join(', ')}.`);
    }

    // Validate color formats (basic check)
    const bgColor = this.getFlashBackgroundColor();
    const textColor = this.getFlashTextColor();
    if (!this.isValidColor(bgColor)) {
      errors.push(`Invalid flash background color: ${bgColor}`);
    }
    if (!this.isValidColor(textColor)) {
      errors.push(`Invalid flash text color: ${textColor}`);
    }

    return errors;
  }

  /**
   * Basic color format validation
   */
  private static isValidColor(color: string): boolean {
    // Simple validation for common color formats
    const hexRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;
    const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
    const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
    
    return hexRegex.test(color) || rgbRegex.test(color) || rgbaRegex.test(color);
  }

  /**
   * Update a configuration value
   */
  static async updateConfiguration(key: string, value: any, isGlobal = false): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    await config.update(key, value, isGlobal ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace);
  }
}
