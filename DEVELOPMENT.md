# VSCode PSP Extension

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run compile
   ```

3. Run in development mode:
   - Press F5 in VSCode to launch Extension Development Host
   - Or run: `code --extensionDevelopmentPath=/path/to/vscode-psp`

## Project Structure

```
vscode-psp/
├── src/              # TypeScript source files
│   └── extension.ts  # Main extension entry point
├── test/             # Test files
├── dist/             # Compiled JavaScript (generated)
├── out/              # Test compilation output (generated)
├── specs/            # Specification documents
├── package.json      # Extension manifest
├── tsconfig.json     # TypeScript configuration
└── webpack.config.js # Webpack bundler configuration
```

## Dependencies

### Runtime Dependencies
- **osc-js**: OSC/UDP communication library for connecting to Sonic Pi

### Development Dependencies
- **TypeScript**: Static typing for JavaScript
- **Webpack**: Module bundler for packaging the extension
- **ESLint**: Code linting and style checking
- **@types/vscode**: TypeScript definitions for VSCode API
- **@types/node**: TypeScript definitions for Node.js

## Commands

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and recompile
- `npm run lint` - Run ESLint on source files
- `npm test` - Run test suite
- `npm run package` - Create production build

## Contributing

See the implementation plan in `specs/02_implementation_plan.md` for development roadmap.
