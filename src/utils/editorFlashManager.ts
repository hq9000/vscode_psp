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
      // For empty documents, skip the flash effect as there's nothing to highlight
      if (editor.document.lineCount === 0 || (editor.document.lineCount === 1 && editor.document.lineAt(0).text.length === 0)) {
        Logger.debug('Skipping flash effect for empty document');
        flashDecoration.dispose();
        return;
      }

      // Use lineCount to efficiently get document end without loading all text
      const endPosition = editor.document.lineCount > 0
        ? editor.document.lineAt(editor.document.lineCount - 1).range.end
        : new vscode.Position(0, 0);
      const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        endPosition
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
          flashDecoration.dispose();
        } else {
          Logger.debug('Active editor changed, skipping flash effect cleanup');
          // Still dispose the decoration to avoid memory leaks
          flashDecoration.dispose();
        }
      }, EditorFlashManager.flashDurationMs);

    } catch (error) {
      Logger.error('Failed to apply flash effect', error instanceof Error ? error : undefined);
    }
  }
}
