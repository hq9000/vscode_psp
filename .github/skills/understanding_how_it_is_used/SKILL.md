---
name: vscode-psp-big-picture-understanding
description: >
  Provides comprehensive understanding of the main use case for VSCode PSP (Python Sonic Pi).
---

# Understand the Big Picture - VSCode PSP Extension

## What This Project Does

The VSCode PSP extension is a **live music coding environment** that bridges Python programming with Sonic Pi sound synthesis. Musicians and developers write Python code (`.live.py` files) that generates Sonic Pi instructions, enabling real-time, code-driven music creation directly within VS Code.

### Core User Workflow

1. **Open** a `.live.py` file (Python file with sound generation logic)
2. **Press Alt+R** → Executes the Python script, which writes to `last.rb`
3. **Extension reads** `last.rb` and sends the Sonic Pi/Ruby code to the server
4. **Sound plays** in real-time through Sonic Pi
5. **Press Alt+S** → Stops playback

## System Architecture

### Four Main Components

```
VSCode Extension ──► Python Runtime ──► last.rb ──► Sonic Pi Server
    (Client)         (Executor)        (Bridge)     (Sound Engine)
```

#### 1. User interaction

- User writes Python code in `.live.py` files
- Uses keyboard shortcuts to control execution:
  - Alt+R to run, Alt+S to stop

Normally user does not stop before rerunning, instead they press Alt+R again, which will send the updated track to Sonic Pi which will made adjustments without stopping the music.

After pressing Alt+S, there willl be silence until user presses Alt+R again.

#### 2. **VSCode Extension (Client)**

- Handles `.live.py` file association
- Manages keyboard shortcuts (`Alt+R`, `Alt+S`)
- **Automatically starts Sonic Pi server** when `.live.py` file is opened
- Provides explicit command to stop the server
- Executes Python scripts in the active virtual environment
- Reads `last.rb` and sends code to Sonic Pi via OSC
