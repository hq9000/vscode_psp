# Feature 00: Auto-Suppress Sonic Pi Output on Python Errors

## Overview

This document outlines the implementation plan for automatically suppressing Sonic Pi server log output when Python script execution fails, and automatically restoring it after successful execution.

## Problem Summary

When Sonic Pi is playing music, the output channel displays continuous real-time logs from Sonic Pi. When a Python error occurs in a `.live.py` file, the error message gets buried by the flood of Sonic Pi log output, making troubleshooting difficult.

## Solution Overview

Implement an automatic log suppression mechanism that:

1. Detects when a Python error occurs during script execution
2. Temporarily suppresses Sonic Pi server log output (all log messages)
3. Keeps error messages (`/error`, `/syntax_error`) visible in the output channel
4. Keeps cues output (`/incoming/osc`) unaffected
5. Automatically restores normal logging after a successful run

## Architecture Changes

### 1. ServerMessageHandler Modifications

**File**: `src/communication/serverMessageHandler.ts`

#### Additions:

- Add `suppressLogs` property (boolean) to control log suppression state
- Add `setLogSuppression()` method to enable/disable log suppression
- Modify `handleLogInfo()` to check suppression flag before appending to output channel
- Modify `handleMultiMessage()` to check suppression flag before appending to output channel
- Keep `/error` and `/syntax_error` handlers always visible (no suppression)
- Keep `/incoming/osc` handler always visible (no suppression)

#### Changes:

```typescript
export class ServerMessageHandler {
  private suppressLogs: boolean = false;

  // New method
  setLogSuppression(suppress: boolean): void {
    this.suppressLogs = suppress;
    Logger.debug(`Log suppression ${suppress ? 'enabled' : 'disabled'}`);
  }

  // Modified method - suppresses logs when flag is true
  private handleLogInfo(message: { args: any }): void {
    try {
      const logMessage = message.args[1];
      Logger.debug(`[Server] ${logMessage}`);

      // Skip appending if log suppression is enabled
      if (this.suppressLogs) {
        return;
      }

      if (this.logOutputChannel) {
        this.logOutputChannel.appendLine(logMessage);
      }
    } catch (error) {
      Logger.warn(
        `Error handling /log/info: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Modified method - suppresses logs when flag is true
  private handleMultiMessage(message: { args: any }): void {
    try {
      // ... existing code ...

      // Skip appending if log suppression is enabled
      if (this.suppressLogs) {
        return;
      }

      if (this.logOutputChannel) {
        // ... existing code ...
      }
    } catch (error) {
      Logger.warn(
        `Error handling /log/multi_message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Keep these handlers always visible (no suppression)
  private handleSyntaxError(message: { args: any }): void {
    // ... existing code - always show syntax errors
  }

  private handleError(message: any): void {
    // ... existing code - always show errors
  }

  private handleIncomingOsc(message: { args: any }): void {
    // ... existing code - always show cues
  }
}
```

### 2. CommunicationManager Modifications

**File**: `src/communication/communicationManager.ts`

#### Additions:

- Add `setLogSuppression()` method to delegate to ServerMessageHandler

#### Changes:

```typescript
export class CommunicationManager {
  // New method
  setLogSuppression(suppress: boolean): void {
    if (this.serverMessageHandler) {
      this.serverMessageHandler.setLogSuppression(suppress);
    }
  }
}
```

### 3. Extension Modifications

**File**: `src/extension.ts`

#### Additions:

- Track log suppression state
- Modify run command to suppress logs during execution and restore based on result

#### Changes:

```typescript
// Add state tracking
let isLogSuppressionActive: boolean = false;

// In runCommand, before script execution:
// Suppress logs before execution
communicationManager.setLogSuppression(true);
isLogSuppressionActive = true;

// In runCommand, after script execution (in both success and error paths):
// Restore logs after execution
if (isLogSuppressionActive) {
  communicationManager.setLogSuppression(false);
  isLogSuppressionActive = false;
}
```

## Implementation Tasks

### Phase 1: Core Log Suppression Mechanism

- [ ] **Task 1.1**: Add `suppressLogs` property to `ServerMessageHandler` class
- [ ] **Task 1.2**: Implement `setLogSuppression()` method in `ServerMessageHandler`
- [ ] **Task 1.3**: Modify `handleLogInfo()` to respect suppression flag
- [ ] **Task 1.4**: Modify `handleMultiMessage()` to respect suppression flag
- [ ] **Task 1.5**: Verify `/error` and `/syntax_error` handlers always show messages (no suppression)
- [ ] **Task 1.6**: Verify `/incoming/osc` handler always shows messages (no suppression)
- [ ] **Task 1.7**: Add `setLogSuppression()` method to `CommunicationManager`
- [ ] **Task 1.8**: Add unit tests for log suppression functionality

### Phase 2: Integration with Python Execution

- [ ] **Task 2.1**: Add log suppression state tracking to `extension.ts`
- [ ] **Task 2.2**: Modify run command to suppress logs before Python execution
- [ ] **Task 2.3**: Ensure logs are restored after successful execution
- [ ] **Task 2.4**: Ensure logs are restored after failed execution
- [ ] **Task 2.5**: Add error handling to guarantee log restoration even if suppression toggle fails

### Phase 3: Testing and Validation

- [ ] **Task 3.1**: Test log suppression during Python error scenarios
- [ ] **Task 3.2**: Test automatic log restoration after successful execution
- [ ] **Task 3.3**: Test that error messages (/error, /syntax_error) are still visible during suppression
- [ ] **Task 3.4**: Test that cues output (/incoming/osc) is not affected by log suppression
- [ ] **Task 3.5**: Test multiple consecutive runs with mixed success/failure
- [ ] **Task 3.6**: Test that all log types (/log/info, /log/multi_message) are suppressed during errors

## Implementation Notes

### Design Decisions

1. **Suppression Scope**: All server log messages (`/log/info`, `/log/multi_message`) are suppressed during Python execution. Error messages (`/error`, `/syntax_error`) and cues (`/incoming/osc`) are always shown to ensure users can see what went wrong and track OSC cues.

2. **State Management**: Log suppression state is tracked globally in the extension. This ensures that even if multiple executions are queued, the suppression state is properly managed.

3. **Automatic Recovery**: Logs are automatically restored after every run (whether successful or failed). This ensures the system returns to normal operation without user intervention.

4. **Thread Safety**: The `ServerMessageHandler` processes OSC messages on a single thread (via the OSC library), so no additional synchronization is needed for the `suppressLogs` flag.

5. **Selective Suppression**: Only informational logs are suppressed. Critical error messages and cues are always visible to ensure users have all necessary information for debugging.

### Edge Cases to Handle

1. **Concurrent Executions**: If the execution queue is implemented in the future, ensure log suppression is properly managed across queued executions.

2. **Server Restart**: When the server is restarted, log suppression should be reset to disabled (normal operation).

3. **Extension Deactivation**: Ensure log suppression is disabled when the extension is deactivated.

4. **Multiple Output Channels**: The cues output channel should not be affected by log suppression.

5. **Error Messages**: Error messages (`/error`, `/syntax_error`) should always be visible, even during log suppression.

6. **Cues Output**: OSC cues (`/incoming/osc`) should always be visible, even during log suppression.

### Testing Strategy

1. **Unit Tests**: Test `ServerMessageHandler` with and without log suppression enabled
2. **Integration Tests**: Test the full flow of Python execution with log suppression
3. **Manual Testing**: Verify that:
   - Sonic Pi logs are suppressed during Python errors
   - Error messages are still visible
   - Logs resume after successful execution
   - Cues output remains unaffected

## Dependencies

This feature does not introduce any new dependencies. It uses existing:

- `osc-js` for OSC communication
- VSCode extension API for output channels
- Existing `ServerMessageHandler` and `CommunicationManager` classes

## Backward Compatibility

This feature is fully backward compatible:

- No changes to existing APIs
- No changes to configuration settings
- No changes to user interface
- Existing functionality remains unchanged when log suppression is not triggered
