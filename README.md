<div align="center">
  
# 🕸️ Dependency Analyzer

**A lightning-fast, highly accurate CLI tool to analyze your codebase's dependencies, detect dead files, spot circular imports, and generate beautiful interactive graphs.**

[![npm version](https://img.shields.io/npm/v/dependency-analyzer-p.svg?style=flat-square)](https://www.npmjs.com/package/dependency-analyzer-p)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/Node.js-%3E%3D14.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org/)

</div>

---

## 📌 Table of Contents

- [Core Features](#-core-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Usage Guide](#-usage-guide)
  - [Basic Commands](#basic-commands)
  - [Pro-Level Commands](#pro-level-commands)
- [Visual Graph Types](#-visual-graph-types-html)
- [Limitations](#-limitations)
- [License](#-license)

---

## 💎 Core Features

- 🎯 **AST Parsing for Exact Precision**: Uses Babel (`@babel/parser`) to parse JavaScript and TypeScript code perfectly. It natively understands complex setups like dynamic `import()`, `require()` statements, and `export *`.
- 🗺️ **Path Aliasing Support**: Automatically parses `tsconfig.json` or `jsconfig.json` alias paths (e.g., `@/components/*`) into physical file locations out-of-the-box.
- 📊 **Multiple Output Formats**: Export data to Interactive HTML (`-f html`), CI/CD pipeline friendly JSON (`-f json`), or Markdown-ready Mermaid graphs (`-f mermaid`).
- 🔍 **Focus Mode & Depth Limiting**: Dealing with a massive monorepo? Use `--focus <filename>` combined with `--max-depth <n>` to generate a clean sub-graph dedicated to a specific feature.
- ☠️ **Cycle & Orphan Detection**: Traps components imported amongst themselves but disconnected from main entry points (Orphan Modules), and identifies deadly Circular Dependencies.
- 🛡️ **CI/CD Integration**: Plug into your GitHub Actions using strict assertions like `--fail-on-cycle` or `--fail-on-unused`.
- ⚡ **Watch Mode**: Live-reload your dependency visualizations using `-w` or `--watch` as you refactor code.

---

## 🚀 Installation

Install it globally to use anywhere, or run it directly via `npx` in your projects.

```bash
# Global install
npm install -g dependency-analyzer-p

# Or install as a devDependency in your project
npm install -D dependency-analyzer-p
```

---

## ⚡ Quick Start

Analyze the current directory and generate the default interactive HTML graph (`dependency-graph.html`):

```bash
npx dep-analyze ./src
```

---

## 📖 Usage Guide

### Basic Commands

**Custom Target & Ignore Patterns**  
Exclude your `dist`, `tests`, or configuration directories.
```bash
npx dep-analyze ./src --ignore "**/node_modules/**,**/*.test.js"
```

**Select Formats**  
Export raw JSON for your CI/CD bots or generate a `.mmd` (Mermaid) file for your README documentation.
```bash
npx dep-analyze ./src -f json
npx dep-analyze ./src -f mermaid
```

### Pro-Level Commands

**Live Reloading with Watch Mode**  
Refactoring your robust application? Keep the HTML visualization open and let Watch Mode auto-update everything upon save!
```bash
npx dep-analyze ./src --watch
```

**Isolating Components (Focus Mode & Max Depth)**  
If you are tracking down the exact dependencies required by `Button.tsx`:
```bash
npx dep-analyze ./src --focus Button.tsx --max-depth 2
```

**CI/CD Pipeline Security Gates**  
Prevent developers from shipping Circular Dependencies or Unused "Dead" Modules into production. Set these up in your pre-commit hooks!
```bash
npx dep-analyze ./src --fail-on-cycle --fail-on-orphan --fail-on-unused
```
*(The process exits with code `1` so the build pipeline fails automatically).*

---

## 🎨 Visual Graph Types (HTML)

When specifying `-f html` (the default format), you receive a clean UI graph where D3.js nodes are color-coded based on their execution characteristics:

| Color | Type | Description |
| :---: | :--- | :--- |
| 🟢 | **Entry Point** | A top-level file (like `index.ts`, `app.tsx`, or `main.py`) that exports or acts as root. |
| 🔵 | **Normal** | Standard, healthy file with normal inputs and outputs. |
| 🟣 | **Cyclic** | **Danger!** Part of a circular dependency graph! |
| 🟠 | **Orphan** | Sub-graphs that are imported but never bubble up to an Entry Point. |
| 🔴 | **Unused** | Completely dead files. No other file imports it. |

*💡 Hint: Use the built-in Search bar in the HTML file to highlight specific files instantly!*

---

## 🚧 Limitations

- **Python Parsing**: Python files continue to use RegExp approximations under the hood instead of Python AST. This is a compromise deliberately chosen to keep the Node.js package standalone without requiring an execution of a native host `python` layer underneath.

---

## 📄 License

This project is licensed under the **MIT License**.
