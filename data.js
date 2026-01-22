// Shared benchmark data (will be loaded from CSV)
let benchmarks = []; 
let benchmarkGroups = {}; // Map 'Tau2Bench' -> ['Tau2Bench_airline', 'Tau2Bench_retail']
let models = [];
let dataLoadPromise = null;

function normalizeScore(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === '') return 0;
    const num = Number(trimmed.endsWith("%") ? trimmed.slice(0, -1) : trimmed);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

function formatPercent(value) {
  const num = normalizeScore(value);
  const decimals = Number.isInteger(num) ? 0 : 2;
  return `${num.toFixed(decimals)}%`;
}

function parseCSV(csvText) {
  // Remove BOM and trim
  const text = csvText.replace(/^\uFEFF/, '').trim();
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return []; // Empty or just header
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Identify benchmark columns (exclude metadata)
  const metaCols = ['name', 'cost_usd', 'cost_rmb', 'provider'];
  const scoreCols = headers.filter(h => !metaCols.includes(h));
  
  // Reset and populate global benchmarks and groups
  benchmarks = [];
  benchmarkGroups = {};
  
  scoreCols.forEach(col => {
    if (col.includes('_')) {
      const groupName = col.split('_')[0];
      if (!benchmarkGroups[groupName]) {
        benchmarkGroups[groupName] = [];
      }
      benchmarkGroups[groupName].push(col);
      if (!benchmarks.includes(groupName)) {
        benchmarks.push(groupName);
      }
    } else {
      if (!benchmarks.includes(col)) {
        benchmarks.push(col);
      }
    }
  });

  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Handle CSV parsing (assuming no commas in values for simplicity)
    const values = line.split(',').map(v => v.trim());
    
    // Map values to headers
    const rowData = {};
    headers.forEach((h, idx) => {
      rowData[h] = values[idx];
    });

    const entry = {
      name: rowData['name'] || '',
      provider: rowData['provider'] || '',
      cost_usd: normalizeScore(rowData['cost_usd']),
      cost_rmb: normalizeScore(rowData['cost_rmb']),
      scores: {}
    };
    
    // Store raw scores
    scoreCols.forEach(col => {
       entry.scores[col] = normalizeScore(rowData[col]);
    });
    
    // Calculate grouped scores (averages) for the entry
    Object.keys(benchmarkGroups).forEach(group => {
      const subsets = benchmarkGroups[group];
      const sum = subsets.reduce((acc, sub) => acc + entry.scores[sub], 0);
      entry.scores[group] = subsets.length ? (sum / subsets.length) : 0;
    });

    result.push(entry);
  }
  return result;
}

async function loadData() {
  if (dataLoadPromise) return dataLoadPromise;
  
  // Load both evaluation data and metadata
  const pEval = fetch('./data_eval.csv')
    .then(response => {
        if (!response.ok) throw new Error('Failed to load data_eval.csv');
        return response.text();
    })
    .catch(err => {
        console.warn("CSV Fetch failed:", err);
        return "";
    });

  const pOthers = fetch('./data_others.csv')
    .then(response => {
        if (!response.ok) throw new Error('Failed to load data_others.csv');
        return response.text();
    })
    .catch(err => {
        console.warn("Metadata Fetch failed:", err);
        return "";
    });

  dataLoadPromise = Promise.all([pEval, pOthers])
    .then(([evalText, othersText]) => {
        const evalModels = parseCSV(evalText);
        const metaModels = parseMetadataCSV(othersText);
        
        // Merge metadata into evaluation models
        models = evalModels.map(m => {
            const meta = metaModels.find(mx => mx.name === m.name);
            if (meta) {
                m.cost_usd = meta.cost_usd;
                m.cost_rmb = meta.cost_rmb;
                // If provider is missing or we want to use the one from others
                if (meta.provider) m.provider = meta.provider;
                
                // Extra metadata fields
                m.open_source = meta.open_source;
                m.tokens_per_sec = meta.tokens_per_sec;
                m.context_window = meta.context_window;
                m.nation = meta.nation;
            }
            return m;
        });
        return models;
    });
    
  return dataLoadPromise;
}

function parseMetadataCSV(csvText) {
  if (!csvText || !csvText.trim()) return [];
  const text = csvText.replace(/^\uFEFF/, '').trim();
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, i) => row[h] = values[i]);
    
    return {
      name: (row.name || '').trim(),
      cost_usd: normalizeScore(row.cost_usd),
      cost_rmb: normalizeScore(row.cost_rmb),
      provider: (row.provider || '').trim(),
      open_source: (row.open_source || '').trim().toLowerCase(),
      tokens_per_sec: normalizeScore(row.tokens_per_sec),
      context_window: normalizeScore(row.context_window),
      nation: (row.nation || '').trim()
    };
  }).filter(item => item !== null && item.name);
}

// Compute per-benchmark sorted dataset
function computeBenchmarkDataset(key) {
  // If key is a group, we use the pre-calculated group average (done in parseCSV) for sorting
  // But we also want to retain the subset data for display
  return models
    .map(m => ({
      name: m.name,
      provider: m.provider,
      score: m.scores[key] || 0, // This is the average if it's a group
      subsets: benchmarkGroups[key] ? benchmarkGroups[key].map(sub => ({
        name: sub,
        score: m.scores[sub] || 0
      })) : null
    }))
    .sort((a, b) => b.score - a.score);
}

// Compute agentic aggregate (mean across all main benchmarks)
function computeAgenticDataset() {
  return models
    .map(m => {
      const total = benchmarks.reduce((sum, b) => sum + normalizeScore(m.scores[b]), 0);
      const avg = benchmarks.length ? (total / benchmarks.length) : 0;
      return {
        name: m.name,
        provider: m.provider,
        score: avg,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// Render a list of bars into a container
function renderBarRows(containerId, rows, scoreField = "score") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  rows.forEach((item, idx) => {
    const width = item[scoreField].toFixed(1);
    const row = document.createElement("div");
    row.className = "bar-row";
    
    let subsetsHtml = '';
    if (item.subsets && item.subsets.length > 0) {
      subsetsHtml = `<div class="subsets-container" style="margin-top: 8px; padding-left: 12px; font-size: 0.85em; color: #666; border-left: 2px solid #e2e8f0;">`;
      item.subsets.forEach((sub, subIdx) => {
         // Display subset name (remove prefix if possible, e.g. Tau2Bench_airline -> airline)
         // Assuming format Group_Subset
         const displayName = sub.name.includes('_') ? sub.name.split('_')[1] : sub.name;
         
         // Define some colors for subsets to distinguish them
         // Using a simple rotation of colors
         const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
         const barColor = colors[subIdx % colors.length];
         const subWidth = sub.score.toFixed(1);

         subsetsHtml += `
           <div style="margin-bottom: 6px;">
             <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
               <span>${displayName}</span>
               <span>${formatPercent(sub.score)}</span>
             </div>
             <div class="bar-track" style="height: 6px; background: #f1f5f9;">
               <div class="bar-fill" style="width:${subWidth}%; background: ${barColor}; height: 100%;"></div>
             </div>
           </div>
         `;
      });
      subsetsHtml += `</div>`;
    }

    row.innerHTML = `
      <div class="bar-head">
        <div class="model-info">
          <span class="rank">${idx + 1}</span>
          <span class="badge">${item.name}</span>
          <span class="provider">${item.provider}</span>
        </div>
        <span class="score">${formatPercent(item[scoreField])}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${width}%;"></div>
      </div>
      ${subsetsHtml}
    `;
    container.appendChild(row);
  });
}

async function renderBenchmarkBars(containerId, key) {
  await loadData();
  const dataset = computeBenchmarkDataset(key);
  renderBarRows(containerId, dataset, "score");
}

async function renderAgenticBars(containerId) {
  await loadData();
  const dataset = computeAgenticDataset();
  renderBarRows(containerId, dataset, "score");
}

async function ensureDataLoaded() {
  return loadData();
}

// Color palette for models
const modelColors = {};
const colorPalette = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', 
  '#db2777', '#0891b2', '#4f46e5', '#ca8a04', '#059669',
  '#be123c', '#7c3aed', '#0d9488', '#b45309', '#6d28d9',
  '#0f172a', '#475569', '#334155'
];

function getModelColor(modelName) {
  if (!modelColors[modelName]) {
    const keys = Object.keys(modelColors);
    modelColors[modelName] = colorPalette[keys.length % colorPalette.length];
  }
  return modelColors[modelName];
}

async function updatePriceChart(metricKey) {
  renderPriceChart("price-chart", metricKey);
}

// Price vs Performance Chart
async function renderPriceChart(containerId, metricKey = 'agentic') {
  await loadData();
  const container = document.getElementById(containerId);
  if (!container) return;

  // Populate dropdown if it only has the default option
  const select = document.getElementById('price-chart-metric');
  if (select && select.options.length === 1) {
    benchmarks.forEach(b => {
      const option = document.createElement('option');
      option.value = b;
      option.textContent = b;
      select.appendChild(option);
    });
  }

  // Get dataset based on selection
  let dataset;
  if (metricKey === 'agentic') {
    dataset = computeAgenticDataset();
  } else {
    dataset = computeBenchmarkDataset(metricKey);
  }
  
  // Calculate Prices and prepare chart data
  const chartData = dataset.map(item => {
    const model = models.find(m => m.name === item.name);
    // Handle case where cost might be missing
    const cost_usd = parseFloat(model.cost_usd) || 0;
    const cost_rmb = parseFloat(model.cost_rmb) || 0;
    const price = cost_usd * 7.01 + cost_rmb;
    return {
      name: item.name,
      score: item.score,
      price: price,
      provider: model.provider || 'Unknown'
    };
  });

  // Find ranges
  const maxPrice = Math.max(...chartData.map(d => d.price)) || 10;
  // Determine X axis max (round up to nice number)
  const xDomainMax = Math.ceil(maxPrice * 1.1); 
  
  // Determine Y axis range
  const dataMinScore = Math.min(...chartData.map(d => d.score));
  const dataMaxScore = Math.max(...chartData.map(d => d.score));
  const yDomainMin = Math.floor(dataMinScore * 0.9);
  const yDomainMax = 100; // Always up to 100% or slightly above max if needed, but scores are usually 0-100

  // SVG Dimensions
  const w = container.clientWidth || 800;
  const h = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const innerW = w - padding.left - padding.right;
  const innerH = h - padding.top - padding.bottom;
  
  // Scales
  const xScale = (val) => padding.left + (val / xDomainMax) * innerW;
  const yScale = (val) => padding.top + innerH - ((val - yDomainMin) / (yDomainMax - yDomainMin)) * innerH;

  // Generate Ticks
  const xTicksCount = 10;
  const xTicks = Array.from({length: xTicksCount + 1}, (_, i) => (xDomainMax / xTicksCount) * i);
  
  const yTicksCount = 5;
  const yStep = (yDomainMax - yDomainMin) / yTicksCount;
  const yTicks = Array.from({length: yTicksCount + 1}, (_, i) => yDomainMin + yStep * i);

  // Check if SVG exists
  let svg = container.querySelector('svg');
  let xGrid, yGrid, pointsGroup;

  if (!svg) {
    // Initial Render
    container.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
        <text x="${w/2}" y="25" text-anchor="middle" font-weight="bold" fill="#333" font-size="16">Model Performance vs Price</text>
        
        <!-- Y Axis Label -->
        <text x="20" y="${h/2}" transform="rotate(-90, 20, ${h/2})" text-anchor="middle" fill="#666" font-size="16">评测结果</text>
        
        <!-- X Axis Label -->
        <text x="${w/2}" y="${h-15}" text-anchor="middle" fill="#666" font-size="16">价格 (RMB/百万token)</text>
        
        <!-- Axes lines -->
        <line x1="${padding.left}" y1="${h-padding.bottom}" x2="${w-padding.right}" y2="${h-padding.bottom}" stroke="#333" stroke-width="1"/>
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${h-padding.bottom}" stroke="#333" stroke-width="1"/>
        
        <g id="x-axis-grid"></g>
        <g id="y-axis-grid"></g>
        <g id="data-points"></g>
      </svg>
    `;
    svg = container.querySelector('svg');
  }

  // Select Groups
  xGrid = svg.querySelector('#x-axis-grid');
  yGrid = svg.querySelector('#y-axis-grid');
  pointsGroup = svg.querySelector('#data-points');

  // Update X Grid
  xGrid.innerHTML = xTicks.map(tick => {
      const x = xScale(tick);
      return `
        <line x1="${x}" y1="${h-padding.bottom}" x2="${x}" y2="${h-padding.bottom + 5}" stroke="#333" />
        <text x="${x}" y="${h-padding.bottom + 20}" text-anchor="middle" font-size="16" fill="#666">${tick.toFixed(1)}</text>
        <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${h-padding.bottom}" stroke="#eee" stroke-dasharray="4" />
      `;
  }).join('');

  // Update Y Grid
  yGrid.innerHTML = yTicks.map(tick => {
      const y = yScale(tick);
      return `
        <line x1="${padding.left - 5}" y1="${y}" x2="${padding.left}" y2="${y}" stroke="#333" />
        <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="16" fill="#666">${tick.toFixed(0)}</text>
        <line x1="${padding.left}" y1="${y}" x2="${w-padding.right}" y2="${y}" stroke="#eee" stroke-dasharray="4" />
      `;
  }).join('');

  // Update Points
  const existingCircles = Array.from(pointsGroup.querySelectorAll('circle'));
  const tooltip = getTooltipElement();

  chartData.forEach(d => {
    const cx = xScale(d.price);
    const cy = yScale(d.score);
    const color = getModelColor(d.name);

    let circle = existingCircles.find(c => c.getAttribute('data-name') === d.name);

    if (circle) {
      // Update existing
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('data-score', d.score.toFixed(2));
      circle.setAttribute('data-price', d.price.toFixed(2));
      circle.setAttribute('fill', color);
    } else {
      // Create new
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "chart-point");
      g.style.cursor = "pointer";
      
      const newCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      newCircle.setAttribute("cx", cx);
      newCircle.setAttribute("cy", cy);
      newCircle.setAttribute("r", "6");
      newCircle.setAttribute("fill", color);
      newCircle.setAttribute("fill-opacity", "0.9");
      newCircle.setAttribute("stroke", "white");
      newCircle.setAttribute("stroke-width", "2");
      newCircle.setAttribute("data-name", d.name);
      newCircle.setAttribute("data-score", d.score.toFixed(2));
      newCircle.setAttribute("data-price", d.price.toFixed(2));
      
      g.appendChild(newCircle);
      pointsGroup.appendChild(g);
      
      attachTooltipEvents(newCircle, tooltip);
    }
  });

  // Remove old points
  existingCircles.forEach(circle => {
     const name = circle.getAttribute('data-name');
     if (!chartData.find(d => d.name === name)) {
       circle.parentNode.remove();
     }
  });

  // Render Legend
  const legendContainer = document.getElementById('price-chart-legend');
  if (legendContainer) {
    // Sort chartData by provider then name for legend display
    const sortedForLegend = [...chartData].sort((a, b) => {
      const pA = (a.provider || '').toLowerCase();
      const pB = (b.provider || '').toLowerCase();
      if (pA < pB) return -1;
      if (pA > pB) return 1;
      return a.name.localeCompare(b.name);
    });

    legendContainer.innerHTML = sortedForLegend.map(d => {
      const color = getModelColor(d.name);
      return `
        <div class="legend-item" data-model="${d.name}" style="display: flex; align-items: center; gap: 4px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color};"></div>
          <span style="font-size: 0.9em;">${d.name}</span>
          <span style="font-size: 0.75em; color: #94a3b8;">(${d.provider})</span>
        </div>
      `;
    }).join('');

    // Attach hover events for legend items
    const legendItems = legendContainer.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
        const modelName = item.getAttribute('data-model');
        // Highlight logic
        item.style.background = '#f1f5f9';
        const circle = pointsGroup.querySelector(`circle[data-name="${modelName}"]`);
        if (circle) {
          circle.setAttribute('r', '12'); // Magnify
          circle.style.strokeWidth = '3';
        }
      });

      item.addEventListener('mouseleave', () => {
        const modelName = item.getAttribute('data-model');
        // Reset logic
        item.style.background = 'transparent';
        const circle = pointsGroup.querySelector(`circle[data-name="${modelName}"]`);
        if (circle) {
          circle.setAttribute('r', '6'); // Reset radius
          circle.style.strokeWidth = '2';
        }
      });
    });
  }
}

function attachTooltipEvents(element, tooltip) {
    element.addEventListener('mouseenter', (e) => {
      const name = e.target.getAttribute('data-name');
      const score = e.target.getAttribute('data-score');
      const price = e.target.getAttribute('data-price');
      
      tooltip.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
        <div>Score: <span style="color: #60a5fa;">${score}</span></div>
        <div>Price: <span style="color: #fbbf24;">${price}</span></div>
      `;
      tooltip.style.display = 'block';
      updateTooltipPosition(e, tooltip);
    });
    
    element.addEventListener('mousemove', (e) => {
      updateTooltipPosition(e, tooltip);
    });
    
    element.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
}

// Tooltip Helper Functions
function getTooltipElement() {
  let tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'chart-tooltip';
    Object.assign(tooltip.style, {
      position: 'absolute',
      background: 'rgba(15, 23, 42, 0.9)', // Slate-900 with opacity
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '16px',
      pointerEvents: 'none',
      zIndex: '1000',
      display: 'none',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      lineHeight: '1.5'
    });
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function updateTooltipPosition(event, tooltip) {
  const x = event.pageX + 15;
  const y = event.pageY + 15;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

// Global Resize Listener for Chart
window.addEventListener('resize', () => {
  if (window.resizeTimeout) clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(() => {
    // Only attempt to update if the chart container exists
    const container = document.getElementById("price-chart");
    if (container) {
       const select = document.getElementById('price-chart-metric');
       const metric = select ? select.value : 'agentic';
       renderPriceChart("price-chart", metric);
    }
  }, 200);
});
