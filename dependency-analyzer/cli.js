#!/usr/bin/env node
const path = require('path');
const { program } = require('commander');
const { analyze } = require('./analyzer');
const { buildGraph, detectUnused, stats } = require('./graph');
const { generateHTML } = require('./visualize');

program
  .name('dep-analyze')
  .description('Scan codebase and generate a dependency graph')
  .argument('[dir]', 'Root directory to scan', '.')
  .option('-o, --output <file>', 'Output HTML file', 'dependency-graph.html')
  .option('-e, --ext <exts>', 'Comma-separated extensions to include', '.js,.jsx,.ts,.tsx,.py')
  .option('--ignore <patterns>', 'Comma-separated glob patterns to ignore', '**/node_modules/**,**/.git/**,**/dist/**,**/build/**')
  .action(async (dir, opts) => {
    const rootDir = path.resolve(dir);
    const extensions = opts.ext.split(',').map(e => e.trim());
    const ignore = opts.ignore.split(',').map(e => e.trim());
    const outputPath = path.resolve(opts.output);

    console.log(`\n🔍 Scanning: ${rootDir}`);
    console.log(`   Extensions: ${extensions.join(', ')}`);

    const { files, deps, errors } = await analyze(rootDir, { extensions, ignore });

    if (errors.length) {
      console.warn(`\n⚠  ${errors.length} file(s) could not be read`);
    }

    const graphData = buildGraph(files, deps, rootDir);
    const unusedFiles = detectUnused(files, deps, rootDir);
    const statsData = stats(files, deps);

    // Print summary
    console.log(`\n📊 Results:`);
    console.log(`   Files found  : ${statsData.totalFiles}`);
    console.log(`   Dependencies : ${statsData.totalEdges}`);
    console.log(`   Unused files : ${unusedFiles.filter(u => !u.isEntry).length}`);
    console.log(`   Entry points : ${unusedFiles.filter(u => u.isEntry).length}`);

    if (unusedFiles.filter(u => !u.isEntry).length > 0) {
      console.log(`\n🗑  Unused files (never imported):`);
      unusedFiles.filter(u => !u.isEntry).forEach(u => console.log(`   - ${u.file}`));
    }

    generateHTML(graphData, unusedFiles, statsData, outputPath);
    console.log(`\n✅ Graph saved to: ${outputPath}`);
    console.log(`   Open it in a browser to explore.\n`);
  });

program.parse();
