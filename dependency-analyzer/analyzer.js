const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Regex patterns per language
const PATTERNS = {
  js: [
    /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  py: [
    /^from\s+(\.+[\w./]*)\s+import/gm,
    /^import\s+([\w./]+)/gm,
  ],
};

const EXT_MAP = {
  '.js': 'js', '.jsx': 'js', '.ts': 'js', '.tsx': 'js',
  '.mjs': 'js', '.cjs': 'js',
  '.py': 'py',
};

/**
 * Resolve a relative import path to an absolute file path
 */
function resolveImport(fromFile, importPath, allFiles) {
  if (!importPath.startsWith('.')) return null; // skip node_modules / stdlib

  const dir = path.dirname(fromFile);
  const base = path.resolve(dir, importPath);

  // Try exact match first, then with extensions
  const candidates = [
    base,
    ...Object.keys(EXT_MAP).map(ext => base + ext),
    path.join(base, 'index.js'),
    path.join(base, 'index.ts'),
    path.join(base, '__init__.py'),
  ];

  for (const candidate of candidates) {
    const normalized = candidate.replace(/\\/g, '/');
    if (allFiles.has(normalized)) return normalized;
  }
  return null;
}

/**
 * Extract all local imports from a file
 */
function extractImports(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();
  const lang = EXT_MAP[ext];
  if (!lang) return [];

  const patterns = PATTERNS[lang];
  const imports = new Set();

  for (const regex of patterns) {
    let match;
    const re = new RegExp(regex.source, regex.flags);
    while ((match = re.exec(content)) !== null) {
      imports.add(match[1]);
    }
  }

  return [...imports];
}

/**
 * Scan a directory and build the dependency map
 * Returns: { files: Set, deps: Map<file, Set<file>>, errors: [] }
 */
async function analyze(rootDir, options = {}) {
  const { extensions = Object.keys(EXT_MAP), ignore = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'] } = options;

  const pattern = `**/*{${extensions.join(',')}}`;
  const rawFiles = await glob(pattern, { cwd: rootDir, ignore, absolute: true });
  const files = new Set(rawFiles.map(f => f.replace(/\\/g, '/')));

  const deps = new Map();   // file -> Set of files it imports
  const errors = [];

  for (const file of files) {
    deps.set(file, new Set());
    let content;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch (e) {
      errors.push({ file, error: e.message });
      continue;
    }

    const imports = extractImports(file, content);
    for (const imp of imports) {
      const resolved = resolveImport(file, imp, files);
      if (resolved) deps.get(file).add(resolved);
    }
  }

  return { files, deps, errors, rootDir };
}

module.exports = { analyze };
