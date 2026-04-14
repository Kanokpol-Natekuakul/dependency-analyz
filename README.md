# Dependency Analyzer

Scan your codebase, visualize file dependencies as an interactive graph, and detect unused files.

![graph preview](https://img.shields.io/badge/visualization-D3.js-orange) ![node](https://img.shields.io/badge/node-%3E%3D18-green)

## Features

- **Dependency graph** — interactive force-directed graph with zoom, drag, and pan
- **Unused file detection** — files that are never imported by anyone
- **Circular dependency detection** — finds A→B→C→A cycles, highlighted in purple
- **Hotspot analysis** — node size scales by how many times a file is imported
- **Depth/layer analysis** — shows which layer each file sits in from entry points
- **Folder clustering** — nodes grouped and color-coded by directory
- **Click to highlight** — click a node to see only its upstream/downstream connections
- **Path alias support** — reads `tsconfig.json` / `jsconfig.json` paths and `vite.config` aliases
- **Search** — search all files, highlights matching nodes on graph
- **Export** — download graph as JSON or SVG directly from the UI
- **JSON report** — machine-readable output for CI/CD pipelines
- **Watch mode** — auto re-scans when files change

## Supported Languages

| Language | Extensions |
|---|---|
| JavaScript / TypeScript | `.js` `.jsx` `.ts` `.tsx` `.mjs` `.cjs` |
| Python | `.py` |

## Installation

```bash
git clone https://github.com/Kanokpol-Natekuakul/dependency-analyz.git
cd dependency-analyz
npm install
```

## Usage

### Basic scan

```bash
node cli.js ./your-project
```

Generates `dependency-graph.html` — open it in any browser.

### Options

```
node cli.js [dir] [options]

Arguments:
  dir                     Root directory to scan (default: ".")

Options:
  -o, --output <file>     Output HTML file (default: "dependency-graph.html")
  -e, --ext <exts>        Extensions to include (default: ".js,.jsx,.ts,.tsx,.py")
  --ignore <patterns>     Glob patterns to ignore (default: node_modules, .git, dist, build)
  --json <file>           Also output a JSON report
  --max-unused <n>        Exit code 1 if unused files exceed threshold (for CI/CD)
  -w, --watch             Watch for file changes and re-scan automatically
```

### Examples

```bash
# Scan and open graph
node cli.js ./src -o graph.html

# Watch mode — re-scans on every file save
node cli.js ./src --watch

# CI/CD — fail if more than 5 unused files
node cli.js ./src --json report.json --max-unused 5

# TypeScript project with custom extensions
node cli.js ./src -e .ts,.tsx
```

## Path Aliases

If your project uses `tsconfig.json` path aliases, they are resolved automatically:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@utils/*": ["src/utils/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

Imports like `import { foo } from '@utils/helpers'` will be correctly resolved and shown in the graph.

Vite aliases in `vite.config.ts` / `vite.config.js` are also detected automatically.

## Graph UI

| Action | Result |
|---|---|
| Click node | Highlight upstream/downstream connections |
| Click background | Clear highlight |
| Scroll | Zoom in/out |
| Drag node | Reposition |
| Search box | Highlight matching nodes across full path |
| ⬇ JSON | Export graph data as JSON |
| ⬇ SVG | Export graph as SVG image |

### Node colors

| Color | Meaning |
|---|---|
| Blue | Normal file |
| Green | Entry point (index, main, app) |
| Red | Unused file (never imported) |
| Purple edge | Part of a circular dependency |

## JSON Report Format

```json
{
  "scannedAt": "2026-04-14T00:00:00.000Z",
  "rootDir": "/path/to/project",
  "stats": {
    "totalFiles": 42,
    "totalEdges": 87,
    "maxDeps": 5
  },
  "unusedFiles": ["utils/legacy.js"],
  "entryPoints": ["index.js"],
  "dependencies": {
    "index.js": ["utils/math.js", "components/Button.js"]
  }
}
```

## Project Structure

```
dependency-analyzer/
├── analyzer.js      # File scanning, import extraction, alias resolution
├── graph.js         # Graph building, unused detection, circular detection, depth analysis
├── visualize.js     # HTML/D3.js graph generation
├── watcher.js       # Watch mode
├── cli.js           # CLI entry point
└── package.json
```

## License

MIT
