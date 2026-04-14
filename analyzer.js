const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// Fallback Regex for Python
const PATTERNS = {
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

// Parse mapping from tsconfig.json/jsconfig.json
function loadAliases(rootDir) {
  let aliases = [];
  const configs = ['tsconfig.json', 'jsconfig.json'];
  for (const conf of configs) {
    const configPath = path.join(rootDir, conf);
    if (fs.existsSync(configPath)) {
      try {
        // Read file, strip simple comments
        const content = fs.readFileSync(configPath, 'utf-8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        const json = JSON.parse(content);
        if (json.compilerOptions && json.compilerOptions.paths) {
          const paths = json.compilerOptions.paths;
          const baseUrl = json.compilerOptions.baseUrl || '.';
          for (const [key, values] of Object.entries(paths)) {
            if (values.length > 0) {
              // Convert `@/*` to `^@/(.*)` and `src/$1`
              const regexRaw = key.replace(/\*/g, '(.*)');
              const regex = new RegExp(`^${regexRaw}$`);
              const targetStr = values[0].replace(/\*/g, '$1');
              const target = path.join(rootDir, baseUrl, targetStr).replace(/\\/g, '/');
              aliases.push({ regex, target });
            }
          }
        }
        break; // Use the first found config
      } catch (e) {
        console.warn(`\n⚠  Could not parse ${conf}: ${e.message}`);
      }
    }
  }
  return aliases;
}

/**
 * Resolve an import path to an absolute file path
 */
function resolveImport(fromFile, importPath, allFiles, aliases) {
  let base = null;

  // 1. Check path aliases first
  for (const alias of aliases) {
    if (alias.regex.test(importPath)) {
      base = importPath.replace(alias.regex, alias.target);
      break;
    }
  }

  // 2. Relative paths
  if (!base && importPath.startsWith('.')) {
    const dir = path.dirname(fromFile);
    base = path.resolve(dir, importPath);
  }

  // 3. Node modules / external - skip
  if (!base) return null;

  // normalize slash
  base = base.replace(/\\/g, '/');

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
 * Extract all local imports using AST for JS/TS, Regex for Python
 */
function extractImports(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();
  const lang = EXT_MAP[ext];
  if (!lang) return [];

  const imports = new Set();

  if (lang === 'js') {
    try {
      const ast = parser.parse(content, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript', 'decorators-legacy'],
      });

      traverse(ast, {
        ImportDeclaration(p) {
          if (p.node.source && p.node.source.value) {
            imports.add(p.node.source.value);
          }
        },
        CallExpression(p) {
          const callee = p.node.callee;
          // require('...')
          if (callee.type === 'Identifier' && callee.name === 'require') {
            const args = p.node.arguments;
            if (args.length > 0 && args[0].type === 'StringLiteral') {
              imports.add(args[0].value);
            }
          }
          // import('...')
          else if (callee.type === 'Import') {
            const args = p.node.arguments;
            if (args.length > 0 && args[0].type === 'StringLiteral') {
              imports.add(args[0].value);
            }
          }
        },
        ExportNamedDeclaration(p) {
          if (p.node.source && p.node.source.value) {
            imports.add(p.node.source.value);
          }
        },
        ExportAllDeclaration(p) {
          if (p.node.source && p.node.source.value) {
            imports.add(p.node.source.value);
          }
        }
      });
    } catch (e) {
      // Syntax errors ignored, let the program continue
    }
  } else if (lang === 'py') {
    const patterns = PATTERNS.py;
    for (const regex of patterns) {
      let match;
      const re = new RegExp(regex.source, regex.flags);
      while ((match = re.exec(content)) !== null) {
        imports.add(match[1]);
      }
    }
  }

  return [...imports];
}

/**
 * Scan a directory and build the dependency map
 */
async function analyze(rootDir, options = {}) {
  const { extensions = Object.keys(EXT_MAP), ignore = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'] } = options;

  const pattern = `**/*{${extensions.join(',')}}`;
  const rawFiles = await glob(pattern, { cwd: rootDir, ignore, absolute: true });
  const files = new Set(rawFiles.map(f => f.replace(/\\/g, '/')));

  const deps = new Map();   // file -> Set of files it imports
  const errors = [];
  const aliases = loadAliases(rootDir);

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
      const resolved = resolveImport(file, imp, files, aliases);
      if (resolved) deps.get(file).add(resolved);
    }
  }

  return { files, deps, errors, rootDir };
}

module.exports = { analyze };
