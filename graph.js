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
 * Filter the graph to only show files reachable from or reaching to a specific 'focus' file
 */
function filterByFocus(files, deps, focusFile) {
  const focus = [...files].find(f => f.endsWith(focusFile) || f.replace(/\\/g, '/').endsWith(focusFile.replace(/\\/g, '/')));
  if (!focus) return { files, deps }; // Not found, return original

  const relatedFiles = new Set([focus]);

  // Forward pass (what focus imports)
  const forwardQueue = [focus];
  const forwardVisited = new Set([focus]);
  while (forwardQueue.length > 0) {
    const current = forwardQueue.shift();
    const dependencies = deps.get(current) || [];
    for (const dep of dependencies) {
      if (!forwardVisited.has(dep)) {
        forwardVisited.add(dep);
        forwardQueue.push(dep);
        relatedFiles.add(dep);
      }
    }
  }

  // Build reverse map for backward pass
  const reverseDeps = new Map();
  for (const f of files) reverseDeps.set(f, new Set());
  for (const [from, targets] of deps) {
    for (const to of targets) reverseDeps.get(to)?.add(from);
  }

  // Backward pass (who imports focus)
  const backwardQueue = [focus];
  const backwardVisited = new Set([focus]);
  while (backwardQueue.length > 0) {
    const current = backwardQueue.shift();
    const importedBy = reverseDeps.get(current) || [];
    for (const parent of importedBy) {
      if (!backwardVisited.has(parent)) {
        backwardVisited.add(parent);
        backwardQueue.push(parent);
        relatedFiles.add(parent);
      }
    }
  }

  // Create new filtered deps
  const filteredDeps = new Map();
  for (const file of relatedFiles) {
    const originalDeps = deps.get(file) || new Set();
    const newDeps = new Set();
    for (const dep of originalDeps) {
      if (relatedFiles.has(dep)) newDeps.add(dep);
    }
    filteredDeps.set(file, newDeps);
  }

  return { files: relatedFiles, deps: filteredDeps };
}

/**
 * Detect unused files and orphan modules
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

  const result = {
    unused: [],
    entries: [],
    orphans: []
  };

  const entryPoints = new Set();
  const allUnused = new Set(); // Files with 0 incoming

  for (const file of files) {
    const incoming = importedBy.get(file);
    if (incoming && incoming.size === 0) {
      const short = shorten(file);
      const isEntry = entryPatterns.some(p => p.test(short));
      
      if (isEntry) {
        result.entries.push({ file: short, full: file });
        entryPoints.add(file);
      } else {
        result.unused.push({ file: short, full: file });
        allUnused.add(file);
      }
    }
  }

  // Detect orphan modules
  // 1. Find all reachable files from entry points
  const reachableFromEntries = new Set();
  const queue = Array.from(entryPoints);
  
  while (queue.length > 0) {
    const current = queue.shift();
    reachableFromEntries.add(current);
    const dependencies = deps.get(current) || [];
    for (const dep of dependencies) {
      if (!reachableFromEntries.has(dep)) {
        reachableFromEntries.add(dep);
        queue.push(dep);
      }
    }
  }

  // 2. Orphans are files that are NOT unused (they have incoming edges), 
  //    are NOT entry points, and are NOT reachable from any entry point.
  for (const file of files) {
    if (!allUnused.has(file) && !entryPoints.has(file) && !reachableFromEntries.has(file)) {
      result.orphans.push({ file: shorten(file), full: file });
    }
  }

  // Also include unused as legacy support for previous callers
  result.filter = (fn) => result.unused.filter(fn);
  
  return result;
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

module.exports = { buildGraph, filterByFocus, detectUnused, stats };
