/**
 * Build graph data structures from dependency map
 */
function buildGraph(files, deps, rootDir) {
  const root = rootDir.replace(/\\/g, '/');

  // Shorten paths relative to root for display
  const shorten = (f) => f.startsWith(root) ? f.slice(root.length + 1) : f;

  const nodes = [];
  const links = [];
  const nodeIndex = new Map();

  for (const file of files) {
    const id = shorten(file);
    nodeIndex.set(file, id);
    nodes.push({ id, full: file });
  }

  for (const [from, targets] of deps) {
    for (const to of targets) {
      links.push({ source: nodeIndex.get(from), target: nodeIndex.get(to) });
    }
  }

  return { nodes, links };
}

/**
 * Detect unused files: files that are never imported by anyone
 * Entry points (files with no incoming edges) are flagged unless they match entryPatterns
 */
function detectUnused(files, deps, rootDir, entryPatterns = [/index\.[jt]sx?$/, /main\.[jt]sx?$/, /app\.[jt]sx?$/i, /__main__\.py$/]) {
  const root = rootDir.replace(/\\/g, '/');
  const shorten = (f) => f.startsWith(root) ? f.slice(root.length + 1) : f;

  // Build reverse map: who imports this file
  const importedBy = new Map();
  for (const file of files) importedBy.set(file, new Set());

  for (const [from, targets] of deps) {
    for (const to of targets) {
      importedBy.get(to)?.add(from);
    }
  }

  const unused = [];
  for (const file of files) {
    const incoming = importedBy.get(file);
    if (incoming && incoming.size === 0) {
      const short = shorten(file);
      const isEntry = entryPatterns.some(p => p.test(short));
      unused.push({ file: short, full: file, isEntry });
    }
  }

  return unused;
}

/**
 * Compute basic stats
 */
function stats(files, deps) {
  let totalEdges = 0;
  let maxDeps = 0;
  let mostDepsFile = null;

  for (const [file, targets] of deps) {
    totalEdges += targets.size;
    if (targets.size > maxDeps) {
      maxDeps = targets.size;
      mostDepsFile = file;
    }
  }

  return { totalFiles: files.size, totalEdges, maxDeps, mostDepsFile };
}

module.exports = { buildGraph, detectUnused, stats };
