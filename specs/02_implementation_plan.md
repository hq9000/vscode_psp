# VSCode PSP Extension - Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for building the VSCode PSP (Python Sonic Pi) extension. The plan is organized into phases, with each phase containing discrete tasks that can be implemented and tested independently.

## Prerequisites
- VSCode Extension API knowledge
- TypeScript/JavaScript development environment
- Node.js and npm installed
- Understanding of Sonic Pi and OSC protocol
- Python 3.8+ for testing

## Phase 1: Project Setup and Infrastructure

### 1.1 Initialize Extension Project
**Goal**: Set up the basic VSCode extension structure

**Tasks**:
- [x] Create new VSCode extension project using Yeoman generator (`yo code`)
- [x] Choose TypeScript as the implementation language
- [x] Configure project structure:
  - `src/` - Source code directory
  - `test/` - Test directory
  - `package.json` - Extension manifest and configuration
  - `tsconfig.json` - TypeScript configuration
- [x] Set up build tools (webpack for bundling)
- [x] Configure linting (ESLint) and formatting (Prettier)
- [x] Initialize Git repository with proper `.gitignore`

**Validation**:
- Extension project structure exists
- `npm install` runs successfully
- `npm run compile` produces output
- Basic extension can be loaded in Extension Development Host

### 1.2 Configure Extension Manifest
**Goal**: Define extension metadata and capabilities

**Tasks**:
- [x] Update `package.json` with extension details:
  - Name: `vscode-psp`
  - Display name: "VSCode PSP - Python Sonic Pi"
  - Description, version, publisher information
- [x] Define activation events:
  - `onLanguage:python` (when .live.py files are opened)
  - `onCommand:vscode-psp.*` (for explicit commands)
- [x] Declare file association for `.live.py` files
- [x] Define extension categories: "Programming Languages", "Other"
- [x] Add icon and branding assets

**Validation**:
- Extension appears in Extension Development Host
- Activates when `.live.py` file is opened
- Metadata displays correctly in Extensions view

### 1.3 Set Up Dependencies
**Goal**: Install necessary npm packages

**Tasks**:
- [x] Add `osc-js` for OSC/UDP communication with Sonic Pi
- [x] Add VSCode extension dependencies:
  - `@types/vscode`
  - `@types/node`
- [x] Add development dependencies:
  - TypeScript
  - Webpack and related loaders
  - Testing frameworks (if applicable)
- [x] Document dependency choices in README

**Validation**:
- All dependencies install without errors
- Types are available for TypeScript compilation

## Phase 2: Core Extension Infrastructure

### 2.1 Extension Activation and Context
**Goal**: Implement proper extension lifecycle management

**Tasks**:
- [x] Create main `extension.ts` with `activate()` and `deactivate()` functions
- [x] Set up extension context for state management
- [x] Initialize logging/output channel for user feedback
- [x] Create utility modules for common functionality
- [x] Implement proper error handling foundation

**Validation**:
- Extension activates on `.live.py` file open
- Output channel shows activation messages
- No errors in Debug Console
- `deactivate()` is called on extension shutdown

### 2.2 Configuration Management
**Goal**: Implement extension settings system

**Tasks**:
- [x] Define configuration schema in `package.json`:
  - `vscode-psp.sonicPiRootDirectory` (string, platform-specific defaults)
  - `vscode-psp.autoStartServer` (boolean, default: true)
  - `vscode-psp.outputFile` (string, default: "${workspaceFolder}/last.rb")
  - `vscode-psp.serverPort` (number, default: 4557)
  - `vscode-psp.logLevel` (enum: "debug", "info", "warn", "error")
  - `vscode-psp.logAutoscroll` (boolean, default: true)
  - `vscode-psp.logClearOnRun` (boolean, default: true)
  - `vscode-psp.flashBackgroundColor` (string, default: "rgba(255,20,147,1.0)")
  - `vscode-psp.flashTextColor` (string, default: "rgba(255,255,255,1.0)")
- [x] Create `ConfigurationManager` class to access settings
- [x] Implement platform-specific defaults detection
- [x] Add configuration validation logic

**Validation**:
- Settings appear in VSCode Settings UI
- Default values are correct for each platform
- Configuration can be read and updated programmatically
- Invalid configurations trigger warnings

### 2.3 File Type Handler
**Goal**: Register and handle `.live.py` files

**Tasks**:
- [x] Register `.live.py` file association in `package.json`
- [x] Create `FileHandler` module
- [x] Implement file type detection logic
- [x] Set up file watching for active `.live.py` files
- [x] Handle file open/close events
- [x] Trigger server lifecycle based on file events

**Validation**:
- `.live.py` files are recognized by the extension
- Opening a `.live.py` file triggers extension activation
- File events are logged correctly
- Closing files doesn't break extension state

## Phase 3: Sonic Pi Server Management

### 3.1 Server Process Manager
**Goal**: Implement Sonic Pi server lifecycle management

**Tasks**:
- [x] Create `ServerManager` class
- [x] Implement server detection logic (check if already running)
- [x] Implement server start functionality:
  - Locate Sonic Pi executable using configuration
  - Spawn server process as child process
  - Capture stdout/stderr for logging
  - Detect successful startup
- [x] Implement server stop functionality:
  - Send graceful shutdown signal
  - Force kill if necessary
  - Clean up resources
- [x] Implement server health monitoring:
  - Periodic health checks
  - Automatic restart on crash (optional)
- [x] Handle platform-specific differences (Windows, macOS, Linux)

**Validation**:
- Server starts successfully when `.live.py` file is opened
- Server process is visible in system process list
- Server can be stopped using stop command
- Proper cleanup occurs on extension deactivation
- Error messages display if server fails to start

### 3.2 Server Auto-Start Logic
**Goal**: Automatic server startup on file open

**Tasks**:
- [x] Implement trigger on `.live.py` file open event
- [x] Check if server is already running before starting
- [x] Respect `autoStartServer` configuration setting
- [x] Show progress notification during startup
- [x] Handle startup failures gracefully
- [x] Provide user feedback via status bar or notifications

**Validation**:
- Server automatically starts on first `.live.py` file open
- No duplicate server processes are created
- User can disable auto-start via settings
- Startup progress is visible to user
- Errors are reported clearly

### 3.3 Server Commands
**Goal**: Implement user commands for server control

**Tasks**:
- [x] Register commands in `package.json`:
  - `vscode-psp.startServer` - Start Sonic Pi server
  - `vscode-psp.stopServer` - Stop Sonic Pi server
  - `vscode-psp.restartServer` - Restart server
  - `vscode-psp.checkServerStatus` - Display server status
- [x] Implement command handlers
- [x] Add commands to Command Palette
- [x] Create status bar item showing server state
- [x] Handle edge cases (start when already running, etc.)

**Validation**:
- Commands appear in Command Palette
- Commands function correctly
- Status bar shows accurate server state
- Multiple invocations are handled gracefully

## Phase 4: Python Execution Engine

### 4.1 Python Environment Detection
**Goal**: Detect and use the active Python environment

**Tasks**:
- [x] Integrate with VSCode Python extension API
- [x] Detect active Python virtual environment (venv)
- [x] Get path to Python interpreter
- [x] Validate Python version (3.8+)
- [x] Handle cases where no Python environment is active
- [x] Allow manual Python path configuration (fallback)

**Validation**:
- Correct Python interpreter is detected
- Virtual environment activation is recognized
- Warnings display if Python version is too old
- User can override Python path in settings

### 4.2 Python Script Executor
**Goal**: Execute `.live.py` scripts

**Tasks**:
- [x] Create `PythonExecutor` class
- [x] Implement script execution logic:
  - Run Python script using detected interpreter
  - Pass appropriate environment variables
  - Execute in context of workspace root
  - Capture stdout/stderr
- [x] Handle script execution errors:
  - Python syntax errors
  - Runtime exceptions
  - Timeouts
- [x] Display output in dedicated output channel
- [x] Implement execution queue (prevent multiple simultaneous runs)

**Validation**:
- Python scripts execute successfully
- Script output appears in output channel
- Errors are caught and displayed
- Multiple rapid executions are handled safely

### 4.3 Output File Management
**Goal**: Manage the `last.rb` intermediate file

**Tasks**:
- [x] Implement logic to locate `last.rb`:
  - Default to workspace root
  - Respect `outputFile` configuration
  - Create directory if needed
- [x] Read `last.rb` after Python execution
- [x] Validate file content (basic Ruby syntax check)
- [x] Handle missing or empty file cases
- [x] Implement file watching for debugging purposes (optional)

**Validation**:
- `last.rb` is correctly located after script execution
- File content can be read
- Missing file triggers appropriate error message
- Configuration changes are respected

## Phase 5: Communication Layer

### 5.1 OSC Client Implementation
**Goal**: Establish communication with Sonic Pi server

**Tasks**:
- [x] Create `OscClient` class using `osc-js` library
- [x] Initialize OSC client with proper configuration:
  - Target host: localhost (127.0.0.1)
  - Target port: from configuration (default 4557)
  - UDP protocol
- [x] Implement connection management:
  - Open connection
  - Close connection
  - Handle connection errors
- [x] Implement message sending:
  - Format messages according to Sonic Pi protocol
  - Send Ruby code to server
  - Send control commands (stop, etc.)
- [x] Implement response handling (if applicable)

**Validation**:
- OSC client connects to Sonic Pi server
- Messages are sent successfully
- Connection errors are handled
- Proper cleanup on disconnect

### 5.2 Sonic Pi Protocol Implementation
**Goal**: Implement Sonic Pi command protocol

**Tasks**:
- [x] Research Sonic Pi OSC message format
- [x] Implement message builders:
  - Run code message (`/run-code`)
  - Stop all message (`/stop-all-jobs`)
  - Other control messages as needed
- [x] Handle message formatting (OSC data types)
- [x] Implement error message parsing (if Sonic Pi sends feedback)
- [x] Add logging for sent/received messages

**Validation**:
- Sent messages conform to Sonic Pi protocol
- Sonic Pi server responds correctly
- Code execution results in audio output
- Stop command halts audio playback

### 5.3 Communication Manager
**Goal**: Coordinate OSC communication with server lifecycle

**Tasks**:
- [x] Create `CommunicationManager` class
- [x] Integrate OSC client with server manager
- [x] Implement retry logic for failed sends
- [x] Add connection health monitoring
- [x] Handle server disconnections gracefully
- [x] Queue messages if server is temporarily unavailable

**Validation**:
- Communication works reliably
- Failed sends are retried
- Server disconnection doesn't crash extension
- Messages are queued appropriately

## Phase 6: User Commands and Keybindings

### 6.1 Run Command (Alt+R)
**Goal**: Implement the core "play" functionality

**Tasks**:
- [ ] Register `vscode-psp.run` command in `package.json`
- [ ] Bind command to `Alt+R` keybinding
- [ ] Scope keybinding to `.live.py` files
- [ ] Implement command handler:
  1. Clear log if `logClearOnRun` is enabled
  2. Display flash effect (if configured)
  3. Execute Python script
  4. Wait for `last.rb` to be written
  5. Read `last.rb` content
  6. Send code to Sonic Pi server via OSC
  7. Display success/failure notification
- [ ] Add progress indicator during execution
- [ ] Handle errors at each step

**Validation**:
- `Alt+R` triggers Python execution
- Generated Ruby code is sent to Sonic Pi
- Audio output is produced
- Errors are reported to user
- Flash effect is visible

### 6.2 Stop Command (Alt+S)
**Goal**: Implement audio stop functionality

**Tasks**:
- [ ] Register `vscode-psp.stop` command in `package.json`
- [ ] Bind command to `Alt+S` keybinding
- [ ] Implement command handler:
  - Send stop message to Sonic Pi server
  - Display confirmation notification
- [ ] Handle case where server is not running

**Validation**:
- `Alt+S` stops all audio playback
- Command works even if server was started externally
- Appropriate message displays if server is not running

### 6.3 Additional Commands
**Goal**: Provide supplementary user commands

**Tasks**:
- [ ] Implement `vscode-psp.showLogs` - Open extension log output
- [ ] Implement `vscode-psp.showGeneratedCode` - View `last.rb` content
- [ ] Implement `vscode-psp.openSettings` - Quick access to extension settings
- [ ] Add commands to Command Palette with proper categories
- [ ] Consider context menu items for `.live.py` files

**Validation**:
- All commands are accessible
- Commands perform expected actions
- Commands handle edge cases

## Phase 7: User Interface and Feedback

### 7.1 Status Bar Integration
**Goal**: Display extension status in status bar

**Tasks**:
- [ ] Create status bar item for server state
- [ ] Display status: "Sonic Pi: Running" / "Sonic Pi: Stopped"
- [ ] Add click action to status bar item (toggle server)
- [ ] Update status in real-time
- [ ] Color-code status (green = running, gray = stopped)

**Validation**:
- Status bar shows current server state
- Status updates when server starts/stops
- Click action works correctly

### 7.2 Output Channel and Logging
**Goal**: Provide visibility into extension operations

**Tasks**:
- [ ] Create dedicated output channel ("VSCode PSP")
- [ ] Implement logging levels (debug, info, warn, error)
- [ ] Log key operations:
  - Extension activation/deactivation
  - Server start/stop events
  - Python script execution
  - OSC message sending
  - Errors and warnings
- [ ] Implement log autoscroll based on configuration
- [ ] Implement log clear on run based on configuration
- [ ] Format log messages for readability

**Validation**:
- Output channel shows extension activity
- Log messages are clear and helpful
- Log level configuration is respected
- Autoscroll and clear settings work

### 7.3 Visual Feedback Effects
**Goal**: Implement visual feedback during code execution

**Tasks**:
- [ ] Implement text editor flash effect on run:
  - Apply background and text color flash
  - Use colors from configuration
  - Flash duration: ~100-200ms
  - Animate smoothly
- [ ] Implement progress indicators for long operations
- [ ] Add success/error notifications (non-intrusive)
- [ ] Consider decorations for active `.live.py` files

**Validation**:
- Flash effect is visible when code runs
- Flash colors match configuration
- Effect doesn't interfere with editing
- Notifications are helpful but not annoying

### 7.4 Error Handling and User Messaging
**Goal**: Provide clear error messages and guidance

**Tasks**:
- [ ] Categorize error types:
  - Configuration errors (missing Sonic Pi path)
  - Server errors (failed to start, crashed)
  - Python errors (script execution failed)
  - Communication errors (OSC send failed)
  - File errors (can't read/write `last.rb`)
- [ ] Create user-friendly error messages for each category
- [ ] Provide actionable suggestions (e.g., "Configure Sonic Pi path")
- [ ] Add "Show Details" option for technical errors
- [ ] Log all errors to output channel with stack traces

**Validation**:
- Error messages are clear and helpful
- Users can understand and resolve common issues
- Technical details are available when needed

## Phase 8: Testing and Quality Assurance

### 8.1 Unit Tests
**Goal**: Test individual components in isolation

**Tasks**:
- [ ] Set up testing framework (Jest or Mocha)
- [ ] Write unit tests for:
  - `ConfigurationManager`
  - `FileHandler`
  - `PythonExecutor`
  - `OscClient`
  - Utility functions
- [ ] Mock external dependencies (file system, processes, VSCode API)
- [ ] Aim for >80% code coverage
- [ ] Integrate tests into CI pipeline

**Validation**:
- All unit tests pass
- Code coverage meets target
- Tests run in CI

## Phase 9: Documentation

### 9.1 User Documentation
**Goal**: Help users get started and be productive

**Tasks**:
- [ ] Write comprehensive README.md:
  - Feature overview
  - Installation instructions
  - Getting started guide
  - Configuration reference
  - Troubleshooting section
  - Links to examples
- [ ] Create CHANGELOG.md
- [ ] Write tutorial/walkthrough document
- [ ] Add in-editor documentation (hover tooltips)
- [ ] Create example `.live.py` files repository

**Validation**:
- New users can get started without external help
- Common issues are documented
- Examples are clear and working

### 9.2 Developer Documentation
**Goal**: Enable community contributions

**Tasks**:
- [ ] Write CONTRIBUTING.md:
  - Development setup instructions
  - Code style guidelines
  - Testing requirements
  - PR process
- [ ] Document architecture and code structure
- [ ] Add inline code comments for complex logic
- [ ] Document build and release process
- [ ] Create API documentation (if exposing extension API)

**Validation**:
- New contributors can set up dev environment
- Code is understandable
- Build process is documented

### 9.3 Configuration Documentation
**Goal**: Document all extension settings

**Tasks**:
- [ ] Add detailed descriptions to each setting in `package.json`
- [ ] Create configuration guide with examples
- [ ] Document platform-specific considerations
- [ ] Add troubleshooting for common config issues

**Validation**:
- All settings are documented
- Users understand configuration options

## Phase 10: Packaging and Release

### 10.1 Extension Packaging
**Goal**: Prepare extension for distribution

**Tasks**:
- [ ] Configure extension bundle:
  - Minify and bundle code with webpack
  - Optimize size (exclude dev dependencies)
  - Include necessary assets
- [ ] Test packaged extension (.vsix file)
- [ ] Validate extension manifest
- [ ] Ensure all dependencies are properly declared
- [ ] Add extension icon and branding

**Validation**:
- `.vsix` file is created successfully
- Packaged extension installs and runs correctly
- Extension size is reasonable (<10MB)

### 10.2 Marketplace Preparation
**Goal**: Prepare for publication to VSCode Marketplace

**Tasks**:
- [ ] Create publisher account (if needed)
- [ ] Prepare marketplace listing:
  - Clear, compelling description
  - Feature list
  - Screenshots/GIFs of extension in action
  - Tags and categories
  - License information
- [ ] Set up marketplace badges for README
- [ ] Configure auto-publishing in CI/CD
- [ ] Create release notes template

**Validation**:
- Marketplace listing looks professional
- All required metadata is present
- Screenshots showcase features well

### 10.3 Release Process
**Goal**: Establish reliable release workflow

**Tasks**:
- [ ] Set up semantic versioning
- [ ] Create release checklist
- [ ] Document release process:
  - Version bump
  - Changelog update
  - Testing verification
  - Publishing to marketplace
  - GitHub release creation
- [ ] Set up CI/CD for automated releases (optional)
- [ ] Plan initial release (v0.1.0 or v1.0.0)

**Validation**:
- Release process is documented
- Team understands release steps
- First release is successful

## Phase 11: Post-Release and Maintenance

### 11.1 Monitoring and Feedback
**Goal**: Track extension usage and gather feedback

**Tasks**:
- [ ] Monitor marketplace reviews and ratings
- [ ] Set up issue tracking on GitHub
- [ ] Create issue templates (bug report, feature request)
- [ ] Monitor telemetry data (if implemented)
- [ ] Engage with community feedback
- [ ] Prioritize bug fixes and improvements

**Validation**:
- Feedback channels are active
- Issues are being tracked
- Users feel heard

### 11.2 Bug Fixes and Updates
**Goal**: Maintain extension quality

**Tasks**:
- [ ] Triage and fix reported bugs
- [ ] Release patch updates as needed
- [ ] Update dependencies regularly
- [ ] Test with new VSCode versions
- [ ] Address security vulnerabilities promptly

**Validation**:
- Critical bugs are fixed quickly
- Extension stays up-to-date

### 11.3 Feature Enhancements
**Goal**: Evolve extension based on user needs

**Tasks**:
- [ ] Evaluate feature requests
- [ ] Plan feature roadmap
- [ ] Implement high-value enhancements:
  - Error feedback from Sonic Pi
  - Code templates/snippets
  - Live visualization
  - Audio recording
  - Multi-file support
- [ ] Release minor/major versions with new features

**Validation**:
- User-requested features are considered
- Extension continues to improve

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Project Setup | 1-2 days | None |
| Phase 2: Core Infrastructure | 2-3 days | Phase 1 |
| Phase 3: Server Management | 3-5 days | Phase 2 |
| Phase 4: Python Execution | 3-4 days | Phase 2 |
| Phase 5: Communication Layer | 3-4 days | Phase 3 |
| Phase 6: Commands & Keybindings | 2-3 days | Phase 4, 5 |
| Phase 7: UI & Feedback | 2-3 days | Phase 6 |
| Phase 8: Testing | 2-3 days | Phase 7 |
| Phase 9: Documentation | 2-3 days | Phase 8 |
| Phase 10: Packaging | 1-2 days | Phase 9 |
| Phase 11: Post-Release | Ongoing | Phase 10 |

**Total Development Time**: Approximately 3-5 weeks for MVP release

## Success Criteria

The implementation is considered successful when:

1. ✅ Users can open `.live.py` files in VSCode
2. ✅ Sonic Pi server starts automatically
3. ✅ `Alt+R` executes Python code and produces audio
4. ✅ `Alt+S` stops audio playback
5. ✅ Extension works on Windows, macOS, and Linux
6. ✅ Configuration options are available and functional
7. ✅ Error handling provides clear feedback
8. ✅ Extension is published to VSCode Marketplace
9. ✅ Documentation enables users to get started quickly
10. ✅ Community can contribute to the project

## Risk Mitigation

### Technical Risks
- **Sonic Pi API Changes**: Monitor Sonic Pi releases; maintain compatibility layer
- **Platform Differences**: Test on all platforms early and often
- **Python Environment Detection**: Rely on VSCode Python extension API; provide manual fallback

### Project Risks
- **Scope Creep**: Stick to MVP features; defer enhancements to post-release
- **Testing Complexity**: Prioritize automated testing; use mocks for external dependencies
- **User Adoption**: Engage early adopters for feedback; create compelling examples

## Next Steps

1. Review and approve this implementation plan
2. Set up development environment (Phase 1.1)
3. Begin implementation starting with Phase 1
4. Hold regular progress reviews at phase boundaries
5. Adjust plan based on learnings and feedback

---

**Version**: 1.0
**Last Updated**: 2026-05-24
**Status**: Ready for Implementation
