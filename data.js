// Shared benchmark data (mock values)
const benchmarks = ["MRCR", "Tau2Bench", "VitaBench", "MultiChallenge", "IFBench"];

function normalizeScore(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
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

// Compute per-benchmark sorted dataset
function computeBenchmarkDataset(key) {
  return models
    .map(m => ({
      name: m.name,
      provider: m.provider,
      score: normalizeScore(m.scores[key]),
    }))
    .sort((a, b) => b.score - a.score);
}

// Compute agentic aggregate (mean across all benchmarks)
function computeAgenticDataset() {
  return models
    .map(m => ({
      name: m.name,
      provider: m.provider,
      score:
        benchmarks.reduce((sum, b) => sum + normalizeScore(m.scores[b]), 0) /
        benchmarks.length,
    }))
    .sort((a, b) => b.score - a.score);
}

// Render a list of bars into a container
function renderBarRows(containerId, rows, scoreField = "score") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  const maxScore = Math.max(...rows.map(r => r[scoreField]));

  rows.forEach((item, idx) => {
    const width = maxScore > 0 ? ((item[scoreField] / maxScore) * 100).toFixed(1) : 0;
    const row = document.createElement("div");
    row.className = "bar-row";
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
    `;
    container.appendChild(row);
  });
}

function renderBenchmarkBars(containerId, key) {
  const dataset = computeBenchmarkDataset(key);
  renderBarRows(containerId, dataset, "score");
}

function renderAgenticBars(containerId) {
  const dataset = computeAgenticDataset();
  renderBarRows(containerId, dataset, "score");
}

const models = [
  { name: "GPT-5.2", provider: "OpenAI", scores: { MRCR: 99.74, Tau2Bench: 52, VitaBench: 28, MultiChallenge: 58.48, IFBench: 70.87 } },
  { name: "Claude-Sonnet-4.5", provider: "Anthropic", scores: { MRCR: 82.38, Tau2Bench: 54, VitaBench: 22, MultiChallenge: 54.77, IFBench: 51.98 } },
  { name: "Gemini-3-flash-preview", provider: "Google", scores: { MRCR: 98.78, Tau2Bench: 64, VitaBench: 35, MultiChallenge: 63.41, IFBench: 69.21 } },
  { name: "Gemini-3-pro-preview", provider: "Google", scores: { MRCR: 98.40, Tau2Bench: 58, VitaBench: 25, MultiChallenge: 68.15, IFBench: 59.26 } },
  { name: "GLM-4.6", provider: "智谱", scores: { MRCR: 74.20, Tau2Bench: 52, VitaBench: 19, MultiChallenge: 46.09, IFBench: 48.80 } },
  { name: "GLM-4.7", provider: "智谱", scores: { MRCR: 72.33, Tau2Bench: 60, VitaBench: 19, MultiChallenge: 59.63, IFBench: 63.81 } },
  { name: "Minimax-m2", provider: "Minimax", scores: { MRCR: 51.58, Tau2Bench: 58, VitaBench: 2, MultiChallenge: 57.38, IFBench: 70.92 } },
  { name: "Minimax-m2.1", provider: "Minimax", scores: { MRCR: 60.07, Tau2Bench: 58, VitaBench: 5, MultiChallenge: 49.64, IFBench: 51.84 } },
  { name: "Kimi-k2", provider: "Kimi", scores: { MRCR: 66.43, Tau2Bench: 54, VitaBench: 10, MultiChallenge: 58.87, IFBench: 63.49 } },
  { name: "Deepseek-v3.2", provider: "Deepseek", scores: { MRCR: 79.03, Tau2Bench: 54, VitaBench: 24, MultiChallenge: 47.37, IFBench: 59.55 } },
];
