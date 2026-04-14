# Dependency Analyzer

A fast, highly accurate, and production-ready CLI tool to analyze your codebase's dependencies, detect unused files, spot circular imports, and generate beautiful visual graphs.

## Core Features

- **AST Parsing for Exact Precision**: Uses Babel (`@babel/parser`) to parse JavaScript and TypeScript code perfectly. It natively understands complex setups like dynamic `import()`, require statements, and `export *`.
- **Path Aliasing Support**: Automatically parses `tsconfig.json` or `jsconfig.json` alias paths (`paths` attribute) like `@/components/*` into actual file locations out-of-the-box.
- **Multiple Output Formats**: Output data to Interactive HTML (`-f html`), CI/CD pipeline friendly JSON (`-f json`), or Markdown-ready Mermaid graphs (`-f mermaid`).
- **Focus Mode & Depth Limiting**: Massive monorepo? Use `--focus <filename>` combined with `--max-depth <n>` to generate a sub-graph solely dedicated to dependencies around one core file.
- **Cycle & Orphan Detection**: Identifies and traps components imported amongst themselves but disconnected from main entry points (Orphan Modules), and identifies deadly Circular Dependencies.
- **CI/CD Integration**: Plug into your GitHub Actions using strict assertions like `--fail-on-cycle`, `--fail-on-orphan`, or `--fail-on-unused`.
- **Watch Mode**: Live-reload dependencies using `-w` or `--watch`.

## Installation

You can install it globally or use it with `npx` directly in your projects.

\`\`\`bash
# Local install
npm install -g dependency-analyzer
\`\`\`

## Quick Start

Run the analyzer targeting the current directory:

\`\`\`bash
# Run in the root directory (Default output is dependency-graph.html)
npx dep-analyze ./src
\`\`\`

---

## Usage Guide

### Basic Commands

**Custom Target & Ignore Patterns** 
Exclude your dist folders, tests, or config files.
\`\`\`bash
npx dep-analyze ./src --ignore "**/node_modules/**,**/*.test.js"
\`\`\`

**Select Formats** 
Export raw arrays for bots or Jenkins scripts (`.json`) or create a Markdown representation (`.mmd`).
\`\`\`bash
npx dep-analyze ./src -f json
npx dep-analyze ./src -f mermaid
\`\`\`

---

### Pro-Level Commands

**Live Reloading with Watch Mode**
Refactoring your application? Leave the HTML visualization open and let Watch Mode auto-update everything upon save!
\`\`\`bash
npx dep-analyze ./src --watch
\`\`\`

**Isolating Components (Focus Mode & Max Depth)**
If tracking down the dependencies of `Button.tsx`:
\`\`\`bash
npx dep-analyze ./src --focus Button.tsx --max-depth 2
\`\`\`

**CI/CD Pipeline Security Gates**
Prevent developers from shipping Circular Dependencies or Unused "Dead" Modules into production. Set these up in your Pre-commit hooks!
\`\`\`bash
npx dep-analyze ./src --fail-on-cycle --fail-on-orphan --fail-on-unused
\`\`\`
*(The process exits with code \`1\` so the build pipeline fails automatically).*

---

## Visual Graph Types (HTML)

When specifying `-f html` (which is default), you receive a clean UI graph where D3.js nodes are color-coded based on their characteristics:

- 🟢 **Green (Entry Point)**: A top-level file (like `index.ts`, `app.tsx`, or `main.py`) that exports or acts as root.
- 🔵 **Blue (Normal)**: Standard, healthy file with inputs and outputs.
- 🟣 **Purple (Cyclic)**: Danger! Part of a circular dependency graph!
- 🟠 **Orange (Orphan)**: Sub-graphs that are imported but never bubble up to an Entry Point. 
- 🔴 **Red (Unused)**: Completely dead files. No other file imports it.

## Limitations

- Python files continue to use RegExp approximations under the hood instead of Python AST. This is a compromise deliberately chosen to keep the Node.js package standalone without requiring an execution of a host \`python\` layer underneath.

## License
MIT
