const fs = require('fs');
const path = require('path');

/**
 * Generate a self-contained HTML file with interactive D3 force graph
 */
function generateHTML(graphData, unusedFiles, cycles, statsData, outputPath) {
  const { nodes, links } = graphData;

  const unusedSet = new Set(unusedFiles.unused.map(u => u.file));
  const entrySet = new Set(unusedFiles.entries.map(u => u.file));
  const orphanSet = new Set(unusedFiles.orphans.map(u => u.file));
  const cycleSet = new Set(cycles.map(u => u.file));

  // Cycle takes precedence over normal, orphan. Unused/Entry overrides Cycle.
  const enrichedNodes = nodes.map(n => ({
    ...n,
    type: entrySet.has(n.id) ? 'entry' : unusedSet.has(n.id) ? 'unused' : cycleSet.has(n.id) ? 'cycle' : orphanSet.has(n.id) ? 'orphan' : 'normal',
  }));

  const combinedUnused = [
    ...unusedFiles.entries.map(u => ({ ...u, isEntry: true, isOrphan: false, isCycle: cycleSet.has(u.file) })),
    ...unusedFiles.orphans.map(u => ({ ...u, isEntry: false, isOrphan: true, isCycle: cycleSet.has(u.file) })),
    ...unusedFiles.unused.map(u => ({ ...u, isEntry: false, isOrphan: false, isCycle: cycleSet.has(u.file) })),
    // those in cycles but not in the above sets
    ...cycles.filter(c => !entrySet.has(c.file) && !orphanSet.has(c.file) && !unusedSet.has(c.file)).map(u => ({ ...u, isEntry: false, isOrphan: false, isCycle: true }))
  ];

  const payload = JSON.stringify({ nodes: enrichedNodes, links, stats: statsData, list: combinedUnused, cyclesCount: cycles.length });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dependency Graph</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f1117; color: #e2e8f0; display: flex; height: 100vh; overflow: hidden; }
  #sidebar { width: 280px; min-width: 280px; background: #1a1d27; padding: 16px; overflow-y: auto; border-right: 1px solid #2d3148; }
  #sidebar h2 { font-size: 14px; color: #7c85f3; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .stat { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #2d3148; font-size: 13px; }
  .stat span:last-child { color: #7c85f3; font-weight: bold; }
  #unused-list { margin-top: 8px; }
  .list-item { font-size: 11px; padding: 4px 6px; margin: 3px 0; border-radius: 4px; word-break: break-all; }
  .list-item.unused { background: #3d1a1a; color: #f87171; }
  .list-item.orphan { background: #3d2a1a; color: #fb923c; }
  .list-item.entry { background: #1a2d1a; color: #86efac; }
  .list-item.cycle { background: #2f1d40; color: #d8b4fe; }
  #canvas { flex: 1; position: relative; }
  svg { width: 100%; height: 100%; }
  .link { stroke: #3d4268; stroke-opacity: 0.6; stroke-width: 1px; marker-end: url(#arrow); }
  .node circle { stroke-width: 1.5px; cursor: pointer; }
  .node.normal circle { fill: #4f6ef7; stroke: #7c9bff; }
  .node.entry circle { fill: #22c55e; stroke: #86efac; }
  .node.unused circle { fill: #ef4444; stroke: #fca5a5; }
  .node.orphan circle { fill: #f97316; stroke: #fdba74; }
  .node.cycle circle { fill: #a855f7; stroke: #d8b4fe; }
  .node text { font-size: 9px; fill: #cbd5e1; pointer-events: none; }
  .node:hover circle { stroke-width: 3px; }
  #tooltip { position: absolute; background: #1a1d27; border: 1px solid #4f6ef7; border-radius: 6px; padding: 8px 12px; font-size: 12px; pointer-events: none; display: none; max-width: 300px; word-break: break-all; }
  #legend { position: absolute; bottom: 16px; right: 16px; background: #1a1d27; border: 1px solid #2d3148; border-radius: 8px; padding: 12px; font-size: 12px; }
  .legend-item { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  #search { width: 100%; padding: 6px 8px; background: #0f1117; border: 1px solid #2d3148; border-radius: 4px; color: #e2e8f0; font-size: 12px; margin-bottom: 12px; }
</style>
</head>
<body>
<div id="sidebar">
  <h2>Stats</h2>
  <div class="stat"><span>Total Files</span><span id="s-files"></span></div>
  <div class="stat"><span>Total Edges</span><span id="s-edges"></span></div>
  <div class="stat"><span>Cyclic Files</span><span id="s-cycles"></span></div>
  <div class="stat"><span>Unused Files</span><span id="s-unused"></span></div>
  <div class="stat"><span>Orphan Modules</span><span id="s-orphans"></span></div>
  <br>
  <h2>Special Files</h2>
  <input id="search" type="text" placeholder="Search files...">
  <div id="unused-list"></div>
</div>
<div id="canvas">
  <svg id="svg"></svg>
  <div id="tooltip"></div>
  <div id="legend">
    <div class="legend-item"><div class="dot" style="background:#4f6ef7"></div> Normal</div>
    <div class="legend-item"><div class="dot" style="background:#22c55e"></div> Entry point</div>
    <div class="legend-item"><div class="dot" style="background:#a855f7"></div> Cyclic/Cycle</div>
    <div class="legend-item"><div class="dot" style="background:#f97316"></div> Orphan Module</div>
    <div class="legend-item"><div class="dot" style="background:#ef4444"></div> Unused</div>
  </div>
</div>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
const DATA = ${payload};

window.DATA = DATA;
// Stats
document.getElementById('s-files').textContent = DATA.stats.totalFiles;
document.getElementById('s-edges').textContent = DATA.stats.totalEdges;
document.getElementById('s-cycles').textContent = DATA.cyclesCount;
document.getElementById('s-unused').textContent = DATA.list.filter(u => !u.isEntry && !u.isOrphan && !u.isCycle).length;
document.getElementById('s-orphans').textContent = DATA.list.filter(u => u.isOrphan).length;

// List
const list = document.getElementById('unused-list');
function renderList(filter = '') {
  list.innerHTML = '';
  DATA.list
    .filter(u => u.file.toLowerCase().includes(filter.toLowerCase()))
    .forEach(u => {
      const div = document.createElement('div');
      const cls = u.isEntry ? 'entry' : u.isCycle ? 'cycle' : u.isOrphan ? 'orphan' : 'unused';
      div.className = 'list-item ' + cls;
      div.textContent = (u.isEntry ? '⚡ ' : u.isCycle ? '🔄 ' : u.isOrphan ? '⚠ ' : '🗑 ') + u.file;
      list.appendChild(div);
    });
}
renderList();

// Graph
const svg = d3.select('#svg');
const width = document.getElementById('canvas').clientWidth;
const height = document.getElementById('canvas').clientHeight;

svg.append('defs').append('marker')
  .attr('id', 'arrow').attr('viewBox', '0 -5 10 10')
  .attr('refX', 18).attr('refY', 0)
  .attr('markerWidth', 6).attr('markerHeight', 6)
  .attr('orient', 'auto')
  .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#3d4268');

const g = svg.append('g');
svg.call(d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform)));

const sim = d3.forceSimulation(DATA.nodes)
  .force('link', d3.forceLink(DATA.links).id(d => d.id).distance(80))
  .force('charge', d3.forceManyBody().strength(-200))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide(20));

const link = g.append('g').selectAll('line')
  .data(DATA.links).join('line').attr('class', 'link');

const node = g.append('g').selectAll('g')
  .data(DATA.nodes).join('g')
  .attr('class', d => 'node ' + d.type)
  .call(d3.drag()
    .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

node.append('circle').attr('r', 8);
node.append('text').attr('dx', 10).attr('dy', 4).text(d => d.id.split('/').pop());

const tooltip = document.getElementById('tooltip');
node.on('mouseover', (e, d) => {
  tooltip.style.display = 'block';
  tooltip.style.left = (e.offsetX + 12) + 'px';
  tooltip.style.top = (e.offsetY - 10) + 'px';
  tooltip.textContent = d.id;
}).on('mouseout', () => tooltip.style.display = 'none');

sim.on('tick', () => {
  link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  node.attr('transform', d => \`translate(\${d.x},\${d.y})\`);
});

// Search Highlighting
document.getElementById('search').addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  renderList(term);
  
  if (!term) {
    node.style('opacity', 1);
    link.style('opacity', 1);
    return;
  }
  
  node.style('opacity', d => d.id.toLowerCase().includes(term) ? 1 : 0.15);
  link.style('opacity', d => 
    (d.source.id.toLowerCase().includes(term) || d.target.id.toLowerCase().includes(term)) ? 0.4 : 0.05
  );
});
</script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf-8');
  return outputPath;
}

/**
 * Generate JSON output
 */
function generateJSON(graphData, unusedFiles, cycles, statsData, outputPath) {
  const payload = {
    stats: statsData,
    nodes: graphData.nodes,
    links: graphData.links,
    entries: unusedFiles.entries,
    unused: unusedFiles.unused,
    orphans: unusedFiles.orphans,
    cycles: cycles
  };
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');
  return outputPath;
}

/**
 * Generate Mermaid JS code
 */
function generateMermaid(graphData, outputPath) {
  let mermaid = "graph TD;\n";
  const { nodes, links } = graphData;
  
  const safeId = (id) => id.replace(/[^a-zA-Z0-9]/g, '_');
  
  for (const node of nodes) {
    mermaid += `    ${safeId(node.id)}["${node.id}"]\n`;
  }
  
  for (const link of links) {
    mermaid += `    ${safeId(link.source)} --> ${safeId(link.target)}\n`;
  }
  
  fs.writeFileSync(outputPath, mermaid, 'utf-8');
  return outputPath;
}

module.exports = { generateHTML, generateJSON, generateMermaid };
