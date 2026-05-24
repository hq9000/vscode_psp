# VSCode PSP Extension - Technical Architecture Description

## 1. System Overview

The VSCode PSP (Python Sonic Pi) extension is a live music coding environment integrated into Visual Studio Code. It enables musicians and developers to create generative music by writing Python code that dynamically generates Sonic Pi instructions in real-time. The system bridges the gap between Python's programming capabilities and Sonic Pi's sound synthesis engine, providing an interactive, code-driven music creation workflow.

### Key Features
- Live coding environment with Python syntax
- Real-time sound generation through Sonic Pi
- Hot-reload capability for instant audio feedback
- Full integration with VSCode's Python tooling (Pylance, debugging, navigation)
- Automatic server lifecycle management

## 2. Architecture Components

The system consists of four main components:

### 2.1 VSCode Extension (Client)
The VSCode extension provides the user interface and orchestrates the workflow:
- **File Association Handler**: Registers and handles `.live.py` files
- **Keyboard Shortcut Handler**: Manages `Alt+R` and `Alt+S` keybindings
- **Server Lifecycle Manager**: Automatically starts/stops the Sonic Pi server
- **Command Executor**: Executes Python scripts and manages the translation pipeline
- **Communication Layer**: Sends Ruby/Sonic Pi code to the server

### 2.2 Python Runtime Environment
The Python interpreter executes user-written scripts:
- Runs `.live.py` files on demand
- Generates Sonic Pi Ruby syntax
- Outputs to `last.rb` file
- Operates in the background with VSCode integration

### 2.3 Intermediate File System (`last.rb`)
A temporary file serves as a bridge between components:
- Contains generated Ruby/Sonic Pi code
- Written by Python execution
- Read by the extension for transmission to Sonic Pi
- Acts as a snapshot of the current sound definition

### 2.4 Sonic Pi Server
The audio synthesis engine that produces sound:
- Runs as a background process
- Receives Ruby/Sonic Pi instructions
- Executes sound synthesis
- Manages playback state (play/stop)
- Operates independently of the VSCode extension

## 3. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      VSCode IDE                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          VSCode PSP Extension                          │ │
│  │  ┌──────────────┐  ┌─────────────────────────────┐   │ │
│  │  │ File Handler │  │ Server Lifecycle Manager    │   │ │
│  │  │  (.live.py)  │  │ (Auto-start/stop Sonic Pi)  │   │ │
│  │  └──────────────┘  └─────────────────────────────┘   │ │
│  │  ┌──────────────┐  ┌─────────────────────────────┐   │ │
│  │  │   Keyboard   │  │   Command Executor          │   │ │
│  │  │   Shortcuts  │  │   (Run Python script)       │   │ │
│  │  │  Alt+R/Alt+S │  └─────────────────────────────┘   │ │
│  │  └──────────────┘                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              User's .live.py File                      │ │
│  │  (Python code with sound generation logic)            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Alt+R pressed
                           ▼
                 ┌──────────────────┐
                 │  Python Runtime  │
                 │   Executes       │
                 │   .live.py       │
                 └──────────────────┘
                           │
                           │ Writes to
                           ▼
                   ┌──────────────┐
                   │   last.rb    │
                   │ (Ruby/Sonic  │
                   │  Pi syntax)  │
                   └──────────────┘
                           │
                           │ Extension reads
                           ▼
                 ┌──────────────────┐
                 │ VSCode Extension │
                 │  Communication   │
                 │     Layer        │
                 └──────────────────┘
                           │
                           │ Sends Ruby code via
                           │ OSC/UDP protocol
                           ▼
                   ┌──────────────┐
                   │  Sonic Pi    │
                   │   Server     │
                   │  (Audio      │
                   │  Synthesis)  │
                   └──────────────┘
                           │
                           │
                           ▼
                      [Audio Output]
```

## 4. User Interaction Flow

### 4.1 Initial Setup and Server Start

1. **User opens a `.live.py` file** in VSCode
2. **Extension detects the file type** and activates
3. **Server Lifecycle Manager** automatically starts the Sonic Pi server in the background
4. **System is ready** for live coding

### 4.2 Live Coding Workflow (Play)

1. **User writes/modifies Python code** in the `.live.py` file
   - Full Pylance support: autocompletion, type checking, linting
   - Standard VSCode debugging and navigation features available
   
2. **User presses `Alt+R`** (Run command)
   
3. **Extension triggers Python execution**
   - Current file is executed by the Python interpreter
   - Python script generates Sonic Pi Ruby syntax
   
4. **Python writes output to `last.rb`**
   - File contains valid Sonic Pi/Ruby code
   - Represents the current sound definition
   
5. **Extension reads `last.rb`**
   - Captures the generated Ruby code
   
6. **Extension sends code to Sonic Pi server**
   - Communication via OSC (Open Sound Control) or UDP protocol
   - Server receives the Ruby instructions
   
7. **Sonic Pi processes and plays audio**
   - Synthesizes sound based on the instructions
   - Audio output is immediately audible
   
8. **User iterates**
   - Modify Python code
   - Press `Alt+R` again
   - Hear the updated sound instantly

### 4.3 Stop Playback

1. **User presses `Alt+S`** (Stop command)
2. **Extension sends stop signal** to Sonic Pi server
3. **Sonic Pi stops all playback**
4. **User can continue editing** and press `Alt+R` again when ready

### 4.4 Session End

1. **User closes the `.live.py` file** or VSCode
2. **Server Lifecycle Manager** automatically stops the Sonic Pi server
3. **Resources are released**

## 5. Technical Stack and Dependencies

### 5.1 VSCode Extension
- **Language**: TypeScript/JavaScript
- **Framework**: VSCode Extension API
- **Communication**: Node.js networking libraries for OSC/UDP
- **Build Tools**: npm/yarn, webpack (typical for VSCode extensions)

### 5.2 Python Environment
- **Language**: Python 3.8 or higher
- **Requirements**: 
  - Must be able to generate Ruby/Sonic Pi syntax
  - File I/O capabilities (write to `last.rb`)
  - Compatible with Pylance/Python extension for VSCode

### 5.3 Sonic Pi
- **Language**: Ruby
- **Audio Engine**: SuperCollider
- **Communication**: OSC (Open Sound Control) protocol
- **Platform**: Cross-platform (Windows, macOS, Linux)

## 6. Server Management

### 6.1 Automatic Lifecycle
The extension manages the Sonic Pi server lifecycle automatically:

- **Start Trigger**: Opening any file with `.live.py` extension
- **Stop Trigger**: Closing all `.live.py` files or closing VSCode
- **Process Management**: 
  - Server runs as a child process or system daemon
  - Extension monitors server health
  - Automatic recovery on server crashes (optional)

### 6.2 Server Communication
- **Protocol**: OSC (Open Sound Control) over UDP
- **Default Port**: Typically 4557 (Sonic Pi standard)
- **Message Format**: Sonic Pi command messages
- **Error Handling**: 
  - Connection timeouts
  - Server not responding
  - Invalid Ruby syntax feedback

### 6.3 Reference Implementation
The extension may reference the approach used in [vscode-sonic-pi](https://github.com/s00500/vscode-sonic-pi) for:
- Process spawning and management
- Communication protocol implementation
- Error handling strategies
- Configuration options

**Note**: This reference is mentioned in the original agent brief as a potential source of implementation patterns. Developers should verify the repository is currently accessible and maintained, and review its current state before adapting any approaches.

## 7. Data Flow

### 7.1 Code Execution Path
```
User Code (.live.py) 
  → Python Interpreter 
  → Generated Ruby (last.rb) 
  → Extension Reader 
  → OSC Protocol 
  → Sonic Pi Server 
  → Audio Output
```

### 7.2 Control Flow
```
User Keypress (Alt+R) 
  → Extension Command Handler 
  → Python Script Execution 
  → File System I/O 
  → Server Communication
```

### 7.3 Server Lifecycle
```
File Open (.live.py) 
  → Extension Activation 
  → Server Start 
  → Ready State

File Close 
  → Extension Deactivation 
  → Server Stop 
  → Cleanup
```

## 8. Key Design Decisions

### 8.1 Why Intermediate File (`last.rb`)?
- **Simplicity**: Clear separation between Python execution and extension logic
- **Debugging**: Users can inspect generated Ruby code
- **Decoupling**: Python script doesn't need to know about the extension or server
- **Flexibility**: Easy to test components independently

### 8.2 Why Python to Ruby Translation?
- **Python Ergonomics**: More accessible syntax for many programmers
- **Library Ecosystem**: Access to Python's vast libraries for algorithmic composition
- **Sonic Pi Power**: Leverage Sonic Pi's mature audio synthesis capabilities
- **Best of Both Worlds**: Combine Python's programming features with Sonic Pi's audio engine

### 8.3 Why Automatic Server Management?
- **User Experience**: No manual server start/stop required
- **Resource Efficiency**: Server only runs when needed
- **Simplicity**: One-step workflow for users

## 9. Extension Points and Future Enhancements

### 9.1 Potential Features
- **Error Feedback**: Display Sonic Pi errors in VSCode
- **Code Templates**: Snippets for common Sonic Pi patterns
- **Live Visualization**: Real-time audio visualization
- **Recording**: Capture generated audio to files
- **Multiple Files**: Support importing/using multiple `.live.py` files
- **Configuration**: Customizable keybindings, server port, Python path

### 9.2 Integration Opportunities
- **Git Integration**: Version control for live coding sessions
- **Collaboration**: Multi-user live coding sessions
- **Package Management**: Python package dependencies for audio libraries
- **MIDI Support**: Control external hardware synthesizers

## 10. Security and Error Handling

### 10.1 Security Considerations
- **Python Execution**: Running arbitrary Python code (user responsibility)
- **File System Access**: Writing to `last.rb` (controlled location)
- **Network Communication**: Local OSC/UDP only (no remote execution)
- **Server Process**: Ensure proper cleanup on crashes

### 10.2 Error Scenarios
- **Python Syntax Errors**: Caught by Python interpreter, displayed in output
- **Ruby Syntax Errors**: Sonic Pi server reports errors via OSC
- **Server Not Running**: Extension should detect and attempt restart
- **File Write Errors**: Handle permissions and disk space issues
- **Communication Timeouts**: Retry logic or user notification

## 11. Development Workflow

### 11.1 For Extension Developers
1. Set up VSCode extension development environment
2. Implement server lifecycle management
3. Implement keyboard shortcuts and commands
4. Develop OSC communication layer
5. Test with sample `.live.py` files
6. Package and publish extension

### 11.2 For End Users
1. Install VSCode PSP extension from marketplace
2. Install Sonic Pi on the system
3. Install Python 3.8 or higher
4. Create a `.live.py` file
5. Write sound generation code
6. Press `Alt+R` to hear results
7. Iterate and enjoy live music coding!

## 12. Conclusion

The VSCode PSP extension provides a powerful live music coding environment by seamlessly integrating Python scripting with Sonic Pi's audio synthesis capabilities. The architecture emphasizes simplicity, automatic management, and tight integration with VSCode's existing Python tooling. By using an intermediate file as a bridge between components, the system maintains clear separation of concerns while enabling a smooth, iterative creative workflow.

The extension empowers musicians and developers to explore algorithmic composition and generative music using familiar Python syntax, while leveraging the battle-tested audio capabilities of Sonic Pi. The automatic server management and hot-reload functionality create an immediate, responsive experience that supports the creative flow of live coding.
