#!/usr/bin/env node
const path = require('path');
const { program } = require('commander');
const { analyze } = require('./analyzer');
const { buildGraph, filterByFocus, detectUnused, stats } = require('./graph');
const { generateHTML, generateJSON, generateMermaid } = require('./visualize');

program
  .name('dep-analyze')
  .description('Scan codebase and generate a dependency graph')
  .argument('[dir]', 'Root directory to scan', '.')
  .option('-o, --output <file>', 'Output file', 'dependency-graph.html')
  .option('-e, --ext <exts>', 'Comma-separated extensions to include', '.js,.jsx,.ts,.tsx,.py')
  .option('--ignore <patterns>', 'Comma-separated glob patterns to ignore', '**/node_modules/**,**/.git/**,**/dist/**,**/build/**')
  .option('--focus <file>', 'Focus on a specific file and only show related dependencies')
  .option('-f, --format <type>', 'Output format: html, json, mermaid', 'html')
  .action(async (dir, opts) => {
    const rootDir = path.resolve(dir);
    const extensions = opts.ext.split(',').map(e => e.trim());
    const ignore = opts.ignore.split(',').map(e => e.trim());
    
    // adjust default output if format changed but output wasn't
    let outputPath = opts.output;
    if (outputPath === 'dependency-graph.html') {
      if (opts.format === 'json') outputPath = 'dependency-graph.json';
      if (opts.format === 'mermaid') outputPath = 'dependency-graph.mmd';
    }
    outputPath = path.resolve(outputPath);

    console.log(`\n🔍 Scanning: ${rootDir}`);
    if (opts.focus) console.log(`   Focus    : ${opts.focus}`);
    console.log(`   Extensions: ${extensions.join(', ')}`);

    let { files, deps, errors } = await analyze(rootDir, { extensions, ignore });

    if (errors.length) {
      console.warn(`\n⚠  ${errors.length} file(s) could not be read`);
    }

    if (opts.focus) {
      const filtered = filterByFocus(files, deps, opts.focus);
      files = filtered.files;
      deps = filtered.deps;
      if (files.size === 0) {
        console.error(`\n❌  Focus file not found or has no dependencies: ${opts.focus}`);
        process.exit(1);
      }
    }

    const graphData = buildGraph(files, deps, rootDir);
    const unusedFiles = detectUnused(files, deps, rootDir);
    const statsData = stats(files, deps);

    // Print summary
    console.log(`\n📊 Results:`);
    console.log(`   Files found    : ${statsData.totalFiles}`);
    console.log(`   Dependencies   : ${statsData.totalEdges}`);
    console.log(`   Entry points   : ${unusedFiles.entries.length}`);
    console.log(`   Orphan modules : ${unusedFiles.orphans.length}`);
    console.log(`   Unused files   : ${unusedFiles.unused.length}`);

    if (unusedFiles.unused.length > 0) {
      console.log(`\n🗑  Unused files (never imported):`);
      unusedFiles.unused.forEach(u => console.log(`   - ${u.file}`));
    }
    
    if (unusedFiles.orphans.length > 0) {
      console.log(`\n⚠  Orphan modules (disconnected from entries):`);
      unusedFiles.orphans.forEach(u => console.log(`   - ${u.file}`));
    }

    if (opts.format === 'json') {
      generateJSON(graphData, unusedFiles, statsData, outputPath);
    } else if (opts.format === 'mermaid') {
      generateMermaid(graphData, outputPath);
    } else {
      generateHTML(graphData, unusedFiles, statsData, outputPath);
    }
    
    console.log(`\n✅ Graph saved to: ${outputPath} (${opts.format.toUpperCase()})`);
    if (opts.format === 'html') {
      console.log(`   Open it in a browser to explore.\n`);
    }
  });

program.parse();
