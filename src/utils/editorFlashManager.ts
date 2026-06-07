import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/configurationManager';
import { Logger } from './logger';

/**
 * EditorFlashManager handles visual feedback effects for code execution
 * Applies a flash effect (background and text color change) to the editor when code runs
 */
export class EditorFlashManager {
  private static readonly flashDurationMs = 150;

  /**
   * Create a flash effect on the active text editor
   * Flash the entire editor with configured colors for visual feedback
   */
  static async flashEditor(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        Logger.debug('No active editor to flash');
        return;
      }

      // Get configured colors for flash effect
      const backgroundColor = ConfigurationManager.getFlashBackgroundColor();
      const textColor = ConfigurationManager.getFlashTextColor();

      // Create decorations for the flash effect
      const flashDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: backgroundColor,
        color: textColor,
        isWholeLine: true,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
      });

      // Apply decoration to entire document content
      const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length)
      );

      editor.setDecorations(flashDecoration, [fullRange]);

      Logger.debug(`Flash effect applied: bg=${backgroundColor}, text=${textColor}`);

      // Remove the decoration after flash duration
      // Keep a reference to verify the editor is still active
      const activeEditor = editor;
      setTimeout(() => {
        // Verify the editor is still valid and active before removing decorations
        if (vscode.window.activeTextEditor === activeEditor) {
          activeEditor.setDecorations(flashDecoration, []);
          Logger.debug('Flash effect removed');
        } else {
          Logger.debug('Active editor changed, skipping flash effect cleanup');
        }
        flashDecoration.dispose();
      }, EditorFlashManager.flashDurationMs);

    } catch (error) {
      Logger.error('Failed to apply flash effect', error instanceof Error ? error : undefined);
    }
  }
}
