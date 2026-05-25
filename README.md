# VSCode PSP - Python Sonic Pi

A Visual Studio Code extension for live coding with Python and Sonic Pi.

## Features

- Live Python coding with Sonic Pi integration
- Support for `.live.py` files
- Real-time audio synthesis and control
- OSC communication with Sonic Pi

## Requirements

- Visual Studio Code 1.80.0 or higher
- Node.js 16.x or higher
- Sonic Pi installed on your system

## Extension Settings

This extension contributes the following settings:

* `vscode-psp.sonicPiPath`: Path to Sonic Pi executable (optional, auto-detected on most systems)
* `vscode-psp.pythonPath`: Path to Python interpreter (optional, uses VSCode Python extension if available)

## Known Issues

This extension is currently in early development.

## Release Notes

### 0.1.0

Initial release with basic project structure.

## Development

### Building the Extension

```bash
npm install
npm run compile
```

### Testing

```bash
npm test
```

### Running in Development Mode

1. Open this project in VSCode
2. Press F5 to open a new window with the extension loaded
3. Create a new file with `.live.py` extension
4. Use the command palette (Ctrl+Shift+P) to access PSP commands

## License

MIT
