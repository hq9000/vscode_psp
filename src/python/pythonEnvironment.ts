import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import { Logger } from '../utils/logger';

/**
 * Minimum required Python version
 */
const MIN_PYTHON_VERSION = { major: 3, minor: 8 };

/**
 * Manages Python environment detection and validation.
 * Integrates with the VSCode Python extension API and supports manual path configuration.
 */
export class PythonEnvironment {
  private pythonPath: string | null = null;

  /**
   * Detect and return the active Python interpreter path.
   * Priority:
   * 1. Manual configuration (vscode-psp.pythonPath)
   * 2. VSCode Python extension active interpreter
   * 3. System Python from PATH
   */
  async detectPythonPath(): Promise<string | null> {
    // 1. Check manual configuration
    const configPath = this.getConfiguredPythonPath();
    if (configPath) {
      Logger.info(`Using manually configured Python path: ${configPath}`);
      this.pythonPath = configPath;
      return this.pythonPath;
    }

    // 2. Try VSCode Python extension
    const extensionPath = await this.getPythonFromExtension();
    if (extensionPath) {
      Logger.info(`Using Python from VSCode Python extension: ${extensionPath}`);
      this.pythonPath = extensionPath;
      return this.pythonPath;
    }

    // 3. Fall back to system Python
    const systemPath = await this.getSystemPython();
    if (systemPath) {
      Logger.info(`Using system Python: ${systemPath}`);
      this.pythonPath = systemPath;
      return this.pythonPath;
    }

    Logger.warn('No Python interpreter found');
    this.pythonPath = null;
    return null;
  }

  /**
   * Get the currently detected Python path (without re-detection)
   */
  getPythonPath(): string | null {
    return this.pythonPath;
  }

  /**
   * Validate the detected Python version meets minimum requirements (3.8+)
   * Returns the version string if valid, or null if invalid/unavailable
   */
  async validatePythonVersion(pythonPath: string): Promise<string | null> {
    try {
      const version = await this.getPythonVersion(pythonPath);
      if (!version) {
        Logger.error('Could not determine Python version');
        return null;
      }

      const { major, minor } = version;

      if (major < MIN_PYTHON_VERSION.major ||
          (major === MIN_PYTHON_VERSION.major && minor < MIN_PYTHON_VERSION.minor)) {
        const versionStr = `${major}.${minor}`;
        Logger.warn(
          `Python version ${versionStr} is too old. Minimum required: ${MIN_PYTHON_VERSION.major}.${MIN_PYTHON_VERSION.minor}`
        );
        vscode.window.showWarningMessage(
          `Python version ${versionStr} detected. VSCode PSP requires Python ${MIN_PYTHON_VERSION.major}.${MIN_PYTHON_VERSION.minor}+.`
        );
        return null;
      }

      const versionStr = `${major}.${minor}`;
      Logger.info(`Python version ${versionStr} validated successfully`);
      return versionStr;
    } catch (error) {
      Logger.error('Failed to validate Python version', error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Get the manually configured Python path from extension settings
   */
  private getConfiguredPythonPath(): string | null {
    const config = vscode.workspace.getConfiguration('vscode-psp');
    const pythonPath = config.get<string>('pythonPath', '');
    return pythonPath || null;
  }

  /**
   * Get Python interpreter path from the VSCode Python extension
   */
  private async getPythonFromExtension(): Promise<string | null> {
    try {
      const pythonExtension = vscode.extensions.getExtension('ms-python.python');
      if (!pythonExtension) {
        Logger.debug('VSCode Python extension not installed');
        return null;
      }

      if (!pythonExtension.isActive) {
        await pythonExtension.activate();
      }

      const pythonApi = pythonExtension.exports;

      // Try the newer API (Python extension >= 2023.x)
      if (pythonApi?.environments) {
        const activeEnv = pythonApi.environments.getActiveEnvironmentPath?.();
        if (activeEnv?.path) {
          return activeEnv.path;
        }
      }

      // Try the settings-based approach
      const pythonConfig = vscode.workspace.getConfiguration('python');
      const defaultInterpreterPath = pythonConfig.get<string>('defaultInterpreterPath');
      if (defaultInterpreterPath && defaultInterpreterPath !== 'python') {
        return defaultInterpreterPath;
      }

      return null;
    } catch (error) {
      Logger.debug('Could not get Python from VSCode extension: ' +
        (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  /**
   * Find system Python from PATH
   */
  private async getSystemPython(): Promise<string | null> {
    const candidates = ['python3', 'python'];

    for (const candidate of candidates) {
      const resolved = await this.resolveExecutable(candidate);
      if (resolved) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Check if an executable exists and is accessible
   */
  private resolveExecutable(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = childProcess.spawn(command, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });
  }

  /**
   * Get Python version from interpreter
   */
  private getPythonVersion(pythonPath: string): Promise<{ major: number; minor: number } | null> {
    return new Promise((resolve) => {
      const proc = childProcess.spawn(pythonPath, [
        '-c', 'import sys; print(sys.version_info.major, sys.version_info.minor)'
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });

      proc.on('error', () => resolve(null));
      proc.on('close', (code) => {
        if (code !== 0) {
          resolve(null);
          return;
        }

        const parts = stdout.trim().split(' ');
        if (parts.length >= 2) {
          const major = parseInt(parts[0], 10);
          const minor = parseInt(parts[1], 10);
          if (!isNaN(major) && !isNaN(minor)) {
            resolve({ major, minor });
            return;
          }
        }
        resolve(null);
      });
    });
  }
}
