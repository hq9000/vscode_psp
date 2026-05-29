import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ConfigurationManager } from '../config/configurationManager';
import { ServerManager } from '../server/serverManager';

/**
 * File handler for managing .live.py files
 */
export class FileHandler {
  private static activeFiles: Set<string> = new Set();
  private static fileWatchers: Map<string, vscode.FileSystemWatcher> = new Map();

  /**
   * Initialize file handler with event listeners
   */
  static initialize(context: vscode.ExtensionContext): void {
    Logger.info('Initializing file handler');

    // Listen for text document open events
    const openDisposable = vscode.workspace.onDidOpenTextDocument((document) => {
      this.handleFileOpen(document);
    });

    // Listen for text document close events
    const closeDisposable = vscode.workspace.onDidCloseTextDocument((document) => {
      this.handleFileClose(document);
    });

    // Check currently open documents
    vscode.workspace.textDocuments.forEach((document) => {
      if (this.isLivePyFile(document)) {
        this.handleFileOpen(document);
      }
    });

    context.subscriptions.push(openDisposable, closeDisposable);
  }

  /**
   * Check if a document is a .live.py file
   */
  static isLivePyFile(document: vscode.TextDocument): boolean {
    return document.fileName.endsWith('.live.py');
  }

  /**
   * Handle file open event
   */
  private static handleFileOpen(document: vscode.TextDocument): void {
    if (!this.isLivePyFile(document)) {
      return;
    }

    const filePath = document.fileName;
    
    if (!this.activeFiles.has(filePath)) {
      Logger.info(`Opened .live.py file: ${filePath}`);
      this.activeFiles.add(filePath);
      
      // Set up file watcher for this file
      this.setupFileWatcher(filePath);
      
      // Notify about file open (can be used to trigger server start)
      // Using void to intentionally ignore the promise
      void this.onFileActivated(filePath);
    }
  }

  /**
   * Handle file close event
   */
  private static handleFileClose(document: vscode.TextDocument): void {
    if (!this.isLivePyFile(document)) {
      return;
    }

    const filePath = document.fileName;
    
    if (this.activeFiles.has(filePath)) {
      Logger.info(`Closed .live.py file: ${filePath}`);
      this.activeFiles.delete(filePath);
      
      // Remove file watcher
      this.removeFileWatcher(filePath);
      
      // Notify about file close
      this.onFileDeactivated(filePath);
    }
  }

  /**
   * Set up a file watcher for a specific file
   */
  private static setupFileWatcher(filePath: string): void {
    // Create a file watcher for this specific file
    const watcher = vscode.workspace.createFileSystemWatcher(filePath);
    
    watcher.onDidChange(() => {
      Logger.debug(`File changed: ${filePath}`);
    });

    watcher.onDidDelete(() => {
      Logger.info(`File deleted: ${filePath}`);
      this.activeFiles.delete(filePath);
      this.removeFileWatcher(filePath);
    });

    this.fileWatchers.set(filePath, watcher);
  }

  /**
   * Remove file watcher for a specific file
   */
  private static removeFileWatcher(filePath: string): void {
    const watcher = this.fileWatchers.get(filePath);
    if (watcher) {
      watcher.dispose();
      this.fileWatchers.delete(filePath);
    }
  }

  /**
   * Called when a .live.py file is activated
   * This can be used to trigger server startup
   */
  private static async onFileActivated(filePath: string): Promise<void> {
    Logger.info(`File activated: ${filePath}`);
    
    // Check if auto-start is enabled
    const autoStart = ConfigurationManager.getAutoStartServer();
    if (!autoStart) {
      Logger.info('Auto-start is disabled, skipping server start');
      return;
    }
    
    // Get server manager instance
    const serverManager = ServerManager.getInstance();
    
    // Check if server is already running
    if (serverManager.isRunning()) {
      Logger.info('Server is already running');
      return;
    }
    
    // Start the server
    Logger.info('Auto-starting Sonic Pi server');
    await serverManager.startServer();
  }

  /**
   * Called when a .live.py file is deactivated
   * This can be used to trigger server shutdown if no more files are active
   */
  private static onFileDeactivated(filePath: string): void {
    Logger.info(`File deactivated: ${filePath}`);
    
    if (this.activeFiles.size === 0) {
      Logger.info('No more .live.py files are active');
      // TODO: Potentially stop server if configured (Phase 3)
    }
  }

  /**
   * Get the number of active .live.py files
   */
  static getActiveFileCount(): number {
    return this.activeFiles.size;
  }

  /**
   * Get all active .live.py file paths
   */
  static getActiveFiles(): string[] {
    return Array.from(this.activeFiles);
  }

  /**
   * Dispose all file watchers
   */
  static dispose(): void {
    Logger.info('Disposing file handler');
    this.fileWatchers.forEach((watcher) => watcher.dispose());
    this.fileWatchers.clear();
    this.activeFiles.clear();
  }
}
