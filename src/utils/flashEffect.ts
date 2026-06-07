import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/configurationManager';
import { Logger } from './logger';

/**
 * Flash effect utility for visual feedback
 */
export class FlashEffect {
  private static decorationType: vscode.TextEditorDecorationType | null = null;

  /**
   * Display a flash effect on the editor
   */
  static async showFlash(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    try {
      // Get flash colors from configuration
      const bgColor = ConfigurationManager.getFlashBackgroundColor();
      const textColor = ConfigurationManager.getFlashTextColor();

      // Create decoration type if not exists
      if (!this.decorationType) {
        this.decorationType = vscode.window.createTextEditorDecorationType({
          backgroundColor: bgColor,
          color: textColor,
          isWholeLine: true,
        });
      }

      // Apply decoration to entire document
      const range = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length)
      );

      editor.setDecorations(this.decorationType, [range]);

      // Remove decoration after 200ms
      setTimeout(() => {
        if (this.decorationType) {
          editor.setDecorations(this.decorationType, []);
        }
      }, 200);
    } catch (error) {
      Logger.debug('Flash effect display failed silently');
    }
  }

  /**
   * Dispose of the decoration type
   */
  static dispose(): void {
    if (this.decorationType) {
      this.decorationType.dispose();
      this.decorationType = null;
    }
  }
}
