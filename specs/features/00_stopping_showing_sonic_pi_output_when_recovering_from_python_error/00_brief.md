# Feature: Auto-Suppress Sonic Pi Output on Python Errors

## Problem Statement

When Sonic Pi is playing music, the output channel displays continuous real-time logs from Sonic Pi (this is intended behavior).

**Issue:** When there's an error in a `.live.py` file, the error message gets immediately buried by the flood of Sonic Pi log output, making troubleshooting difficult.

## Requirements

- **Automatic behavior:** When a Python error occurs, Sonic Pi log output should be automatically suppressed
- **Auto-recovery:** After a successful run, normal Sonic Pi logging should resume automatically
- **No manual toggling:** The user should not need to remember to toggle anything manually

## Proposed Solution

Implement an automatic log suppression mechanism that:

1. Detects when a Python error occurs during script execution
2. Temporarily suppresses Sonic Pi server log output (`/log/info` and `/log/multi_message` messages)
3. Allows error messages to remain visible in the output channel
4. Automatically restores normal logging after a successful run

## Implementation Notes

- The suppression should be temporary and context-aware
- Error messages (syntax errors, runtime errors) should still be visible
- The system should automatically return to normal operation after successful code execution
