import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { PythonEnvironment } from './pythonEnvironment';

/**
 * Default execution timeout in milliseconds (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Result of a Python script execution
 */
export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

/**
 * Executes .live.py scripts using the detected Python interpreter.
 * Implements execution queue to prevent multiple simultaneous runs.
 */
export class PythonExecutor {
  private pythonEnvironment: PythonEnvironment;
  private isExecuting = false;
  private executionQueue: Array<() => void> = [];

  constructor(pythonEnvironment: PythonEnvironment) {
    this.pythonEnvironment = pythonEnvironment;
  }

  /**
   * Execute a .live.py script file.
   * If another execution is in progress, this call waits in the queue.
   */
  async executeScript(scriptPath: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<ExecutionResult> {
    // Wait in queue if another execution is in progress
    if (this.isExecuting) {
      Logger.info('Execution in progress, queuing request');
      await this.waitInQueue();
    }

    this.isExecuting = true;

    try {
      const pythonPath = this.pythonEnvironment.getPythonPath();
      if (!pythonPath) {
        const errorMsg = 'No Python interpreter available. Please configure a Python path.';
        Logger.error(errorMsg);
        return {
          success: false,
          stdout: '',
          stderr: errorMsg,
          exitCode: null,
          timedOut: false
        };
      }

      Logger.info(`Executing script: ${scriptPath}`);
      const result = await this.runPythonProcess(pythonPath, scriptPath, timeoutMs);

      if (result.success) {
        Logger.info('Script execution completed successfully');
      } else if (result.timedOut) {
        Logger.warn(`Script execution timed out after ${timeoutMs}ms`);
      } else {
        Logger.warn(`Script execution failed with exit code ${result.exitCode}`);
      }

      return result;
    } finally {
      this.isExecuting = false;
      this.dequeueNext();
    }
  }

  /**
   * Check if an execution is currently in progress
   */
  isRunning(): boolean {
    return this.isExecuting;
  }

  /**
   * Run the Python process and capture output
   */
  private runPythonProcess(
    pythonPath: string,
    scriptPath: string,
    timeoutMs: number
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const workspaceFolder = this.getWorkspaceRoot();
      const cwd = workspaceFolder || path.dirname(scriptPath);

      const proc = childProcess.spawn(pythonPath, [scriptPath], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          PYTHONUNBUFFERED: '1'
        }
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Set up timeout
      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        // Force kill after 2 seconds if SIGTERM didn't work
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 2000);
      }, timeoutMs);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        Logger.error('Python process error', error);
        resolve({
          success: false,
          stdout,
          stderr: error.message,
          exitCode: null,
          timedOut: false
        });
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          success: code === 0 && !timedOut,
          stdout,
          stderr,
          exitCode: code,
          timedOut
        });
      });
    });
  }

  /**
   * Get the workspace root directory
   */
  private getWorkspaceRoot(): string | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      return workspaceFolders[0].uri.fsPath;
    }
    return null;
  }

  /**
   * Wait for a spot in the execution queue
   */
  private waitInQueue(): Promise<void> {
    return new Promise((resolve) => {
      this.executionQueue.push(resolve);
    });
  }

  /**
   * Release the next item in the execution queue
   */
  private dequeueNext(): void {
    const next = this.executionQueue.shift();
    if (next) {
      next();
    }
  }
}
